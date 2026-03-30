import { Link } from 'react-router-dom'
import { useProducts } from '../context/ProductContext'
import { useSiteContent } from '../context/SiteContentContext'
import './Footer.css'

export default function Footer() {
  const { categories } = useProducts()
  const { content } = useSiteContent()
  const f = content.footer

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          {/* Brand */}
          <div className="footer__brand">
            <Link to="/" className="footer__logo">
              <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Nalam Vaazha" className="footer__logo-img" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
              <span className="footer__logo-name" style={{ display: 'none' }}>Nalam <span>Vaazha</span></span>
            </Link>
            <p className="footer__tagline">{f.tagline}</p>
            <div className="footer__social">
              <a href={f.instagramUrl} className="footer__social-btn" aria-label="Instagram" target="_blank" rel="noreferrer">📸</a>
              <a href={f.facebookUrl} className="footer__social-btn" aria-label="Facebook" target="_blank" rel="noreferrer">👍</a>
              <a href={f.whatsappUrl} className="footer__social-btn" aria-label="WhatsApp" target="_blank" rel="noreferrer">💬</a>
            </div>
          </div>

          {/* Categories */}
          <div className="footer__col">
            <h4 className="footer__heading">Shop</h4>
            <ul className="footer__links">
              {categories && categories.map(cat => (
                <li key={cat.slug || cat._id}>
                  <Link to={`/shop/${cat.slug}`} className="footer__link">{cat.name}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Pages */}
          <div className="footer__col">
            <h4 className="footer__heading">Info</h4>
            <ul className="footer__links">
              <li><Link to="/" className="footer__link">Home</Link></li>
              <li><Link to="/shop" className="footer__link">Shop All</Link></li>
              <li><Link to="/about" className="footer__link">About Us</Link></li>
              <li><Link to="/faq" className="footer__link">FAQ</Link></li>
              <li><Link to="/contact" className="footer__link">Contact Us</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="footer__col">
            <h4 className="footer__heading">Contact</h4>
            <ul className="footer__contact-list">
              <li>📞 {f.phone}</li>
              <li>📧 {f.email}</li>
              <li>📍 {f.location}</li>
              <li>⏰ {f.hours}</li>
            </ul>
          </div>
        </div>

        <div className="footer__bottom">
          <p>&copy; {new Date().getFullYear()} Nalam Vaazha (நலம் வாழ). Made with ❤️ for daily health.</p>
          <p>{f.copyrightExtra}</p>
        </div>
      </div>
    </footer>
  )
}
