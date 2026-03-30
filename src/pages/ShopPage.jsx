import { useState, useMemo } from 'react'
import { useProducts } from '../context/ProductContext'
import { useSiteContent } from '../context/SiteContentContext'
import ProductCard from '../components/ProductCard'
import './ShopPage.css'

export default function ShopPage() {
  const { allProducts, categories } = useProducts()
  const { content } = useSiteContent()
  const shop = content.shop
  const [activeCategory, setActiveCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredProducts = useMemo(() => {
    return allProducts.filter(p => {
      const matchesCategory = activeCategory === 'all' || (p.category && p.category.slug === activeCategory)
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            p.description.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [allProducts, activeCategory, searchQuery])

  return (
    <div className="shop-page">
      <header className="page-hero">
        <div className="container">
          <span className="badge badge-featured">{shop.badge}</span>
          <h1>{shop.heroTitle.split(' ').slice(0, -1).join(' ')} <span className="text-lime">{shop.heroTitle.split(' ').slice(-1)}</span></h1>
          <p>{shop.heroSubtitle}</p>
        </div>
      </header>

      <section className="section shop-content">
        <div className="container">
          {/* Controls */}
          <div className="shop-controls">
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="category-filters">
              <button
                className={`filter-btn ${activeCategory === 'all' ? 'active' : ''}`}
                onClick={() => setActiveCategory('all')}
              >
                All Products
              </button>
              {categories.map(cat => (
                <button
                  key={cat.slug}
                  className={`filter-btn ${activeCategory === cat.slug ? 'active' : ''}`}
                  onClick={() => setActiveCategory(cat.slug)}
                >
                  <img src={cat.image?.url} alt={cat.name} style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover', display: 'inline-block', marginRight: 8, verticalAlign: 'middle' }} />
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Results Info */}
          <div className="shop-results-info">
            <p>Showing <strong>{filteredProducts.length}</strong> products</p>
          </div>

          {/* Grid */}
          {filteredProducts.length > 0 ? (
            <div className="products-grid animate-fade-in">
              {filteredProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="empty-state animate-fade-in">
              <span className="icon">🥡</span>
              <h3>No products found</h3>
              <p>Try adjusting your search or category filter.</p>
              <button className="btn btn-lime" onClick={() => { setActiveCategory('all'); setSearchQuery('') }}>
                Reset Filters
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
