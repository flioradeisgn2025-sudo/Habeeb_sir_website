import { Link } from 'react-router-dom'
import { useProducts } from '../context/ProductContext'
import { useSiteContent } from '../context/SiteContentContext'
import CategoryCircleCard from '../components/CategoryCircleCard'
import ProductCard from '../components/ProductCard'
import './LandingPage.css'

export default function LandingPage() {
  const { getNewArrivals, getBestSellers, categories } = useProducts()
  const { content } = useSiteContent()
  const { hero, features } = content
  const newArrivals = getNewArrivals(8)
  const bestSellers = getBestSellers(4)

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero-v3">
        <div className="hero-v3__lime-bg" />
        <div className="hero-v3__pattern" />

        <div className="container hero-v3__inner">
          {/* Left — Text Content */}
          <div className="hero-v3__content">
            <span className="hero-v3__badge">{hero.badge}</span>

            <h1 className="hero-v3__title">
              {hero.titleLine1}
              <span className="hero-v3__title-line2">{hero.titleLine2}</span>
            </h1>

            <p className="hero-v3__desc">{hero.description}</p>

            <div className="hero-v3__actions">
              <Link to="/shop" className="hero-v3__btn-primary">
                {hero.btnPrimary}
              </Link>
              <Link to="/about" className="hero-v3__btn-secondary">
                {hero.btnSecondary}
              </Link>
            </div>

            <div className="hero-v3__stats">
              {hero.stats.map((stat, i) => (
                <div className="hero-v3__stat" key={i}>
                  <span className="hero-v3__stat-num">{stat.number}</span>
                  <span className="hero-v3__stat-label">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Visual */}
          <div className="hero-v3__visual">
            <div className="hero-v3__blob" />

            <div className="hero-v3__main-img-wrap">
              <img
                src={hero.mainImage}
                alt="Traditional Spices & Homemade Foods"
                className="hero-v3__main-img"
              />
            </div>

            {/* Floating pill cards */}
            {hero.floatingPills.map((pill, i) => (
              <div key={i} className={`hero-v3__float hero-v3__float--${i + 1}`}>
                <span className="hero-v3__float-icon">{pill.icon}</span>
                <span className="hero-v3__float-name">{pill.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Horizontal Scroll */}
      <section className="section-sm categories-section">
        <div className="container">
          <div className="section-header">
            <h2>Shop by <span className="text-gradient">Category</span></h2>
            <p>Explore our wide range of homemade delicacies</p>
          </div>
          <div className="categories-row">
            {categories.map(cat => (
              <CategoryCircleCard key={cat.slug} category={cat} />
            ))}
          </div>
        </div>
      </section>

      {/* Best Sellers Grid */}
      <section className="section best-sellers">
        <div className="container">
          <div className="section-header">
            <div className="section-header__top">
              <h2>Top <span className="text-gradient">Best Sellers</span></h2>
              <Link to="/shop" className="btn btn-ghost btn-dark btn-sm">View All</Link>
            </div>
            <p>Our most loved and frequently bought homemade delicacies</p>
          </div>

          <div className="products-grid">
            {bestSellers.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* New Arrivals Grid */}
      <section className="section new-arrivals bg-cream-2">
        <div className="container">
          <div className="section-header">
            <div className="section-header__top">
              <h2>Newly <span className="text-gradient">Added Products</span></h2>
              <Link to="/shop" className="btn btn-ghost btn-dark btn-sm">View All</Link>
            </div>
            <p>Our latest handcrafted additions to the catalog</p>
          </div>

          <div className="products-grid">
            {newArrivals.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="section features">
        <div className="container features__grid">
          {features.map((f, i) => (
            <div key={i} className="feature-card glass-card">
              <span className="feature-icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
