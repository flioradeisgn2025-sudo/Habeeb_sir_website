import { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useProducts } from '../context/ProductContext'
import { useSiteContent } from '../context/SiteContentContext'
import { login as apiLogin, changeCredentials, clearSession, getAdminUser, getToken, setSession, isAuthed } from '../lib/adminAuth'
import ImageUpload from '../components/admin/ImageUpload'
import AnalyticsDashboard from './admin/AnalyticsDashboard'
import HomeBannersTab from './admin/HomeBannersTab'
import Loader from '../components/Loader'
import './AdminPage.css'

export default function AdminPage() {
  const [authed, setAuthed] = useState(isAuthed)
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [loginError, setLoginError] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoggingIn(true)
    setLoginError('')
    try {
      await apiLogin(loginForm.username.trim(), loginForm.password)
      setAuthed(true)
    } catch (err) {
      const msg = err?.response?.data?.message
        || (err?.code === 'ERR_NETWORK' ? 'Cannot reach server. Make sure the backend is running.' : 'Invalid username or password')
      setLoginError(msg)
    } finally {
      setLoggingIn(false)
    }
  }

  const handleLogout = () => {
    clearSession()
    setAuthed(false)
    setLoginForm({ username: '', password: '' })
  }

  if (!authed) {
    return (
      <div className="admin-page">
        <header className="page-hero">
          <div className="container">
            <h1>Admin <span className="text-lime">Portal</span></h1>
            <p style={{ marginTop: 8 }}>Please log in to access the admin panel.</p>
          </div>
        </header>
        <section className="section container">
          <div className="admin-login-card glass-card">
            <div className="admin-login-icon">🔒</div>
            <h3>Admin Login</h3>
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">Username</label>
                <input
                  type="text"
                  className="form-input"
                  value={loginForm.username}
                  onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
                  placeholder="Enter username"
                  autoComplete="username"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={loginForm.password}
                  onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  required
                />
              </div>
              {loginError && <p className="admin-login-error">{loginError}</p>}
              <button type="submit" className="btn btn-primary w-full" style={{ marginTop: 8 }} disabled={loggingIn}>
                {loggingIn ? 'Logging in…' : 'Log In'}
              </button>
            </form>
          </div>
        </section>
      </div>
    )
  }

  return <AdminDashboard onLogout={handleLogout} />
}

function AdminDashboard({ onLogout }) {
  const {
    allProducts: products, categories, isApiOnline,
    addProduct, updateProduct, deleteProduct, togglePublish,
    addCategory, updateCategory, deleteCategory,
    refreshData
  } = useProducts()

  const { content, updateSection, resetSection, resetAll } = useSiteContent()

  const [activeTab, setActiveTab] = useState('dashboard')
  const [orders, setOrders] = useState([])
  const [orderDetail, setOrderDetail] = useState(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [tabLoading, setTabLoading] = useState(false)

  // Show a brief loader whenever the admin switches tabs
  const switchTab = (key) => {
    if (key === activeTab) return
    setActiveTab(key)
    setTabLoading(true)
    setTimeout(() => setTabLoading(false), 350)
  }

  // Credential change
  const [credForm, setCredForm] = useState({ currentPassword: '', username: '', password: '', confirmPassword: '' })

  // Product form
  const [prodForm, setProdForm] = useState({
    name: '', category: '', price: '', stock: '100', description: '', image: '', salePrice: '', ingredients: '', extraImages: ['']
  })

  // Settings form
  const [sData, setSData] = useState({
    businessName: '', whatsappNumber: '', deliveryCharge: 0
  })

  // Edit product
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [editSearch, setEditSearch] = useState('')

  // Category form
  const [catForm, setCatForm] = useState({ name: '', description: '', image: '' })
  const [editingCatId, setEditingCatId] = useState(null)
  const [editCatForm, setEditCatForm] = useState({})

  // Site content editing
  const [contentTab, setContentTab] = useState('hero')

  // Confirmation modal
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', onConfirm: null })
  const askConfirm = (title, message, onConfirm) => setConfirmModal({ open: true, title, message, onConfirm })
  const closeConfirm = () => setConfirmModal({ open: false, title: '', message: '', onConfirm: null })

  const getProductId = (p) => p._id || p.id

  // Image file to base64
  const handleImageFile = (file, setter, field) => {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      setter(prev => ({ ...prev, [field]: e.target.result }))
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e, setter, field) => {
    e.preventDefault()
    e.stopPropagation()
    const file = e.dataTransfer?.files?.[0]
    if (file && file.type.startsWith('image/')) {
      handleImageFile(file, setter, field)
    }
  }

  // Load settings from localStorage first, then try API
  useEffect(() => {
    try {
      const local = localStorage.getItem('nalamvaazha_settings')
      if (local) {
        const parsed = JSON.parse(local)
        setSData(parsed)
      }
    } catch {}

    const fetchAdminData = async () => {
      setDataLoading(true)
      const results = await Promise.allSettled([
        axios.get('/api/admin/orders', { timeout: 15000 }),
        axios.get('/api/settings', { timeout: 15000 })
      ])
      if (results[0].status === 'fulfilled') setOrders(results[0].value.data.data)
      if (results[1].status === 'fulfilled') {
        const apiSettings = results[1].value.data.data
        setSData({
          businessName: apiSettings.businessName || '',
          whatsappNumber: apiSettings.whatsappNumber || '',
          deliveryCharge: apiSettings.deliveryCharge || 0
        })
      }
      setDataLoading(false)
    }
    fetchAdminData()
  }, [])

  useEffect(() => {
    if (categories.length && !prodForm.category) {
      setProdForm(f => ({ ...f, category: categories[0]?._id || categories[0]?.slug || '' }))
    }
  }, [categories])

  // Dashboard Stats
  const stats = {
    totalProducts: products.length,
    totalCategories: categories.length,
    totalOrders: orders.length,
    pendingOrders: orders.filter(o => o.status === 'Pending').length,
    confirmedOrders: orders.filter(o => o.status === 'Confirmed').length,
    deliveredOrders: orders.filter(o => o.status === 'Delivered').length,
    cancelledOrders: orders.filter(o => o.status === 'Cancelled').length,
    outOfStock: products.filter(p => p.stock === 0).length,
    totalRevenue: orders.filter(o => o.status !== 'Cancelled').reduce((sum, o) => sum + (o.grandTotal || 0), 0),
  }

  // Monthly order report
  const getMonthlyReport = () => {
    const months = {}
    orders.forEach(o => {
      const d = new Date(o.createdAt)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!months[key]) months[key] = { month: key, orders: 0, revenue: 0, delivered: 0, cancelled: 0, pending: 0 }
      months[key].orders++
      months[key].revenue += o.grandTotal || 0
      if (o.status === 'Delivered') months[key].delivered++
      if (o.status === 'Cancelled') months[key].cancelled++
      if (o.status === 'Pending') months[key].pending++
    })
    return Object.values(months).sort((a, b) => b.month.localeCompare(a.month))
  }

  const downloadCSV = (data, filename) => {
    if (!data.length) { toast.error('No data to export'); return }
    const headers = Object.keys(data[0])
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(h => `"${String(row[h]).replace(/"/g, '""')}"`).join(','))
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Report downloaded!')
  }

  const downloadMonthlyReport = () => {
    downloadCSV(getMonthlyReport(), 'monthly-order-report.csv')
  }

  const downloadAllOrders = () => {
    const rows = orders.map(o => ({
      OrderID: o.orderId,
      Customer: o.customer?.name || '',
      Phone: o.customer?.phone || '',
      Address: o.customer?.address || '',
      Items: (o.items || []).map(i => `${i.name} x${i.quantity}`).join('; '),
      Subtotal: o.subtotal || '',
      DeliveryCharge: o.deliveryCharge || 0,
      GrandTotal: o.grandTotal || '',
      Status: o.status,
      Date: o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '',
    }))
    downloadCSV(rows, 'all-orders.csv')
  }

  // ── Handlers ──────────────────────────────────────

  const handleDeleteProduct = (id) => {
    const product = products.find(p => getProductId(p) === id)
    askConfirm(
      'Delete product?',
      `Are you sure you want to delete "${product?.name || 'this product'}"? This action cannot be undone.`,
      async () => {
        const success = await deleteProduct(id)
        if (success) toast.success('Product deleted')
        else toast.error('Delete failed')
        closeConfirm()
      }
    )
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    const success = await addProduct(prodForm)
    if (success) {
      toast.success('Product created!')
      setProdForm({ name: '', category: categories[0]?._id || categories[0]?.slug || '', price: '', stock: '100', description: '', image: '', salePrice: '', ingredients: '', extraImages: [''] })
    } else toast.error('Upload failed')
  }

  const handleTogglePublish = async (id) => {
    const success = await togglePublish(id)
    if (success) toast.success('Product visibility updated')
  }

  const startEditing = (product) => {
    setEditingId(getProductId(product))
    const imgs = (product.images || []).map(i => i.url || i).filter(Boolean)
    setEditForm({
      name: product.name,
      price: product.price,
      salePrice: product.salePrice || '',
      stock: product.stock ?? 100,
      description: product.description || '',
      ingredients: product.ingredients || '',
      category: product.category?._id || product.category?.slug || '',
      image: imgs[0] || product.image || '',
      extraImages: imgs.slice(1).length ? imgs.slice(1) : [''],
    })
  }

  const cancelEditing = () => { setEditingId(null); setEditForm({}) }

  const handleSaveEdit = async (id) => {
    const success = await updateProduct(id, editForm)
    if (success) { toast.success('Product updated!'); setEditingId(null); setEditForm({}) }
    else toast.error('Update failed')
  }

  const handleUpdateOrderStatus = async (id, status) => {
    try {
      await axios.patch(`/api/admin/orders/${id}`, { status })
      toast.success(`Order marked as ${status}`)
      const res = await axios.get('/api/admin/orders', { timeout: 1000 })
      setOrders(res.data.data)
    } catch { toast.error('Status update failed — backend offline') }
  }

  const saveSettings = (e) => {
    e.preventDefault()
    localStorage.setItem('nalamvaazha_settings', JSON.stringify(sData))
    toast.success('Settings saved!')
    axios.put('/api/admin/settings', sData, { timeout: 1000 }).catch(() => {})
  }

  const handleChangeCredentials = async (e) => {
    e.preventDefault()
    if (!credForm.currentPassword) {
      toast.error('Enter your current password to confirm changes')
      return
    }
    if (!credForm.username && !credForm.password) {
      toast.error('Enter a new username and/or new password')
      return
    }
    if (credForm.password && credForm.password !== credForm.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (credForm.password && credForm.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    try {
      const data = await changeCredentials({
        currentPassword: credForm.currentPassword,
        newUsername: credForm.username || undefined,
        newPassword: credForm.password || undefined,
      })
      // Reflect the server's authoritative (lowercased) username in the UI
      if (data?.username) setSession(getToken(), data.username)
      toast.success('Admin credentials updated! Use the new credentials next time you log in.')
      setCredForm({ currentPassword: '', username: '', password: '', confirmPassword: '' })
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not update credentials')
    }
  }

  // Category handlers
  const handleAddCategory = (e) => {
    e.preventDefault()
    if (!catForm.name) { toast.error('Category name required'); return }
    addCategory(catForm)
    toast.success('Category added!')
    setCatForm({ name: '', description: '', image: '' })
  }

  const startEditingCat = (cat) => {
    setEditingCatId(cat._id || cat.slug)
    setEditCatForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
      image: cat.image?.url || '',
    })
  }

  const handleSaveCatEdit = (id) => {
    updateCategory(id, editCatForm)
    toast.success('Category updated!')
    setEditingCatId(null)
    setEditCatForm({})
  }

  const handleDeleteCategory = (id) => {
    const cat = categories.find(c => (c._id || c.slug) === id)
    const catProducts = products.filter(p => (p.category?._id || p.category?.slug) === id)
    const message = catProducts.length > 0
      ? `This category has ${catProducts.length} product(s). Deleting it will not delete the products, but they may become uncategorised. Continue?`
      : `Are you sure you want to delete the category "${cat?.name || ''}"? This action cannot be undone.`
    askConfirm('Delete category?', message, () => {
      deleteCategory(id)
      toast.success('Category deleted')
      closeConfirm()
    })
  }

  // ── Render Sections ──────────────────────────────────────

  const renderDashboard = () => {
    return (
      <div className="admin-dashboard animate-fade-in">
        <div className="admin-status-bar">
          <span className={`api-status ${isApiOnline ? 'api-status--online' : 'api-status--offline'}`}>
            {isApiOnline ? 'Backend Online' : 'Offline Mode (Local Data)'}
          </span>
        </div>

        {dataLoading ? (
          <Loader label="Loading your dashboard…" />
        ) : (
          <AnalyticsDashboard
            orders={orders}
            products={products}
            onExportMonthly={downloadMonthlyReport}
            onExportAll={downloadAllOrders}
            onGotoOrders={() => switchTab('orders')}
          />
        )}

        <h3 style={{ marginTop: 40 }}>Recent Orders</h3>
        <div className="orders-table-wrapper glass-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Total</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 5).map(order => (
                <tr key={order._id}>
                  <td>{order.orderId}</td>
                  <td>{order.customer.name}</td>
                  <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td>₹{order.grandTotal}</td>
                  <td><span className={`status-badge status-${order.status.toLowerCase()}`}>{order.status}</span></td>
                  <td><button className="btn btn-sm btn-ghost" onClick={() => setActiveTab('orders')}>View</button></td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan="6" className="text-center" style={{ padding: 40, color: 'var(--text-hint)' }}>No orders yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const renderProducts = () => (
    <div className="admin-products animate-fade-in">
      <div className="admin-grid">
        <div className="upload-section glass-card">
          <h3>Add New Product</h3>
          <form onSubmit={handleUpload} className="admin-form">
            <div className="form-group"><label className="form-label">Product Name *</label><input type="text" className="form-input" required value={prodForm.name} onChange={e => setProdForm({...prodForm, name: e.target.value})} /></div>
            <div className="flex-group">
              <div className="form-group"><label className="form-label">Category *</label><select className="form-select" value={prodForm.category} onChange={e => setProdForm({...prodForm, category: e.target.value})}>
                {categories.map(c => <option key={c._id || c.slug} value={c._id || c.slug}>{c.name}</option>)}
              </select></div>
              <div className="form-group"><label className="form-label">Price (₹) *</label><input type="number" className="form-input" required value={prodForm.price} onChange={e => setProdForm({...prodForm, price: e.target.value})} /></div>
            </div>
            <div className="flex-group">
              <div className="form-group"><label className="form-label">Stock *</label><input type="number" className="form-input" required value={prodForm.stock} onChange={e => setProdForm({...prodForm, stock: e.target.value})} /></div>
              <div className="form-group"><label className="form-label">Sale Price (₹)</label><input type="number" className="form-input" value={prodForm.salePrice} onChange={e => setProdForm({...prodForm, salePrice: e.target.value})} /></div>
            </div>
            <div className="form-group">
              <label className="form-label">Product Image *</label>
              <ImageUpload value={prodForm.image} onChange={v => setProdForm({...prodForm, image: v})} id="prod-img-input" />
            </div>
            <div className="form-group"><label className="form-label">Description *</label><textarea className="form-textarea" required value={prodForm.description} onChange={e => setProdForm({...prodForm, description: e.target.value})}></textarea></div>
            <div className="form-group"><label className="form-label">Ingredients (comma-separated)</label><textarea className="form-textarea" rows={2} value={prodForm.ingredients} onChange={e => setProdForm({...prodForm, ingredients: e.target.value})} placeholder="Rice flour, Urad dal, Salt, Black pepper..." /></div>
            <div className="form-group">
              <label className="form-label">Additional Images (URLs)</label>
              {(prodForm.extraImages || ['']).map((url, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                  <input type="url" className="form-input" value={url} onChange={e => { const imgs = [...(prodForm.extraImages || [''])]; imgs[i] = e.target.value; setProdForm({...prodForm, extraImages: imgs}) }} placeholder="https://..." />
                  {i === (prodForm.extraImages || ['']).length - 1 && <button type="button" className="btn btn-sm btn-ghost btn-dark" onClick={() => setProdForm({...prodForm, extraImages: [...(prodForm.extraImages || ['']), '']})}>+</button>}
                </div>
              ))}
            </div>
            <button type="submit" className="btn btn-primary w-full" disabled={!prodForm.image}>Upload Product</button>
          </form>
        </div>
        <div className="product-list-section">
          <h3 style={{ marginBottom: 24 }}>Product Catalog ({products.length})</h3>
          <div className="admin-items">
            {products.map(p => (
              <div key={getProductId(p)} className="admin-item-card glass-card">
                <img src={p.images?.[0]?.url || p.image || ''} alt={p.name} className="admin-item-img" />
                <div className="admin-item-info">
                  <h4>{p.name} {p.stock === 0 && <span className="text-error" style={{fontSize: 12}}>(Out of Stock)</span>}</h4>
                  <p className="admin-item-meta">{p.category?.name || 'Uncategorized'} • ₹{p.price}</p>
                </div>
                <button className="btn btn-sm" style={{marginRight: 8}} onClick={() => handleTogglePublish(getProductId(p))}>
                  {p.isPublished === false ? 'Publish' : 'Unpublish'}
                </button>
                <button className="delete-btn" title="Delete" onClick={() => handleDeleteProduct(getProductId(p))}>🗑️</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  const renderEditProducts = () => {
    const filtered = products.filter(p =>
      p.name.toLowerCase().includes(editSearch.toLowerCase()) ||
      (p.category?.name || '').toLowerCase().includes(editSearch.toLowerCase())
    )

    return (
      <div className="admin-edit-products animate-fade-in">
        <div className="edit-products-header">
          <h3>All Products ({products.length})</h3>
          <div className="edit-search-box">
            <input type="text" className="form-input" placeholder="Search products..." value={editSearch} onChange={e => setEditSearch(e.target.value)} />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state-small">No products found.</div>
        ) : (
          <div className="edit-products-list">
            {filtered.map(p => (
              <div key={getProductId(p)} className={`edit-product-card glass-card ${editingId === getProductId(p) ? 'edit-product-card--editing' : ''}`}>
                {editingId === getProductId(p) ? (
                  <div className="edit-product-form">
                    <div className="edit-product-form__top">
                      <img src={editForm.image || ''} alt={editForm.name} className="edit-product-img" />
                      <div className="edit-product-form__fields">
                        <div className="form-group"><label className="form-label">Product Name</label><input type="text" className="form-input" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} /></div>
                        <div className="edit-product-form__row">
                          <div className="form-group"><label className="form-label">Category</label><select className="form-select" value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})}>{categories.map(c => <option key={c._id || c.slug} value={c._id || c.slug}>{c.name}</option>)}</select></div>
                          <div className="form-group"><label className="form-label">Price (₹)</label><input type="number" className="form-input" value={editForm.price} onChange={e => setEditForm({...editForm, price: e.target.value})} /></div>
                          <div className="form-group"><label className="form-label">Sale Price (₹)</label><input type="number" className="form-input" value={editForm.salePrice} onChange={e => setEditForm({...editForm, salePrice: e.target.value})} placeholder="Optional" /></div>
                          <div className="form-group"><label className="form-label">Stock</label><input type="number" className="form-input" value={editForm.stock} onChange={e => setEditForm({...editForm, stock: e.target.value})} /></div>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Product Image</label>
                          <ImageUpload value={editForm.image} onChange={v => setEditForm({...editForm, image: v})} id="edit-img-input" small />
                        </div>
                        <div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" rows={2} value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} /></div>
                        <div className="form-group"><label className="form-label">Ingredients (comma-separated)</label><textarea className="form-textarea" rows={2} value={editForm.ingredients || ''} onChange={e => setEditForm({...editForm, ingredients: e.target.value})} placeholder="Rice flour, Salt, Pepper..." /></div>
                        <div className="form-group">
                          <label className="form-label">Additional Images (URLs)</label>
                          {(editForm.extraImages || ['']).map((url, i) => (
                            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                              <input type="url" className="form-input" value={url} onChange={e => { const imgs = [...(editForm.extraImages || [''])]; imgs[i] = e.target.value; setEditForm({...editForm, extraImages: imgs}) }} placeholder="https://..." />
                              {i === (editForm.extraImages || ['']).length - 1 && <button type="button" className="btn btn-sm btn-ghost btn-dark" onClick={() => setEditForm({...editForm, extraImages: [...(editForm.extraImages || ['']), '']})}>+</button>}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="edit-product-form__actions">
                      <button className="btn btn-primary" onClick={() => handleSaveEdit(getProductId(p))}>Save Changes</button>
                      <button className="btn btn-ghost btn-dark" onClick={cancelEditing}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="edit-product-view">
                    <img src={p.images?.[0]?.url || p.image || ''} alt={p.name} className="edit-product-img" />
                    <div className="edit-product-info">
                      <h4 className="edit-product-name">{p.name}</h4>
                      <p className="edit-product-meta">
                        <span className="edit-product-category">{p.category?.name || 'Uncategorized'}</span>
                        {p.stock === 0 && <span className="badge badge-outofstock">Out of Stock</span>}
                        {p.stock > 0 && p.stock <= 10 && <span className="badge badge-limited">Low Stock: {p.stock}</span>}
                      </p>
                    </div>
                    <div className="edit-product-price-col">
                      <span className="edit-product-price">₹{p.price}</span>
                      {p.salePrice > 0 && <span className="edit-product-sale">₹{p.salePrice}</span>}
                    </div>
                    <div className="edit-product-stock-col">
                      <span className="edit-product-stock-label">Stock</span>
                      <span className="edit-product-stock-val">{p.stock}</span>
                    </div>
                    <div className="edit-product-actions">
                      <button className="btn btn-sm btn-secondary" onClick={() => startEditing(p)}>Edit</button>
                      <button className="delete-btn" title="Delete" onClick={() => handleDeleteProduct(getProductId(p))}>🗑️</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Categories Tab ──────────────────────────────────
  const renderCategories = () => (
    <div className="admin-categories animate-fade-in">
      <div className="admin-grid">
        <div className="upload-section glass-card">
          <h3>Add New Category</h3>
          <form onSubmit={handleAddCategory} className="admin-form">
            <div className="form-group">
              <label className="form-label">Category Name *</label>
              <input type="text" className="form-input" required value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})} placeholder="e.g. Sweets" />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" rows={3} value={catForm.description} onChange={e => setCatForm({...catForm, description: e.target.value})} placeholder="A brief description of this category" />
            </div>
            <div className="form-group">
              <label className="form-label">Category Image *</label>
              <ImageUpload value={catForm.image} onChange={v => setCatForm({...catForm, image: v})} id="cat-img-input" />
              <div style={{ marginTop: 8 }}>
                <label className="form-label" style={{ fontSize: 12, color: 'var(--text-hint)' }}>Or paste image URL:</label>
                <input type="url" className="form-input" value={catForm.image && !catForm.image.startsWith('data:') ? catForm.image : ''} onChange={e => setCatForm({...catForm, image: e.target.value})} placeholder="https://..." style={{ marginTop: 4 }} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary w-full" disabled={!catForm.name}>Add Category</button>
          </form>
        </div>

        <div className="product-list-section">
          <h3 style={{ marginBottom: 24 }}>All Categories ({categories.length})</h3>
          <div className="admin-items">
            {categories.map(cat => {
              const catId = cat._id || cat.slug
              const isEditing = editingCatId === catId
              return (
                <div key={catId} className={`admin-item-card glass-card ${isEditing ? 'edit-product-card--editing' : ''}`} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                  {isEditing ? (
                    <div style={{ padding: 16 }}>
                      <div className="form-group">
                        <label className="form-label">Name</label>
                        <input type="text" className="form-input" value={editCatForm.name} onChange={e => setEditCatForm({...editCatForm, name: e.target.value})} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Slug</label>
                        <input type="text" className="form-input" value={editCatForm.slug} onChange={e => setEditCatForm({...editCatForm, slug: e.target.value})} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Description</label>
                        <textarea className="form-textarea" rows={2} value={editCatForm.description} onChange={e => setEditCatForm({...editCatForm, description: e.target.value})} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Image</label>
                        <ImageUpload value={editCatForm.image} onChange={v => setEditCatForm({...editCatForm, image: v})} id={`cat-edit-img-${catId}`} small />
                        <input type="url" className="form-input" value={editCatForm.image && !editCatForm.image.startsWith('data:') ? editCatForm.image : ''} onChange={e => setEditCatForm({...editCatForm, image: e.target.value})} placeholder="Or paste image URL" style={{ marginTop: 8 }} />
                      </div>
                      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                        <button className="btn btn-primary btn-sm" onClick={() => handleSaveCatEdit(catId)}>Save</button>
                        <button className="btn btn-ghost btn-dark btn-sm" onClick={() => { setEditingCatId(null); setEditCatForm({}) }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px' }}>
                      <img src={cat.image?.url || ''} alt={cat.name} className="admin-item-img" style={{ borderRadius: '50%' }} />
                      <div className="admin-item-info">
                        <h4>{cat.name}</h4>
                        <p className="admin-item-meta">{cat.slug} • {products.filter(p => (p.category?._id || p.category?.slug) === catId).length} products</p>
                        {cat.description && <p style={{ fontSize: 12, color: 'var(--text-hint)', marginTop: 4 }}>{cat.description}</p>}
                      </div>
                      <button className="btn btn-sm btn-secondary" onClick={() => startEditingCat(cat)}>Edit</button>
                      <button className="delete-btn" title="Delete" onClick={() => handleDeleteCategory(catId)}>🗑️</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )

  // ── Orders Tab ──────────────────────────────────
  const renderOrders = () => (
    <div className="admin-orders animate-fade-in">
      <div className="admin-section-header">
        <h3>Manage Orders ({orders.length})</h3>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-sm btn-secondary" onClick={downloadMonthlyReport}>Monthly Report</button>
          <button className="btn btn-sm btn-primary" onClick={downloadAllOrders}>Export All Orders</button>
        </div>
      </div>
      {orders.length === 0 ? (
        <div className="empty-state-small" style={{ marginTop: 20 }}>
          {isApiOnline ? 'No orders yet.' : 'Orders require backend server to be running.'}
        </div>
      ) : (
        <div className="orders-table-wrapper glass-card" style={{ marginTop: 20 }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Phone</th>
                <th>Total</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order._id}>
                  <td>{order.orderId}</td>
                  <td>{order.customer.name}</td>
                  <td>{order.customer.phone}</td>
                  <td>₹{order.grandTotal}</td>
                  <td>
                    <select className="form-select" value={order.status} onChange={(e) => handleUpdateOrderStatus(order._id, e.target.value)} style={{ padding: 6, fontSize: 14, width: 'auto' }}>
                      <option value="Pending">Pending</option>
                      <option value="Confirmed">Confirmed</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => setOrderDetail(order)}>Details</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )

  // ── Site Content Tab ──────────────────────────────────
  const renderSiteContent = () => {
    const sections = [
      { key: 'hero', label: 'Hero Section' },
      { key: 'features', label: 'Features' },
      { key: 'about', label: 'About Page' },
      { key: 'faq', label: 'FAQ Page' },
      { key: 'contact', label: 'Contact Page' },
      { key: 'footer', label: 'Footer' },
      { key: 'shop', label: 'Shop Page' },
      { key: 'cart', label: 'Cart Page' },
    ]

    return (
      <div className="admin-site-content animate-fade-in">
        <div className="admin-section-header">
          <h3>Site Content Manager</h3>
          <button className="btn btn-sm btn-ghost btn-dark" onClick={() => { if (window.confirm('Reset ALL site content to defaults?')) resetAll() }}>
            Reset All to Defaults
          </button>
        </div>

        <div className="content-tabs">
          {sections.map(s => (
            <button key={s.key} className={`content-tab-btn ${contentTab === s.key ? 'content-tab-btn--active' : ''}`} onClick={() => setContentTab(s.key)}>
              {s.label}
            </button>
          ))}
        </div>

        <div className="content-editor glass-card">
          {contentTab === 'hero' && renderHeroEditor()}
          {contentTab === 'features' && renderFeaturesEditor()}
          {contentTab === 'about' && renderAboutEditor()}
          {contentTab === 'faq' && renderFAQEditor()}
          {contentTab === 'contact' && renderContactEditor()}
          {contentTab === 'footer' && renderFooterEditor()}
          {contentTab === 'shop' && renderShopEditor()}
          {contentTab === 'cart' && renderCartEditor()}
        </div>
      </div>
    )
  }

  const renderHeroEditor = () => {
    const hero = content.hero
    const update = (field, val) => updateSection('hero', { ...hero, [field]: val })
    return (
      <div className="content-form">
        <div className="content-form__header">
          <h4>Hero Section</h4>
          <button className="btn btn-sm btn-ghost btn-dark" onClick={() => resetSection('hero')}>Reset</button>
        </div>
        <div className="form-group"><label className="form-label">Badge Text</label><input className="form-input" value={hero.badge} onChange={e => update('badge', e.target.value)} /></div>
        <div className="form-group"><label className="form-label">Title Line 1</label><input className="form-input" value={hero.titleLine1} onChange={e => update('titleLine1', e.target.value)} /></div>
        <div className="form-group"><label className="form-label">Title Line 2</label><input className="form-input" value={hero.titleLine2} onChange={e => update('titleLine2', e.target.value)} /></div>
        <div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" rows={3} value={hero.description} onChange={e => update('description', e.target.value)} /></div>
        <div className="flex-group">
          <div className="form-group"><label className="form-label">Primary Button</label><input className="form-input" value={hero.btnPrimary} onChange={e => update('btnPrimary', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Secondary Button</label><input className="form-input" value={hero.btnSecondary} onChange={e => update('btnSecondary', e.target.value)} /></div>
        </div>
        <div className="form-group">
          <label className="form-label">Main Hero Image</label>
          <ImageUpload value={hero.mainImage} onChange={v => update('mainImage', v)} id="hero-main-img" />
          <input type="url" className="form-input" style={{ marginTop: 8 }} value={hero.mainImage && !hero.mainImage.startsWith('data:') ? hero.mainImage : ''} onChange={e => update('mainImage', e.target.value)} placeholder="Or paste image URL" />
        </div>
        <h5 style={{ marginTop: 20, marginBottom: 12 }}>Stats</h5>
        {hero.stats.map((stat, i) => (
          <div key={i} className="flex-group" style={{ marginBottom: 8 }}>
            <div className="form-group" style={{ marginBottom: 0 }}><input className="form-input" value={stat.number} onChange={e => { const s = [...hero.stats]; s[i] = {...s[i], number: e.target.value}; update('stats', s) }} placeholder="Number" /></div>
            <div className="form-group" style={{ marginBottom: 0 }}><input className="form-input" value={stat.label} onChange={e => { const s = [...hero.stats]; s[i] = {...s[i], label: e.target.value}; update('stats', s) }} placeholder="Label" /></div>
          </div>
        ))}
        <h5 style={{ marginTop: 20, marginBottom: 12 }}>Floating Pills</h5>
        {hero.floatingPills.map((pill, i) => (
          <div key={i} className="flex-group" style={{ marginBottom: 8 }}>
            <div className="form-group" style={{ marginBottom: 0 }}><input className="form-input" value={pill.icon} onChange={e => { const p = [...hero.floatingPills]; p[i] = {...p[i], icon: e.target.value}; update('floatingPills', p) }} placeholder="Emoji" style={{ maxWidth: 80 }} /></div>
            <div className="form-group" style={{ marginBottom: 0 }}><input className="form-input" value={pill.name} onChange={e => { const p = [...hero.floatingPills]; p[i] = {...p[i], name: e.target.value}; update('floatingPills', p) }} placeholder="Name" /></div>
            <button type="button" className="delete-btn" onClick={() => { const p = hero.floatingPills.filter((_, j) => j !== i); update('floatingPills', p) }}>✕</button>
          </div>
        ))}
        <button type="button" className="btn btn-sm btn-ghost btn-dark" onClick={() => update('floatingPills', [...hero.floatingPills, { icon: '🍽️', name: 'New' }])}>+ Add Pill</button>
        <p className="content-save-note">Changes save automatically.</p>
      </div>
    )
  }

  const renderFeaturesEditor = () => {
    const features = content.features
    const updateFeatures = (newFeatures) => updateSection('features', newFeatures)
    return (
      <div className="content-form">
        <div className="content-form__header">
          <h4>Feature Cards (Landing Page)</h4>
          <button className="btn btn-sm btn-ghost btn-dark" onClick={() => resetSection('features')}>Reset</button>
        </div>
        {features.map((f, i) => (
          <div key={i} className="content-item-card">
            <div className="flex-group">
              <div className="form-group"><label className="form-label">Icon (emoji)</label><input className="form-input" value={f.icon} onChange={e => { const a = [...features]; a[i] = {...a[i], icon: e.target.value}; updateFeatures(a) }} style={{ maxWidth: 80 }} /></div>
              <div className="form-group"><label className="form-label">Title</label><input className="form-input" value={f.title} onChange={e => { const a = [...features]; a[i] = {...a[i], title: e.target.value}; updateFeatures(a) }} /></div>
            </div>
            <div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" rows={2} value={f.description} onChange={e => { const a = [...features]; a[i] = {...a[i], description: e.target.value}; updateFeatures(a) }} /></div>
            <button type="button" className="delete-btn" style={{ alignSelf: 'flex-end' }} onClick={() => updateFeatures(features.filter((_, j) => j !== i))}>🗑️</button>
          </div>
        ))}
        <button type="button" className="btn btn-sm btn-ghost btn-dark" onClick={() => updateFeatures([...features, { icon: '⭐', title: 'New Feature', description: 'Description here' }])}>+ Add Feature Card</button>
        <p className="content-save-note">Changes save automatically.</p>
      </div>
    )
  }

  const renderAboutEditor = () => {
    const about = content.about
    const update = (field, val) => updateSection('about', { ...about, [field]: val })
    return (
      <div className="content-form">
        <div className="content-form__header">
          <h4>About Us Page</h4>
          <button className="btn btn-sm btn-ghost btn-dark" onClick={() => resetSection('about')}>Reset</button>
        </div>
        <div className="flex-group">
          <div className="form-group"><label className="form-label">Badge</label><input className="form-input" value={about.badge} onChange={e => update('badge', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Hero Title</label><input className="form-input" value={about.heroTitle} onChange={e => update('heroTitle', e.target.value)} /></div>
        </div>
        <div className="form-group"><label className="form-label">Hero Subtitle</label><textarea className="form-textarea" rows={2} value={about.heroSubtitle} onChange={e => update('heroSubtitle', e.target.value)} /></div>
        <div className="flex-group">
          <div className="form-group"><label className="form-label">Section Title</label><input className="form-input" value={about.sectionTitle} onChange={e => update('sectionTitle', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Section Subtitle</label><input className="form-input" value={about.sectionSubtitle} onChange={e => update('sectionSubtitle', e.target.value)} /></div>
        </div>
        <div className="form-group"><label className="form-label">Paragraph 1</label><textarea className="form-textarea" rows={3} value={about.paragraph1} onChange={e => update('paragraph1', e.target.value)} /></div>
        <div className="form-group"><label className="form-label">Paragraph 2</label><textarea className="form-textarea" rows={3} value={about.paragraph2} onChange={e => update('paragraph2', e.target.value)} /></div>
        <div className="form-group">
          <label className="form-label">About Image</label>
          <ImageUpload value={about.image} onChange={v => update('image', v)} id="about-img" />
          <input type="url" className="form-input" style={{ marginTop: 8 }} value={about.image && !about.image.startsWith('data:') ? about.image : ''} onChange={e => update('image', e.target.value)} placeholder="Or paste image URL" />
        </div>
        <h5 style={{ marginTop: 20, marginBottom: 12 }}>Stats</h5>
        {about.stats.map((stat, i) => (
          <div key={i} className="flex-group" style={{ marginBottom: 8 }}>
            <div className="form-group" style={{ marginBottom: 0 }}><input className="form-input" value={stat.number} onChange={e => { const s = [...about.stats]; s[i] = {...s[i], number: e.target.value}; update('stats', s) }} /></div>
            <div className="form-group" style={{ marginBottom: 0 }}><input className="form-input" value={stat.label} onChange={e => { const s = [...about.stats]; s[i] = {...s[i], label: e.target.value}; update('stats', s) }} /></div>
          </div>
        ))}
        <h5 style={{ marginTop: 20, marginBottom: 12 }}>Values Cards</h5>
        {about.values.map((v, i) => (
          <div key={i} className="content-item-card">
            <div className="flex-group">
              <div className="form-group"><label className="form-label">Icon</label><input className="form-input" value={v.icon} onChange={e => { const a = [...about.values]; a[i] = {...a[i], icon: e.target.value}; update('values', a) }} style={{ maxWidth: 80 }} /></div>
              <div className="form-group"><label className="form-label">Title</label><input className="form-input" value={v.title} onChange={e => { const a = [...about.values]; a[i] = {...a[i], title: e.target.value}; update('values', a) }} /></div>
            </div>
            <div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" rows={2} value={v.description} onChange={e => { const a = [...about.values]; a[i] = {...a[i], description: e.target.value}; update('values', a) }} /></div>
            <button type="button" className="delete-btn" style={{ alignSelf: 'flex-end' }} onClick={() => update('values', about.values.filter((_, j) => j !== i))}>🗑️</button>
          </div>
        ))}
        <button type="button" className="btn btn-sm btn-ghost btn-dark" onClick={() => update('values', [...about.values, { icon: '⭐', title: 'New Value', description: '' }])}>+ Add Value</button>
        <div className="form-group" style={{ marginTop: 20 }}><label className="form-label">CTA Title</label><input className="form-input" value={about.ctaTitle} onChange={e => update('ctaTitle', e.target.value)} /></div>
        <div className="form-group"><label className="form-label">CTA Subtitle</label><input className="form-input" value={about.ctaSubtitle} onChange={e => update('ctaSubtitle', e.target.value)} /></div>
        <p className="content-save-note">Changes save automatically.</p>
      </div>
    )
  }

  const renderFAQEditor = () => {
    const faq = content.faq
    const update = (field, val) => updateSection('faq', { ...faq, [field]: val })
    return (
      <div className="content-form">
        <div className="content-form__header">
          <h4>FAQ Page</h4>
          <button className="btn btn-sm btn-ghost btn-dark" onClick={() => resetSection('faq')}>Reset</button>
        </div>
        <div className="flex-group">
          <div className="form-group"><label className="form-label">Badge</label><input className="form-input" value={faq.badge} onChange={e => update('badge', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Hero Title</label><input className="form-input" value={faq.heroTitle} onChange={e => update('heroTitle', e.target.value)} /></div>
        </div>
        <div className="form-group"><label className="form-label">Hero Subtitle</label><textarea className="form-textarea" rows={2} value={faq.heroSubtitle} onChange={e => update('heroSubtitle', e.target.value)} /></div>
        <h5 style={{ marginTop: 20, marginBottom: 12 }}>FAQ Items</h5>
        {faq.items.map((item, i) => (
          <div key={i} className="content-item-card">
            <div className="form-group"><label className="form-label">Question</label><input className="form-input" value={item.q} onChange={e => { const a = [...faq.items]; a[i] = {...a[i], q: e.target.value}; update('items', a) }} /></div>
            <div className="form-group"><label className="form-label">Answer</label><textarea className="form-textarea" rows={3} value={item.a} onChange={e => { const a = [...faq.items]; a[i] = {...a[i], a: e.target.value}; update('items', a) }} /></div>
            <button type="button" className="delete-btn" style={{ alignSelf: 'flex-end' }} onClick={() => update('items', faq.items.filter((_, j) => j !== i))}>🗑️</button>
          </div>
        ))}
        <button type="button" className="btn btn-sm btn-ghost btn-dark" onClick={() => update('items', [...faq.items, { q: 'New Question?', a: 'Answer here.' }])}>+ Add FAQ</button>
        <p className="content-save-note">Changes save automatically.</p>
      </div>
    )
  }

  const renderContactEditor = () => {
    const c = content.contact
    const update = (field, val) => updateSection('contact', { ...c, [field]: val })
    return (
      <div className="content-form">
        <div className="content-form__header">
          <h4>Contact Us Page</h4>
          <button className="btn btn-sm btn-ghost btn-dark" onClick={() => resetSection('contact')}>Reset</button>
        </div>
        <div className="flex-group">
          <div className="form-group"><label className="form-label">Badge</label><input className="form-input" value={c.badge} onChange={e => update('badge', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Hero Title</label><input className="form-input" value={c.heroTitle} onChange={e => update('heroTitle', e.target.value)} /></div>
        </div>
        <div className="form-group"><label className="form-label">Hero Subtitle</label><textarea className="form-textarea" rows={2} value={c.heroSubtitle} onChange={e => update('heroSubtitle', e.target.value)} /></div>
        <div className="flex-group">
          <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={c.phone} onChange={e => update('phone', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Email</label><input className="form-input" value={c.email} onChange={e => update('email', e.target.value)} /></div>
        </div>
        <div className="form-group"><label className="form-label">Address</label><textarea className="form-textarea" rows={3} value={c.address} onChange={e => update('address', e.target.value)} /></div>
        <div className="form-group"><label className="form-label">Working Hours</label><input className="form-input" value={c.hours} onChange={e => update('hours', e.target.value)} /></div>
        <p className="content-save-note">Changes save automatically.</p>
      </div>
    )
  }

  const renderFooterEditor = () => {
    const f = content.footer
    const update = (field, val) => updateSection('footer', { ...f, [field]: val })
    return (
      <div className="content-form">
        <div className="content-form__header">
          <h4>Footer</h4>
          <button className="btn btn-sm btn-ghost btn-dark" onClick={() => resetSection('footer')}>Reset</button>
        </div>
        <div className="form-group"><label className="form-label">Tagline</label><textarea className="form-textarea" rows={2} value={f.tagline} onChange={e => update('tagline', e.target.value)} /></div>
        <div className="flex-group">
          <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={f.phone} onChange={e => update('phone', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Email</label><input className="form-input" value={f.email} onChange={e => update('email', e.target.value)} /></div>
        </div>
        <div className="flex-group">
          <div className="form-group"><label className="form-label">Location</label><input className="form-input" value={f.location} onChange={e => update('location', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Hours</label><input className="form-input" value={f.hours} onChange={e => update('hours', e.target.value)} /></div>
        </div>
        <h5 style={{ marginTop: 20, marginBottom: 12 }}>Social Links</h5>
        <div className="form-group"><label className="form-label">Instagram URL</label><input className="form-input" value={f.instagramUrl} onChange={e => update('instagramUrl', e.target.value)} /></div>
        <div className="form-group"><label className="form-label">Facebook URL</label><input className="form-input" value={f.facebookUrl} onChange={e => update('facebookUrl', e.target.value)} /></div>
        <div className="form-group"><label className="form-label">WhatsApp URL</label><input className="form-input" value={f.whatsappUrl} onChange={e => update('whatsappUrl', e.target.value)} /></div>
        <div className="form-group"><label className="form-label">Copyright Extra Text</label><input className="form-input" value={f.copyrightExtra} onChange={e => update('copyrightExtra', e.target.value)} /></div>
        <p className="content-save-note">Changes save automatically.</p>
      </div>
    )
  }

  const renderShopEditor = () => {
    const s = content.shop
    const update = (field, val) => updateSection('shop', { ...s, [field]: val })
    return (
      <div className="content-form">
        <div className="content-form__header">
          <h4>Shop Page</h4>
          <button className="btn btn-sm btn-ghost btn-dark" onClick={() => resetSection('shop')}>Reset</button>
        </div>
        <div className="form-group"><label className="form-label">Badge</label><input className="form-input" value={s.badge} onChange={e => update('badge', e.target.value)} /></div>
        <div className="form-group"><label className="form-label">Hero Title</label><input className="form-input" value={s.heroTitle} onChange={e => update('heroTitle', e.target.value)} /></div>
        <div className="form-group"><label className="form-label">Hero Subtitle</label><input className="form-input" value={s.heroSubtitle} onChange={e => update('heroSubtitle', e.target.value)} /></div>
        <p className="content-save-note">Changes save automatically.</p>
      </div>
    )
  }

  const renderCartEditor = () => {
    const c = content.cart
    const update = (field, val) => updateSection('cart', { ...c, [field]: val })
    return (
      <div className="content-form">
        <div className="content-form__header">
          <h4>Cart Page</h4>
          <button className="btn btn-sm btn-ghost btn-dark" onClick={() => resetSection('cart')}>Reset</button>
        </div>
        <div className="form-group"><label className="form-label">Hero Title</label><input className="form-input" value={c.heroTitle} onChange={e => update('heroTitle', e.target.value)} /></div>
        <div className="form-group"><label className="form-label">Hero Subtitle</label><input className="form-input" value={c.heroSubtitle} onChange={e => update('heroSubtitle', e.target.value)} /></div>
        <p className="content-save-note">Changes save automatically.</p>
      </div>
    )
  }

  // ── Settings Tab ──────────────────────────────────
  const renderSettings = () => (
    <div className="admin-settings animate-fade-in">
      <div className="upload-section glass-card" style={{ maxWidth: 700, margin: '0 auto' }}>
        <h3>Store Settings</h3>
        <form className="admin-form" onSubmit={saveSettings}>
          <div className="form-group"><label className="form-label">Business Name</label><input type="text" className="form-input" value={sData.businessName} onChange={e => setSData({...sData, businessName: e.target.value})} /></div>
          <div className="form-group"><label className="form-label">WhatsApp Number (With Country Code)</label><input type="text" className="form-input" value={sData.whatsappNumber} onChange={e => setSData({...sData, whatsappNumber: e.target.value})} placeholder="919876543210" /></div>
          <div className="form-group"><label className="form-label">Delivery Charge (₹)</label><input type="number" className="form-input" value={sData.deliveryCharge} onChange={e => setSData({...sData, deliveryCharge: e.target.value})} /></div>

          <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 24, marginTop: 16 }}>
            <h4 style={{ marginBottom: 8 }}>WhatsApp Message Template</h4>
            <p style={{ fontSize: 13, color: 'var(--text-hint)', marginBottom: 12, lineHeight: 1.6 }}>
              Customize the order message sent via WhatsApp. Use these placeholders:<br />
              <code style={{ background: 'var(--green-50)', padding: '2px 6px', borderRadius: 4 }}>{'{{name}}'}</code>{' '}
              <code style={{ background: 'var(--green-50)', padding: '2px 6px', borderRadius: 4 }}>{'{{phone}}'}</code>{' '}
              <code style={{ background: 'var(--green-50)', padding: '2px 6px', borderRadius: 4 }}>{'{{address}}'}</code>{' '}
              <code style={{ background: 'var(--green-50)', padding: '2px 6px', borderRadius: 4 }}>{'{{notes}}'}</code>{' '}
              <code style={{ background: 'var(--green-50)', padding: '2px 6px', borderRadius: 4 }}>{'{{items}}'}</code>{' '}
              <code style={{ background: 'var(--green-50)', padding: '2px 6px', borderRadius: 4 }}>{'{{subtotal}}'}</code>{' '}
              <code style={{ background: 'var(--green-50)', padding: '2px 6px', borderRadius: 4 }}>{'{{deliveryCharge}}'}</code>{' '}
              <code style={{ background: 'var(--green-50)', padding: '2px 6px', borderRadius: 4 }}>{'{{grandTotal}}'}</code>{' '}
              <code style={{ background: 'var(--green-50)', padding: '2px 6px', borderRadius: 4 }}>{'{{date}}'}</code>{' '}
              <code style={{ background: 'var(--green-50)', padding: '2px 6px', borderRadius: 4 }}>{'{{orderId}}'}</code><br />
              Use <code style={{ background: 'var(--green-50)', padding: '2px 6px', borderRadius: 4 }}>{'{{#field}}...{{/field}}'}</code> for conditional sections (shown only when field has value).
            </p>
            <div className="form-group">
              <textarea
                className="form-textarea"
                rows={14}
                style={{ fontFamily: 'monospace', fontSize: 13, lineHeight: 1.5 }}
                value={sData.waTemplate || `🛒 *NEW ORDER — NALAM VAAZHA*\n━━━━━━━━━━━━━━━━━━━\n\n👤 *Customer Details:*\nName: {{name}}\nPhone: {{phone}}\nAddress: {{address}}\n{{#notes}}Notes: {{notes}}{{/notes}}\n\n📦 *Order Items:*\n━━━━━━━━━━━━━━━━━━━\n{{items}}\n━━━━━━━━━━━━━━━━━━━\n\n💰 *Subtotal:* ₹{{subtotal}}\n{{#deliveryCharge}}🚚 *Delivery Charge:* ₹{{deliveryCharge}}{{/deliveryCharge}}\n━━━━━━━━━━━━━━━━━━━\n🧾 *Grand Total:* ₹{{grandTotal}}\n━━━━━━━━━━━━━━━━━━━\n\n📅 Order Date: {{date}}\n🆔 Order ID: {{orderId}}\n\nThank you for ordering! 🙏`}
                onChange={e => setSData({...sData, waTemplate: e.target.value})}
              />
            </div>
            <button type="button" className="btn btn-sm btn-ghost btn-dark" style={{ marginBottom: 16 }} onClick={() => setSData({...sData, waTemplate: ''})}>
              Reset to Default Template
            </button>
          </div>

          <button type="submit" className="btn btn-primary w-full">Save All Settings</button>
        </form>
      </div>

      {/* Change Admin Credentials */}
      <div className="upload-section glass-card" style={{ maxWidth: 700, margin: '40px auto 0' }}>
        <h3>Change Admin Credentials</h3>
        <p style={{ fontSize: 13, color: 'var(--text-hint)', marginBottom: 20 }}>
          Update your admin login. Logged in as: <strong>{getAdminUser() || 'admin'}</strong>. Leave a field blank to keep it unchanged.
        </p>
        <form className="admin-form" onSubmit={handleChangeCredentials}>
          <div className="form-group">
            <label className="form-label">Current Password *</label>
            <input type="password" className="form-input" value={credForm.currentPassword} onChange={e => setCredForm({...credForm, currentPassword: e.target.value})} placeholder="Confirm it's you" required autoComplete="current-password" />
          </div>
          <div className="form-group">
            <label className="form-label">New Username</label>
            <input type="text" className="form-input" value={credForm.username} onChange={e => setCredForm({...credForm, username: e.target.value})} placeholder="Leave blank to keep current" autoComplete="off" />
          </div>
          <div className="flex-group">
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input type="password" className="form-input" value={credForm.password} onChange={e => setCredForm({...credForm, password: e.target.value})} placeholder="Min 6 characters" autoComplete="new-password" />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input type="password" className="form-input" value={credForm.confirmPassword} onChange={e => setCredForm({...credForm, confirmPassword: e.target.value})} placeholder="Re-enter password" autoComplete="new-password" />
            </div>
          </div>
          <button type="submit" className="btn btn-primary w-full">Update Credentials</button>
        </form>
      </div>
    </div>
  )

  const TABS = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'products', label: 'Products' },
    { key: 'edit products', label: 'Edit Products' },
    { key: 'categories', label: 'Categories' },
    { key: 'orders', label: 'Orders' },
    { key: 'home banners', label: 'Home & Banners' },
    { key: 'site content', label: 'Site Content' },
    { key: 'settings', label: 'Settings' },
  ]

  return (
    <div className="admin-page" style={{ paddingBottom: 100 }}>
      <header className="page-hero">
        <div className="container">
          <div className="admin-header-row">
            <div>
              <span className="badge badge-featured" style={{ marginBottom: 16 }}>Management</span>
              <h1>Admin <span className="text-lime">Portal</span></h1>
            </div>
            <button className="btn btn-sm admin-logout-btn" onClick={onLogout}>
              Logout
            </button>
          </div>

          <div className="admin-tabs">
            {TABS.map(tab => (
              <button key={tab.key} className={`tab-btn ${activeTab === tab.key ? 'tab-btn--active' : ''}`} onClick={() => switchTab(tab.key)}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <section className="section container" style={{ paddingTop: 40 }}>
        {tabLoading ? (
          <Loader label="Loading…" />
        ) : (
          <>
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'products' && renderProducts()}
            {activeTab === 'edit products' && renderEditProducts()}
            {activeTab === 'categories' && renderCategories()}
            {activeTab === 'orders' && renderOrders()}
            {activeTab === 'home banners' && <HomeBannersTab content={content} updateSection={updateSection} />}
            {activeTab === 'site content' && renderSiteContent()}
            {activeTab === 'settings' && renderSettings()}
          </>
        )}
      </section>

      {confirmModal.open && (
        <div className="confirm-modal-overlay" onClick={closeConfirm}>
          <div className="confirm-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="confirm-modal-icon">⚠️</div>
            <h3 className="confirm-modal-title">{confirmModal.title}</h3>
            <p className="confirm-modal-message">{confirmModal.message}</p>
            <div className="confirm-modal-actions">
              <button className="btn btn-ghost" onClick={closeConfirm}>Cancel</button>
              <button className="btn btn-danger" onClick={() => confirmModal.onConfirm && confirmModal.onConfirm()}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {orderDetail && (
        <div className="confirm-modal-overlay" onClick={() => setOrderDetail(null)}>
          <div className="order-detail-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="order-detail-modal__head">
              <div>
                <h3>{orderDetail.orderId}</h3>
                <span className={`status-badge status-${(orderDetail.status || '').toLowerCase()}`}>{orderDetail.status}</span>
              </div>
              <button className="cart-drawer__close" onClick={() => setOrderDetail(null)} aria-label="Close">✕</button>
            </div>

            <div className="order-detail-modal__section">
              <h4>Customer</h4>
              <p><strong>{orderDetail.customer?.name}</strong></p>
              <p>📞 {orderDetail.customer?.phone}</p>
              <p>📍 {orderDetail.customer?.address}</p>
              {orderDetail.customer?.notes && <p>📝 {orderDetail.customer.notes}</p>}
            </div>

            <div className="order-detail-modal__section">
              <h4>Items</h4>
              <table className="order-detail-modal__items">
                <tbody>
                  {(orderDetail.items || []).map((it, i) => (
                    <tr key={i}>
                      <td>{it.name}</td>
                      <td>× {it.quantity}</td>
                      <td className="order-detail-modal__amt">₹{it.lineTotal ?? (it.price * it.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="order-detail-modal__totals">
              <div><span>Subtotal</span><span>₹{orderDetail.subtotal}</span></div>
              {orderDetail.deliveryCharge > 0 && <div><span>Delivery</span><span>₹{orderDetail.deliveryCharge}</span></div>}
              <div className="order-detail-modal__grand"><span>Grand Total</span><span>₹{orderDetail.grandTotal}</span></div>
            </div>

            <div className="order-detail-modal__foot">
              <span>{orderDetail.createdAt ? new Date(orderDetail.createdAt).toLocaleString() : ''}</span>
              <a className="btn btn-sm btn-whatsapp" href={`https://wa.me/${(orderDetail.customer?.phone || '').replace(/\D/g, '')}`} target="_blank" rel="noreferrer">Message Customer</a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
