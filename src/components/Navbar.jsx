import { useState, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import CartDrawer from './CartDrawer'
import './Navbar.css'

export default function Navbar() {
  const { totalItems, isOpen, setIsOpen } = useCart()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/shop', label: 'Shop', tag: 'HOT' },
    { to: '/about', label: 'About' },
    { to: '/faq', label: 'FAQ' },
    { to: '/contact', label: 'Contact' },
  ]

  return (
    <>
      <header className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
        <div className="container navbar__inner">
          {/* Logo */}
          <Link to="/" className="navbar__logo">
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Nalam Vaazha" className="navbar__logo-img" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
            <span className="navbar__brand" style={{ display: 'none' }}>
              Nalam <span className="navbar__brand-accent">Vaazha</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="navbar__links">
            {navLinks.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `navbar__link ${isActive ? 'navbar__link--active' : ''}`
                }
              >
                {link.label}
                {link.tag && <span className="navbar__link-tag">{link.tag}</span>}
              </NavLink>
            ))}
          </nav>

          {/* Right side */}
          <div className="navbar__actions">
            <button
              className="navbar__search-btn"
              onClick={() => navigate('/shop')}
              aria-label="Search products"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
              </svg>
            </button>

            <button
              className="navbar__cart-btn"
              onClick={() => setIsOpen(true)}
              aria-label="Open cart"
            >
              <svg className="navbar__cart-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {totalItems > 0 && (
                <span className="navbar__cart-badge">{totalItems}</span>
              )}
            </button>

            {/* Mobile hamburger */}
            <button
              className={`navbar__hamburger ${menuOpen ? 'open' : ''}`}
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              <span /><span /><span />
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="navbar__mobile-menu" onClick={() => setMenuOpen(false)}>
            {navLinks.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `navbar__mobile-link ${isActive ? 'navbar__mobile-link--active' : ''}`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>
        )}
      </header>

      <CartDrawer isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}
