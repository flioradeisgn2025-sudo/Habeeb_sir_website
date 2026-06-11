import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useSiteContent } from '../context/SiteContentContext'
import { loadOrderSettings, placeOrder } from '../lib/checkout'
import toast from 'react-hot-toast'
import './CartPage.css'

export default function CartPage() {
  const { items, removeItem, updateQty, totalPrice, totalItems, clearCart } = useCart()
  const { content } = useSiteContent()
  const cartContent = content.cart
  const navigate = useNavigate()

  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [whatsappLink, setWhatsappLink] = useState(null)
  const [formData, setFormData] = useState({
    name: '', phone: '', address: '', notes: ''
  })

  const [settings, setSettings] = useState({ deliveryCharge: 0, whatsappNumber: '', waTemplate: '' })
  const deliveryCharge = settings.deliveryCharge || 0

  useEffect(() => {
    loadOrderSettings().then(setSettings)
  }, [])

  const grandTotal = totalPrice + deliveryCharge

  const handleOrderSubmit = async (e) => {
    e.preventDefault()
    if (items.length === 0) return

    if (!formData.name || !formData.phone || !formData.address) {
      toast.error('Please fill all required fields')
      return
    }

    setLoading(true)

    try {
      const { whatsappUrl } = await placeOrder({
        items,
        customer: formData,
        deliveryCharge,
        whatsappNumber: settings.whatsappNumber,
        waTemplate: settings.waTemplate,
      })

      const opened = window.open(whatsappUrl, '_blank')
      clearCart()

      if (!opened) {
        setWhatsappLink(whatsappUrl)
        toast.error('Popup blocked! Please tap the WhatsApp button below to send your order.')
      } else {
        toast.success('Order placed! Check WhatsApp to send your order message.')
        navigate('/')
      }
    } catch (error) {
      console.error(error)
      toast.error('Failed to submit order. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="cart-page">
        <header className="page-hero">
          <div className="container">
            <h1>Your <span className="text-gradient">Cart</span></h1>
          </div>
        </header>
        <section className="section container">
          <div className="empty-state">
            {whatsappLink ? (
              <>
                <span className="icon">✅</span>
                <h3>Order Ready!</h3>
                <p>Your browser blocked the popup. Tap the button below to send your order via WhatsApp.</p>
                <a href={whatsappLink} target="_blank" rel="noreferrer" className="btn btn-whatsapp btn-lg">
                  Open WhatsApp & Send Order
                </a>
                <Link to="/shop" className="btn btn-ghost btn-dark" style={{ marginTop: 12 }}>Continue Shopping</Link>
              </>
            ) : (
              <>
                <span className="icon">🛒</span>
                <h3>Your cart is empty</h3>
                <p>Looks like you haven't added anything to your cart yet.</p>
                <Link to="/shop" className="btn btn-primary">Start Shopping</Link>
              </>
            )}
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="cart-page">
      <header className="page-hero">
        <div className="container">
          <span className="badge badge-saffron">{totalItems} Items</span>
          <h1>{cartContent.heroTitle.split(' ').slice(0, -1).join(' ')} <span className="text-gradient">{cartContent.heroTitle.split(' ').slice(-1)}</span></h1>
          <p>{cartContent.heroSubtitle}</p>
        </div>
      </header>

      <section className="section container">
        <div className="cart-grid">
          <div className="cart-list">
            <div className="cart-header-labels">
              <span>Product</span>
              <span>Price</span>
              <span>Quantity</span>
              <span>Total</span>
            </div>

            <div className="cart-items-wrap">
              {items.map(item => (
                <div key={item.id} className="cart-page-item">
                  <div className="item-details">
                    <img src={item.image?.url || item.image} alt={item.name} className="item-img" />
                    <div>
                      <h4>{item.name}</h4>
                      <p className="item-cat">{typeof item.category === 'object' ? item.category?.name : item.category}</p>
                    </div>
                  </div>
                  <div className="item-price-col">₹{item.price}</div>
                  <div className="item-qty-col">
                    <div className="qty-picker">
                      <button onClick={() => updateQty(item.id, Math.max(1, item.qty - 1))}>−</button>
                      <span>{item.qty}</span>
                      <button onClick={() => updateQty(item.id, item.qty + 1)}>+</button>
                    </div>
                  </div>
                  <div className="item-total-col">
                    <strong>₹{item.price * item.qty}</strong>
                    <button className="item-remove-btn" title="Remove Item" onClick={() => removeItem(item.id)}>✕</button>
                  </div>
                </div>
              ))}
            </div>

            <Link to="/shop" className="continue-shop-link">← Continue Shopping</Link>
          </div>

          <aside className="cart-summary glass-card">
            <h3>Order Summary</h3>
            <div className="summary-rows">
              <div className="summary-row">
                <span>Subtotal ({totalItems} items)</span>
                <span>₹{totalPrice}</span>
              </div>
              <div className="summary-row">
                <span>Shipping</span>
                <span className={deliveryCharge === 0 ? "text-success" : ""}>
                  {deliveryCharge === 0 ? 'FREE' : `₹${deliveryCharge}`}
                </span>
              </div>
              <div className="summary-total">
                <span>Grand Total</span>
                <span>₹{grandTotal}</span>
              </div>
            </div>

            {!showForm ? (
              <>
                <button className="btn btn-whatsapp btn-lg w-full whatsapp-order-btn" onClick={() => setShowForm(true)}>
                  <span>📱</span> Place Order via WhatsApp
                </button>
                <p className="order-note">Clicking the button will ask for your delivery details before placing the order.</p>
              </>
            ) : (
              <form className="checkout-form animate-fade-in" onSubmit={handleOrderSubmit}>
                <h4 style={{marginTop: 20, marginBottom: 16, borderTop: '1px solid var(--border-light)', paddingTop: 20}}>Delivery Details</h4>
                <div className="form-group" style={{marginBottom: 12}}>
                  <input type="text" className="form-input" placeholder="Full Name *" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                </div>
                <div className="form-group" style={{marginBottom: 12}}>
                  <input type="tel" className="form-input" placeholder="Phone Number *" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required />
                </div>
                <div className="form-group" style={{marginBottom: 12}}>
                  <textarea className="form-textarea" placeholder="Complete Delivery Address *" rows={3} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} required></textarea>
                </div>
                <div className="form-group" style={{marginBottom: 16}}>
                  <textarea className="form-textarea" placeholder="Special Instructions (Optional)" rows={2} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}></textarea>
                </div>
                <button type="submit" disabled={loading} className="btn btn-whatsapp btn-lg w-full whatsapp-order-btn p-static">
                  {loading ? 'Processing...' : 'Place Order & Open WhatsApp'}
                </button>
                <button type="button" className="btn btn-ghost w-full" style={{marginTop: 8}} onClick={() => setShowForm(false)}>
                  Cancel
                </button>
              </form>
            )}
          </aside>
        </div>
      </section>
    </div>
  )
}
