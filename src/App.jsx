import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { CartProvider } from './context/CartContext'
import { ProductProvider, useProducts } from './context/ProductContext'
import { SiteContentProvider } from './context/SiteContentContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'

// Pages
import LandingPage from './pages/LandingPage'
import ShopPage from './pages/ShopPage'
import CategoryPage from './pages/CategoryPage'
import CartPage from './pages/CartPage'
import AboutUsPage from './pages/AboutUsPage'
import FAQPage from './pages/FAQPage'
import ContactUsPage from './pages/ContactUsPage'
import AdminPage from './pages/AdminPage'
import ProductDetailPage from './pages/ProductDetailPage'

// Scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function PageLoader() {
  const { loading } = useProducts()
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => setVisible(false), 300)
      return () => clearTimeout(timer)
    }
  }, [loading])

  if (!visible) return null

  return (
    <div className={`page-loader ${!loading ? 'page-loader--hidden' : ''}`}>
      <div className="page-loader__spinner" />
      <p className="page-loader__text">Loading Nalam Vaazha...</p>
    </div>
  )
}

function AppContent() {
  return (
    <>
      <PageLoader />
      <Router>
        <ScrollToTop />
        <div className="app-container">
          <Navbar />
          <main className="content-wrap">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/shop" element={<ShopPage />} />
              <Route path="/shop/:categoryId" element={<CategoryPage />} />
              <Route path="/product/:productId" element={<ProductDetailPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/about" element={<AboutUsPage />} />
              <Route path="/faq" element={<FAQPage />} />
              <Route path="/contact" element={<ContactUsPage />} />
              <Route path="/admin" element={<AdminPage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </>
  )
}

function App() {
  return (
    <ProductProvider>
      <CartProvider>
        <SiteContentProvider>
          <AppContent />
        </SiteContentProvider>
      </CartProvider>
    </ProductProvider>
  )
}

export default App
