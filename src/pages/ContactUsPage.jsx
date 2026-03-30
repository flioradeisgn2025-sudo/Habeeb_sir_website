import { useSiteContent } from '../context/SiteContentContext'

export default function ContactUsPage() {
  const { content } = useSiteContent()
  const c = content.contact

  const handleSubmit = (e) => {
    e.preventDefault()
    alert('Thank you for your message! We will get back to you soon.')
  }

  return (
    <div className="contact-page">
      <header className="page-hero">
        <div className="container">
          <span className="badge badge-saffron">{c.badge}</span>
          <h1>{c.heroTitle.split(' ').slice(0, -1).join(' ')} <span className="text-gradient">{c.heroTitle.split(' ').slice(-1)}</span></h1>
          <p>{c.heroSubtitle}</p>
        </div>
      </header>

      <section className="section container">
        <div className="contact-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 1.5fr', gap: '60px' }}>
          {/* Info */}
          <div className="contact-info animate-fade-in-up">
            <h2 style={{ marginBottom: '24px' }}>Contact <span className="text-gradient">Information</span></h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '40px' }}>Feel free to contact us through any of these channels. We typically respond within a few hours.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '24px' }}>📞</span>
                <div>
                  <h4 style={{ fontWeight: '700' }}>Phone / WhatsApp</h4>
                  <p style={{ color: 'var(--text-secondary)' }}>{c.phone}</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '24px' }}>📧</span>
                <div>
                  <h4 style={{ fontWeight: '700' }}>Email Address</h4>
                  <p style={{ color: 'var(--text-secondary)' }}>{c.email}</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '24px' }}>📍</span>
                <div>
                  <h4 style={{ fontWeight: '700' }}>Our Location</h4>
                  <p style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>{c.address}</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '24px' }}>⏰</span>
                <div>
                  <h4 style={{ fontWeight: '700' }}>Working Hours</h4>
                  <p style={{ color: 'var(--text-secondary)' }}>{c.hours}</p>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '50px' }}>
              <h4 style={{ marginBottom: '16px' }}>Follow Us</h4>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn btn-ghost btn-dark btn-sm">Instagram</button>
                <button className="btn btn-ghost btn-dark btn-sm">Facebook</button>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="contact-form-wrap glass-card animate-fade-in" style={{ padding: '40px' }}>
            <h3 style={{ marginBottom: '24px' }}>Send us a Message</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input type="text" className="form-input" placeholder="Your name" required />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input type="email" className="form-input" placeholder="Your email" required />
              </div>
              <div className="form-group">
                <label className="form-label">Subject</label>
                <select className="form-select">
                  <option>Order Inquiry</option>
                  <option>Product Feedback</option>
                  <option>Bulk/Event Ordering</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Message</label>
                <textarea className="form-textarea" placeholder="How can we help?" required></textarea>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
                Send Message
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Map Placeholder */}
      <section className="container section-sm">
        <div style={{ width: '100%', height: '400px', background: 'var(--green-50)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-light)' }}>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '48px', display: 'block', marginBottom: '10px' }}>🗺️</span>
            <p style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>Google Maps Interactive Display Placeholder</p>
          </div>
        </div>
      </section>
    </div>
  )
}
