import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { useProducts } from '../context/ProductContext'
import { useSiteContent } from '../context/SiteContentContext'
import ProductCard from '../components/ProductCard'
import ProductCardSkeleton, { ProductSkeletonGrid } from '../components/ProductCardSkeleton'
import SmartLink from '../components/SmartLink'
import './LandingPage.css'

// Tile color themes drawn strictly from the existing brand palette
const TILE_THEMES = [
  { bg: 'var(--green-800)', text: '#FFFFFF', sub: 'rgba(255,255,255,0.72)', arrow: 'var(--lime-400)' },
  { bg: 'var(--lime-400)', text: 'var(--green-900)', sub: 'rgba(13,59,19,0.66)', arrow: 'var(--green-800)' },
  { bg: 'var(--green-600)', text: '#FFFFFF', sub: 'rgba(255,255,255,0.78)', arrow: '#FFFFFF' },
  { bg: 'var(--green-100)', text: 'var(--green-900)', sub: 'rgba(13,59,19,0.62)', arrow: 'var(--green-700)' },
]

export default function LandingPage() {
  const { allProducts, getNewArrivals, getBestSellers, categories, loading } = useProducts()
  const { content } = useSiteContent()
  const { hero, features, about } = content
  const offerBanners = (content.offerBanners || []).filter(b => b.enabled !== false)
  const newArrivals = getNewArrivals(8)
  const bestSellers = getBestSellers(4)
  const spotlight = bestSellers[0] || allProducts[0]
  const featuredPicks = allProducts.filter(p => p.badge).slice(0, 8)
  // Fallback must differ from the New Arrivals grid below, or the
  // homepage shows the same 8 products twice
  const newIds = new Set(newArrivals.map(p => p._id || p.id))
  const fallbackPicks = allProducts.filter(p => !newIds.has(p._id || p.id)).slice(0, 8)
  const picks = featuredPicks.length >= 4 ? featuredPicks : fallbackPicks
  const railRef = useRef(null)

  const scrollRail = (dir) => {
    railRef.current?.scrollBy({ left: dir * 300, behavior: 'smooth' })
  }

  return (
    <div className="landing-page">
      {/* ── Hero Bento: big banner + side promo stack ── */}
      <section className="hero-section">
        <div className="container hero-bento">
          {/* Main banner */}
          <div className="hero-banner">
            <div className="hero-banner__glow" />
            <div className="hero-banner__pattern" />

            <div className="hero-banner__content">
              <span className="hero-banner__eyebrow">{hero.badge}</span>
              <h1 className="hero-banner__title">
                {hero.titleLine1}
                <span className="hero-banner__title-accent">{hero.titleLine2}</span>
              </h1>
              <p className="hero-banner__desc">{hero.description}</p>

              <div className="hero-banner__actions">
                <Link to="/shop" className="hero-banner__cta">{hero.btnPrimary}</Link>
                <Link to="/about" className="hero-banner__cta-ghost">{hero.btnSecondary}</Link>
              </div>

              <div className="hero-banner__stats">
                {hero.stats.map((stat, i) => (
                  <div className="hero-banner__stat" key={i}>
                    <span className="hero-banner__stat-num">{stat.number}</span>
                    <span className="hero-banner__stat-label">{stat.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="hero-banner__visual">
              <div className="hero-banner__img-ring">
                <img
                  src={hero.mainImage}
                  alt="Traditional homemade foods"
                  className="hero-banner__img"
                />
              </div>
              {hero.floatingPills.slice(0, 2).map((pill, i) => (
                <div key={i} className={`hero-banner__float hero-banner__float--${i + 1}`}>
                  <span>{pill.icon}</span>
                  <span className="hero-banner__float-name">{pill.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Side stack */}
          <aside className="hero-side">
            {spotlight && (
              <Link to={`/product/${spotlight._id || spotlight.id}`} className="hero-spot">
                <img
                  src={spotlight.images?.[0]?.url || spotlight.image}
                  alt={spotlight.name}
                  className="hero-spot__img"
                  onError={e => { e.target.src = 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&q=70' }}
                />
                <div className="hero-spot__shade" />
                <span className="hero-spot__chip">★ {spotlight.badge || 'Featured'}</span>
                <div className="hero-spot__info">
                  <p className="hero-spot__name">{spotlight.name}</p>
                  <p className="hero-spot__price">
                    ₹{spotlight.price}
                    {spotlight.unit && <small> / {spotlight.unit}</small>}
                  </p>
                </div>
              </Link>
            )}

            <Link to="/shop" className="hero-promo">
              <div className="hero-promo__ring hero-promo__ring--1" />
              <div className="hero-promo__ring hero-promo__ring--2" />
              <p className="hero-promo__text">
                Fresh, Homemade,
                <em> Delivered!</em>
              </p>
              <span className="hero-promo__cta">
                Order Now <span className="hero-promo__cta-arrow">→</span>
              </span>
            </Link>
          </aside>
        </div>
      </section>

      {/* ── Popular Categories pill strip ── */}
      <section className="cat-strip">
        <div className="container">
          <p className="cat-strip__title">Popular Categories</p>
          <div className="cat-strip__row">
            {categories.map(cat => (
              <Link key={cat.slug || cat._id} to={`/shop/${cat.slug}`} className="cat-pill">
                {cat.image?.url && (
                  <img
                    src={cat.image.url}
                    alt=""
                    className="cat-pill__img"
                    loading="lazy"
                    onError={e => { e.target.style.display = 'none' }}
                  />
                )}
                <span className="cat-pill__name">{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Colorful category tiles ── */}
      <section className="tiles-section">
        <div className="container tiles-grid">
          {categories.slice(0, 4).map((cat, i) => {
            const t = TILE_THEMES[i % TILE_THEMES.length]
            return (
              <Link
                key={cat.slug || cat._id}
                to={`/shop/${cat.slug}`}
                className="cat-tile"
                style={{ background: t.bg }}
              >
                <p className="cat-tile__eyebrow" style={{ color: t.sub }}>100% Homemade</p>
                <h3 className="cat-tile__name" style={{ color: t.text }}>{cat.name}</h3>
                <span className="cat-tile__cta" style={{ color: t.text }}>
                  Order Now <em style={{ color: t.arrow }}>→</em>
                </span>
                {cat.image?.url && (
                  <img src={cat.image.url} alt="" className="cat-tile__img" loading="lazy" />
                )}
              </Link>
            )
          })}
        </div>
      </section>

      {/* ── Offer banners (admin-managed) ── */}
      {offerBanners.length > 0 && (
        <section className="offers-section">
          <div className="container offers-grid">
            {offerBanners.map(b => (
              <SmartLink
                key={b.id}
                to={b.link || '/shop'}
                className={`offer-card offer-card--${b.theme || 'green'}`}
              >
                {b.image && <img src={b.image} alt="" className="offer-card__img" loading="lazy" />}
                <div className="offer-card__shade" />
                <div className="offer-card__content">
                  {b.subtitle && <p className="offer-card__sub">{b.subtitle}</p>}
                  <h3 className="offer-card__title">{b.title}</h3>
                  {b.cta && <span className="offer-card__cta">{b.cta} <em>→</em></span>}
                </div>
              </SmartLink>
            ))}
          </div>
        </section>
      )}

      {/* ── Best Picks carousel ── */}
      {(loading || picks.length > 0) && (
      <section className="section rail-section">
        <div className="container">
          <div className="sec-head">
            <div className="sec-head__left">
              <h2>
                <span className="sec-head__icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.95 6.3 6.9.88-5.07 4.77 1.31 6.83L12 17.4l-6.09 3.38 1.31-6.83L2.15 9.18l6.9-.88L12 2z" /></svg>
                </span>
                Best Picks For You
              </h2>
              <p>Our most loved homemade delicacies, hand-picked for you</p>
            </div>
            <div className="sec-head__nav">
              <Link to="/shop" className="btn btn-ghost btn-dark btn-sm">View All</Link>
              <button className="rail-arrow" onClick={() => scrollRail(-1)} aria-label="Scroll left">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
              </button>
              <button className="rail-arrow" onClick={() => scrollRail(1)} aria-label="Scroll right">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
              </button>
            </div>
          </div>

          <div className="rail" ref={railRef}>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div className="rail__item" key={i}><ProductCardSkeleton /></div>
                ))
              : picks.map(product => (
                  <div className="rail__item" key={product._id || product.id}>
                    <ProductCard product={product} />
                  </div>
                ))}
          </div>
        </div>
      </section>
      )}

      {/* ── New Arrivals Grid ── */}
      <section className="section new-arrivals bg-cream-2">
        <div className="container">
          <div className="sec-head">
            <div className="sec-head__left">
              <h2>
                <span className="sec-head__icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" /><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" /></svg>
                </span>
                Newly Added Products
              </h2>
              <p>Our latest handcrafted additions to the catalog</p>
            </div>
            <div className="sec-head__nav">
              <Link to="/shop" className="btn btn-ghost btn-dark btn-sm">View All</Link>
            </div>
          </div>

          <div className="products-grid">
            {loading
              ? <ProductSkeletonGrid count={8} />
              : newArrivals.map(product => (
                  <ProductCard key={product._id || product.id} product={product} />
                ))}
          </div>
        </div>
      </section>

      {/* ── About teaser band + features ── */}
      <section className="section about-section">
        <div className="container">
          <div className="about-band">
            <div className="about-band__content">
              <span className="about-band__chip">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
                A Little Bite About Us
              </span>
              <p className="about-band__kicker">Savor the flavor, anytime, anywhere</p>
              <h2 className="about-band__title">
                Fresh, Homemade &<span className="about-band__title-accent"> Full of Goodness</span>
              </h2>
              <p className="about-band__text">{about.paragraph1}</p>
              <Link to="/about" className="about-band__btn">Our Story →</Link>
            </div>
            <div className="about-band__visual">
              <div className="about-band__blob" />
              <img src={about.image} alt="Our kitchen story" className="about-band__img" />
            </div>
          </div>

          <div className="features-row">
            {features.map((f, i) => (
              <div key={i} className="feature-chip">
                <span className="feature-chip__icon">{f.icon}</span>
                <div>
                  <h3 className="feature-chip__title">{f.title}</h3>
                  <p className="feature-chip__desc">{f.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
