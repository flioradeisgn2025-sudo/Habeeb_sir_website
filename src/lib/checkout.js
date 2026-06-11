import axios from 'axios'

// Shared checkout logic used by both the cart drawer (quick 3-step order) and
// the full cart page. Keeps the WhatsApp message + order-save behaviour in one
// place so the two entry points never drift apart.

export const DEFAULT_WA_NUMBER = '918778836682'

export const DEFAULT_WA_TEMPLATE = `🛒 *NEW ORDER — NALAM VAAZHA*
━━━━━━━━━━━━━━━━━━━

👤 *Customer Details:*
Name: {{name}}
Phone: {{phone}}
Address: {{address}}
{{#notes}}Notes: {{notes}}{{/notes}}

📦 *Order Items:*
━━━━━━━━━━━━━━━━━━━
{{items}}
━━━━━━━━━━━━━━━━━━━

💰 *Subtotal:* ₹{{subtotal}}
{{#deliveryCharge}}🚚 *Delivery Charge:* ₹{{deliveryCharge}}{{/deliveryCharge}}
━━━━━━━━━━━━━━━━━━━
🧾 *Grand Total:* ₹{{grandTotal}}
━━━━━━━━━━━━━━━━━━━

📅 Order Date: {{date}}
🆔 Order ID: {{orderId}}

Thank you for ordering! 🙏`

export function buildWhatsAppMessage(template, data) {
  let msg = template || DEFAULT_WA_TEMPLATE
  // Use replacement FUNCTIONS so `$`-sequences in customer input (e.g. "$&", "$1")
  // are inserted literally rather than interpreted by String.replace.
  // Conditional sections {{#field}}...{{/field}}
  msg = msg.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, field, content) => {
    return data[field]
      ? content.replace(new RegExp(`\\{\\{${field}\\}\\}`, 'g'), () => String(data[field]))
      : ''
  })
  Object.entries(data).forEach(([key, val]) => {
    msg = msg.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), () => String(val))
  })
  return msg
}

// Resolve store settings: localStorage first (instant), then API (authoritative).
export async function loadOrderSettings() {
  let settings = {
    deliveryCharge: 0,
    whatsappNumber: DEFAULT_WA_NUMBER,
    waTemplate: DEFAULT_WA_TEMPLATE,
  }
  try {
    const local = localStorage.getItem('nalamvaazha_settings')
    if (local) {
      const p = JSON.parse(local)
      settings = {
        deliveryCharge: Number(p.deliveryCharge) || 0,
        whatsappNumber: p.whatsappNumber || DEFAULT_WA_NUMBER,
        waTemplate: p.waTemplate || DEFAULT_WA_TEMPLATE,
      }
    }
  } catch {}

  try {
    const res = await axios.get('/api/settings', { timeout: 1200 })
    const s = res.data?.data || {}
    settings = {
      deliveryCharge: Number(s.deliveryCharge) || 0,
      whatsappNumber: s.whatsappNumber || settings.whatsappNumber,
      waTemplate: s.waTemplate || settings.waTemplate,
    }
  } catch {}

  return settings
}

// Place an order: save to backend (best-effort) and build the WhatsApp link.
// Returns { orderId, whatsappUrl }.
export async function placeOrder({ items, customer, deliveryCharge = 0, whatsappNumber, waTemplate }) {
  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0)
  const grandTotal = subtotal + deliveryCharge

  const orderPayload = {
    customer,
    items: items.map(item => ({
      product: item._id || item.id,
      name: item.name,
      price: item.price,
      quantity: item.qty,
      lineTotal: item.price * item.qty,
    })),
    subtotal,
    deliveryCharge,
    grandTotal,
  }

  let orderId = 'ORD-' + Math.floor(10000 + Math.random() * 90000)
  try {
    const res = await axios.post('/api/orders', orderPayload, { timeout: 4000 })
    if (res.data?.data?.orderId) orderId = res.data.data.orderId
  } catch {
    // Backend offline — proceed with a local order id so the customer can
    // still send their order over WhatsApp.
  }

  const itemsText = items
    .map((item, i) => `${i + 1}. *${item.name}* × ${item.qty} — ₹${item.price * item.qty}`)
    .join('\n')

  const message = buildWhatsAppMessage(waTemplate, {
    name: customer.name,
    phone: customer.phone,
    address: customer.address,
    notes: customer.notes || '',
    items: itemsText,
    subtotal: String(subtotal),
    deliveryCharge: deliveryCharge > 0 ? String(deliveryCharge) : '',
    grandTotal: String(grandTotal),
    date: new Date().toLocaleString(),
    orderId,
  })

  const whatsappUrl = `https://wa.me/${whatsappNumber || DEFAULT_WA_NUMBER}?text=${encodeURIComponent(message)}`
  return { orderId, whatsappUrl }
}
