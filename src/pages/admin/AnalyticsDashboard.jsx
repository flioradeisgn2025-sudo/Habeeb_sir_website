import { useMemo, useState } from 'react'
import './AnalyticsDashboard.css'

const RANGES = [
  { key: '7d', label: '7 Days', days: 7 },
  { key: '30d', label: '30 Days', days: 30 },
  { key: '90d', label: '90 Days', days: 90 },
  { key: 'all', label: 'All Time', days: null },
]

const LOW_STOCK_THRESHOLD = 10

function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function inr(n) {
  return '₹' + Math.round(n).toLocaleString('en-IN')
}

// A small dependency-free SVG line+area chart
function LineChart({ data, valueKey, color = 'var(--green-600)', height = 160 }) {
  const width = 620
  const pad = { t: 12, r: 12, b: 22, l: 44 }
  const innerW = width - pad.l - pad.r
  const innerH = height - pad.t - pad.b
  const max = Math.max(1, ...data.map(d => d[valueKey]))
  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0

  const points = data.map((d, i) => {
    const x = pad.l + i * stepX
    const y = pad.t + innerH - (d[valueKey] / max) * innerH
    return [x, y]
  })

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const areaPath = points.length
    ? `${linePath} L${points[points.length - 1][0].toFixed(1)},${pad.t + innerH} L${points[0][0].toFixed(1)},${pad.t + innerH} Z`
    : ''

  const gridLines = [0, 0.25, 0.5, 0.75, 1]

  return (
    <svg className="mini-chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img">
      {gridLines.map((g, i) => {
        const y = pad.t + innerH - g * innerH
        return (
          <g key={i}>
            <line x1={pad.l} y1={y} x2={width - pad.r} y2={y} className="mini-chart__grid" />
            <text x={pad.l - 8} y={y + 3} className="mini-chart__ylabel">{Math.round(max * g)}</text>
          </g>
        )
      })}
      {areaPath && <path d={areaPath} fill={color} opacity="0.12" />}
      {linePath && <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
      {points.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="3" fill={color} />
      ))}
      {/* sparse x labels */}
      {data.map((d, i) => {
        if (data.length > 8 && i % Math.ceil(data.length / 6) !== 0 && i !== data.length - 1) return null
        const x = pad.l + i * stepX
        return <text key={i} x={x} y={height - 6} className="mini-chart__xlabel" textAnchor="middle">{d.label}</text>
      })}
    </svg>
  )
}

export default function AnalyticsDashboard({ orders = [], products = [], onExportMonthly, onExportAll, onGotoOrders }) {
  const [range, setRange] = useState('30d')

  const activeRange = RANGES.find(r => r.key === range) || RANGES[1]

  // Orders within the selected window (Cancelled excluded from revenue)
  const filtered = useMemo(() => {
    if (!activeRange.days) return orders
    const cutoff = startOfDay(Date.now() - (activeRange.days - 1) * 86400000)
    return orders.filter(o => o.createdAt && new Date(o.createdAt) >= cutoff)
  }, [orders, activeRange])

  const revenueOrders = filtered.filter(o => o.status !== 'Cancelled')

  const kpis = useMemo(() => {
    const revenue = revenueOrders.reduce((s, o) => s + (o.grandTotal || 0), 0)
    // Count excludes Cancelled so the header total matches the plotted chart line
    const count = revenueOrders.length
    return {
      revenue,
      count,
      aov: revenueOrders.length ? revenue / revenueOrders.length : 0,
      delivered: filtered.filter(o => o.status === 'Delivered').length,
      pending: filtered.filter(o => o.status === 'Pending').length,
    }
  }, [filtered, revenueOrders])

  // Daily series for charts. For "All Time" the span is derived from the oldest
  // order so the chart's area matches the headline totals (not a hard-coded 30).
  const series = useMemo(() => {
    let days = activeRange.days
    if (!days) {
      const oldest = revenueOrders.reduce((min, o) => {
        const t = o.createdAt ? +startOfDay(o.createdAt) : Infinity
        return Math.min(min, t)
      }, Infinity)
      days = Number.isFinite(oldest)
        ? Math.max(1, Math.round((+startOfDay(Date.now()) - oldest) / 86400000) + 1)
        : 30
      days = Math.min(days, 730) // cap to keep the chart readable
    }
    const buckets = []
    for (let i = days - 1; i >= 0; i--) {
      const day = startOfDay(Date.now() - i * 86400000)
      buckets.push({ day: +day, label: `${day.getDate()}/${day.getMonth() + 1}`, revenue: 0, orders: 0 })
    }
    const index = new Map(buckets.map(b => [b.day, b]))
    revenueOrders.forEach(o => {
      const d = +startOfDay(o.createdAt)
      const b = index.get(d)
      if (b) { b.revenue += o.grandTotal || 0; b.orders += 1 }
    })
    return buckets
  }, [revenueOrders, activeRange])

  // Best sellers across the window (by units sold)
  const bestSellers = useMemo(() => {
    const tally = new Map()
    revenueOrders.forEach(o => {
      (o.items || []).forEach(it => {
        const key = it.name || 'Unknown'
        const cur = tally.get(key) || { name: key, units: 0, revenue: 0 }
        cur.units += it.quantity || 0
        cur.revenue += it.lineTotal || (it.price || 0) * (it.quantity || 0)
        tally.set(key, cur)
      })
    })
    return [...tally.values()].sort((a, b) => b.units - a.units).slice(0, 6)
  }, [revenueOrders])

  // Inventory insights
  const inventory = useMemo(() => {
    const lowStock = products.filter(p => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD)
    const outOfStock = products.filter(p => p.stock === 0)
    const stockValue = products.reduce((s, p) => s + (p.price || 0) * (p.stock || 0), 0)
    return { lowStock, outOfStock, stockValue }
  }, [products])

  const newOrders = orders.filter(o => o.status === 'Pending')
  const hasRevenue = series.some(s => s.revenue > 0)

  return (
    <div className="analytics">
      {/* Alerts */}
      {(newOrders.length > 0 || inventory.lowStock.length > 0 || inventory.outOfStock.length > 0) && (
        <div className="analytics__alerts">
          {newOrders.length > 0 && (
            <button className="alert-chip alert-chip--info" onClick={onGotoOrders}>
              🔔 <strong>{newOrders.length}</strong> new order{newOrders.length > 1 ? 's' : ''} need attention
            </button>
          )}
          {inventory.lowStock.length > 0 && (
            <span className="alert-chip alert-chip--warn">
              ⚠️ <strong>{inventory.lowStock.length}</strong> product{inventory.lowStock.length > 1 ? 's' : ''} low on stock
            </span>
          )}
          {inventory.outOfStock.length > 0 && (
            <span className="alert-chip alert-chip--danger">
              ⛔ <strong>{inventory.outOfStock.length}</strong> out of stock
            </span>
          )}
        </div>
      )}

      {/* Range filter */}
      <div className="analytics__toolbar">
        <div className="range-tabs">
          {RANGES.map(r => (
            <button
              key={r.key}
              className={`range-tab ${range === r.key ? 'range-tab--active' : ''}`}
              onClick={() => setRange(r.key)}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="analytics__exports">
          <button className="btn btn-sm btn-secondary" onClick={onExportMonthly}>Monthly CSV</button>
          <button className="btn btn-sm btn-primary" onClick={onExportAll}>Export Orders</button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="kpi-grid">
        <div className="kpi-card kpi-card--accent">
          <span className="kpi-card__label">Revenue</span>
          <span className="kpi-card__val">{inr(kpis.revenue)}</span>
          <span className="kpi-card__sub">{activeRange.label}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-card__label">Orders</span>
          <span className="kpi-card__val">{kpis.count}</span>
          <span className="kpi-card__sub">{kpis.delivered} delivered</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-card__label">Avg. Order Value</span>
          <span className="kpi-card__val">{inr(kpis.aov)}</span>
          <span className="kpi-card__sub">per order</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-card__label">Pending</span>
          <span className="kpi-card__val">{kpis.pending}</span>
          <span className="kpi-card__sub">awaiting action</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-card__label">Stock Value</span>
          <span className="kpi-card__val">{inr(inventory.stockValue)}</span>
          <span className="kpi-card__sub">{products.length} products</span>
        </div>
      </div>

      {/* Charts */}
      <div className="analytics__charts">
        <div className="chart-card">
          <div className="chart-card__head">
            <h4>Revenue Trend</h4>
            <span className="chart-card__total">{inr(kpis.revenue)}</span>
          </div>
          {hasRevenue ? (
            <LineChart data={series} valueKey="revenue" color="var(--green-600)" />
          ) : (
            <p className="chart-empty">No sales in this period yet.</p>
          )}
        </div>
        <div className="chart-card">
          <div className="chart-card__head">
            <h4>Orders Trend</h4>
            <span className="chart-card__total">{kpis.count} orders</span>
          </div>
          {kpis.count ? (
            <LineChart data={series} valueKey="orders" color="var(--lime-700)" />
          ) : (
            <p className="chart-empty">No orders in this period yet.</p>
          )}
        </div>
      </div>

      {/* Best sellers + Inventory */}
      <div className="analytics__lists">
        <div className="insight-card">
          <h4>🏆 Best Sellers</h4>
          {bestSellers.length ? (
            <ul className="rank-list">
              {bestSellers.map((b, i) => (
                <li key={b.name} className="rank-row">
                  <span className="rank-row__no">{i + 1}</span>
                  <span className="rank-row__name">{b.name}</span>
                  <span className="rank-row__bar">
                    <span className="rank-row__fill" style={{ width: `${(b.units / bestSellers[0].units) * 100}%` }} />
                  </span>
                  <span className="rank-row__val">{b.units} sold</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="chart-empty">No sales data yet.</p>
          )}
        </div>

        <div className="insight-card">
          <h4>📦 Needs Restock</h4>
          {inventory.lowStock.length || inventory.outOfStock.length ? (
            <ul className="stock-list">
              {inventory.outOfStock.map(p => (
                <li key={p._id || p.id} className="stock-row">
                  <span className="stock-row__name">{p.name}</span>
                  <span className="stock-row__badge stock-row__badge--out">Out of stock</span>
                </li>
              ))}
              {inventory.lowStock.map(p => (
                <li key={p._id || p.id} className="stock-row">
                  <span className="stock-row__name">{p.name}</span>
                  <span className="stock-row__badge stock-row__badge--low">{p.stock} left</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="chart-empty">All products are well stocked. 🎉</p>
          )}
        </div>
      </div>
    </div>
  )
}
