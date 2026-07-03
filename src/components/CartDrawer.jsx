import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useCart } from '../context/CartContext'
import { loadOrderSettings, placeOrder, preopenWhatsAppWindow, sendToWhatsApp } from '../lib/checkout'
import './CartDrawer.css'

export default function CartDrawer({ isOpen, onClose }) {
  const { items, removeItem, updateQty, totalPrice, clearCart } = useCart()
  const navigate = useNavigate()

  const [stage, setStage] = useState('cart') // 'cart' | 'details'
  const [form, setForm] = useState({ name: '', phone: '', address: '', notes: '' })
  const [submitting, setSubmitting] = useState(false)
  const [settings, setSettings] = useState({ deliveryCharge: 0, whatsappNumber: '', waTemplate: '' })
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [fallbackUrl, setFallbackUrl] = useState(null)

  // Load store settings once when the drawer first opens
  useEffect(() => {
    if (isOpen) loadOrderSettings().then(s => { setSettings(s); setSettingsLoaded(true) })
  }, [isOpen])

  // Reset to the cart view whenever it reopens
  useEffect(() => {
    if (isOpen) { setStage('cart'); setFallbackUrl(null) }
  }, [isOpen])

  const deliveryCharge = settings.deliveryCharge || 0
  const grandTotal = totalPrice + deliveryCharge

  const handleConfirmOrder = async (e) => {
    e.preventDefault()
    if (fallbackUrl) return // order already placed; only the fallback link proceeds
    if (!form.name.trim() || !form.phone.trim() || !form.address.trim()) {
      toast.error('Please fill name, phone and address')
      return
    }
    // Must happen synchronously inside the tap, before any await, or mobile
    // browsers will popup-block the WhatsApp handoff
    const preopened = preopenWhatsAppWindow()
    setSubmitting(true)
    try {
      // Make sure settings (esp. delivery charge) have resolved before charging
      let s = settings
      if (!settingsLoaded) {
        s = await loadOrderSettings()
        setSettings(s); setSettingsLoaded(true)
      }
      const { whatsappUrl } = await placeOrder({
        items,
        customer: form,
        deliveryCharge: s.deliveryCharge || 0,
        whatsappNumber: s.whatsappNumber,
        waTemplate: s.waTemplate,
      })
      if (sendToWhatsApp(whatsappUrl, preopened)) {
        toast.success('Order placed! Finish sending it on WhatsApp.')
        setForm({ name: '', phone: '', address: '', notes: '' })
        clearCart()
        onClose()
      } else {
        // Blocked even so — show a tap-to-open button. The order is already
        // saved, so lock the submit button to prevent a duplicate order.
        setFallbackUrl(whatsappUrl)
        toast.error('Tap the green button to send your order on WhatsApp')
      }
    } catch {
      if (preopened && !preopened.closed) preopened.close()
      toast.error('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div
        className={`cart-overlay ${isOpen ? 'cart-overlay--open' : ''}`}
        onClick={onClose}
      />

      <aside className={`cart-drawer ${isOpen ? 'cart-drawer--open' : ''}`}>
        {/* Header */}
        <div className="cart-drawer__header">
          <div className="cart-drawer__title">
            {stage === 'details' && (
              <button className="cart-drawer__back" onClick={() => setStage('cart')} aria-label="Back to cart">←</button>
            )}
            <span className="cart-drawer__title-icon">🛒</span>
            <h2>{stage === 'cart' ? 'Your Cart' : 'Delivery Details'}</h2>
          </div>
          <button className="cart-drawer__close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Step indicator */}
        {items.length > 0 && (
          <div className="cart-steps">
            <span className={`cart-steps__dot ${stage === 'cart' ? 'is-active' : 'is-done'}`}>1</span>
            <span className="cart-steps__line" />
            <span className={`cart-steps__dot ${stage === 'details' ? 'is-active' : ''}`}>2</span>
            <span className="cart-steps__line" />
            <span className="cart-steps__dot">3</span>
            <span className="cart-steps__labels">
              <span>Cart</span><span>Details</span><span>WhatsApp</span>
            </span>
          </div>
        )}

        {/* Body */}
        <div className="cart-drawer__body">
          {items.length === 0 ? (
            <div className="cart-drawer__empty">
              <span className="cart-drawer__empty-icon">🛍️</span>
              <h3>Your cart is empty</h3>
              <p>Add some delicious products to get started!</p>
              <button className="btn btn-primary btn-sm" onClick={() => { onClose(); navigate('/shop') }}>
                Browse Products
              </button>
            </div>
          ) : stage === 'cart' ? (
            <ul className="cart-drawer__items">
              {items.map(item => (
                <li key={item.id} className="cart-item">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="cart-item__image"
                    onError={e => { e.target.src = 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=100&q=60' }}
                  />
                  <div className="cart-item__info">
                    <h4 className="cart-item__name">{item.name}</h4>
                    <p className="cart-item__price">₹{item.price} {item.unit && `/ ${item.unit}`}</p>
                    <div className="cart-item__qty">
                      <button className="cart-item__qty-btn" onClick={() => updateQty(item.id, item.qty - 1)}>−</button>
                      <span className="cart-item__qty-num">{item.qty}</span>
                      <button className="cart-item__qty-btn" onClick={() => updateQty(item.id, item.qty + 1)}>+</button>
                    </div>
                  </div>
                  <div className="cart-item__right">
                    <p className="cart-item__total">₹{item.price * item.qty}</p>
                    <button className="cart-item__remove" onClick={() => removeItem(item.id)} aria-label="Remove item">🗑️</button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            /* Stage: details form */
            <form id="cart-details-form" className="cart-details" onSubmit={handleConfirmOrder}>
              <div className="cart-details__field">
                <label>Full Name *</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Your name" autoFocus required />
              </div>
              <div className="cart-details__field">
                <label>Phone Number *</label>
                <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="WhatsApp number" required />
              </div>
              <div className="cart-details__field">
                <label>Delivery Address *</label>
                <textarea rows={3} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="House no, street, area, city, pincode" required />
              </div>
              <div className="cart-details__field">
                <label>Notes (optional)</label>
                <textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Any special instructions" />
              </div>
              {fallbackUrl && (
                <a href={fallbackUrl} target="_blank" rel="noreferrer" className="cart-details__fallback" onClick={() => { setForm({ name: '', phone: '', address: '', notes: '' }); clearCart(); onClose() }}>
                  ✅ Tap to open WhatsApp & send your order
                </a>
              )}
            </form>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="cart-drawer__footer">
            <div className="cart-drawer__summary">
              <div className="cart-drawer__row">
                <span>Subtotal</span>
                <span>₹{totalPrice}</span>
              </div>
              <div className="cart-drawer__row cart-drawer__row--shipping">
                <span>Delivery</span>
                <span className="cart-drawer__free">{deliveryCharge > 0 ? `₹${deliveryCharge}` : 'Free 🎉'}</span>
              </div>
              <div className="cart-drawer__row cart-drawer__row--total">
                <span>Total</span>
                <span>₹{grandTotal}</span>
              </div>
            </div>

            {stage === 'cart' ? (
              <>
                <button className="cart-drawer__checkout" onClick={() => setStage('details')}>
                  Checkout →
                </button>
                <button className="cart-drawer__clear" onClick={clearCart}>Clear cart</button>
              </>
            ) : (
              <>
                <button type="submit" form="cart-details-form" className="cart-drawer__whatsapp" disabled={submitting || !!fallbackUrl}>
                  <span>📱</span> {submitting ? 'Placing order…' : fallbackUrl ? 'Order placed ✓' : 'Order on WhatsApp'}
                </button>
                <p className="cart-drawer__note">You'll confirm payment & delivery on WhatsApp.</p>
              </>
            )}
          </div>
        )}
      </aside>
    </>
  )
}
