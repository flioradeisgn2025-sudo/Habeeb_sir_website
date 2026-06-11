import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useProducts } from '../context/ProductContext'
import { useCart } from '../context/CartContext'
import ProductCard from '../components/ProductCard'
import './ProductDetailPage.css'

const REVIEWS_KEY = 'nalamvaazha_reviews'

function loadReviews() {
  try {
    const saved = localStorage.getItem(REVIEWS_KEY)
    return saved ? JSON.parse(saved) : {}
  } catch { return {} }
}

function saveReviews(reviews) {
  localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews))
}

function StarRating({ rating, onRate, interactive = false, size = 24 }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="star-rating" style={{ fontSize: size }}>
      {[1, 2, 3, 4, 5].map(star => (
        <span
          key={star}
          className={`star-rating__star ${star <= (hover || rating) ? 'star-rating__star--filled' : ''} ${interactive ? 'star-rating__star--interactive' : ''}`}
          onClick={() => interactive && onRate(star)}
          onMouseEnter={() => interactive && setHover(star)}
          onMouseLeave={() => interactive && setHover(0)}
        >
          ★
        </span>
      ))}
    </div>
  )
}

export default function ProductDetailPage() {
  const { productId } = useParams()
  const { getProductById, getByCategory, allProducts } = useProducts()
  const { addItem } = useCart()

  const product = getProductById(productId)

  // Carousel state
  const [currentImg, setCurrentImg] = useState(0)

  // Reviews state
  const [allReviews, setAllReviews] = useState(loadReviews)
  const [reviewForm, setReviewForm] = useState({ name: '', rating: 0, comment: '' })

  // Build image list — merge images array + fallback image, deduplicate
  const productImages = (() => {
    if (!product) return []
    const imgs = (product.images || []).map(img => img.url || img).filter(Boolean)
    // Also include the main image field if not already present
    if (product.image && !imgs.includes(product.image)) {
      imgs.unshift(product.image)
    }
    // Deduplicate
    const unique = [...new Set(imgs)]
    return unique.length ? unique : ['https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&q=80']
  })()

  // Reset carousel when product changes
  useEffect(() => { setCurrentImg(0) }, [productId])

  if (!product) {
    return (
      <div className="section container">
        <div className="empty-state">
          <span className="icon">❓</span>
          <h3>Product not found</h3>
          <p>The product you're looking for doesn't exist.</p>
          <Link to="/shop" className="btn btn-primary">Back to Shop</Link>
        </div>
      </div>
    )
  }

  const productReviews = allReviews[productId] || []
  const avgRating = productReviews.length
    ? (productReviews.reduce((s, r) => s + r.rating, 0) / productReviews.length).toFixed(1)
    : 0

  const handleSubmitReview = (e) => {
    e.preventDefault()
    if (!reviewForm.rating) return
    const newReview = {
      id: Date.now(),
      name: reviewForm.name || 'Anonymous',
      rating: reviewForm.rating,
      comment: reviewForm.comment,
      date: new Date().toISOString(),
    }
    const updated = {
      ...allReviews,
      [productId]: [...(allReviews[productId] || []), newReview],
    }
    setAllReviews(updated)
    saveReviews(updated)
    setReviewForm({ name: '', rating: 0, comment: '' })
  }

  const prevImg = () => setCurrentImg(i => (i === 0 ? productImages.length - 1 : i - 1))
  const nextImg = () => setCurrentImg(i => (i === productImages.length - 1 ? 0 : i + 1))

  // Related products
  const categorySlug = product.category?.slug || ''
  const related = allProducts
    .filter(p => (p.category?.slug === categorySlug) && (p._id || p.id) !== productId)
    .slice(0, 4)

  const ingredientsList = (product.ingredients || '').split(',').map(s => s.trim()).filter(Boolean)

  return (
    <div className="product-detail-page">
      <section className="section container" style={{ paddingTop: 40 }}>
        <Link to="/shop" className="pd-back-link">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Back to Shop
        </Link>
        <div className="pd-grid">
          {/* Left — Image Carousel */}
          <div className="pd-carousel">
            <div className="pd-carousel__main">
              {productImages.length > 1 && (
                <button className="pd-carousel__btn pd-carousel__btn--left" onClick={prevImg} aria-label="Previous image">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
              )}
              <img
                src={productImages[currentImg]}
                alt={product.name}
                className="pd-carousel__image"
                onError={e => { e.target.src = 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&q=80' }}
              />
              {productImages.length > 1 && (
                <button className="pd-carousel__btn pd-carousel__btn--right" onClick={nextImg} aria-label="Next image">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              )}
              {/* Image counter badge */}
              {productImages.length > 1 && (
                <span className="pd-carousel__counter">{currentImg + 1} / {productImages.length}</span>
              )}
              {/* Dots */}
              {productImages.length > 1 && (
                <div className="pd-carousel__dots">
                  {productImages.map((_, i) => (
                    <button
                      key={i}
                      className={`pd-carousel__dot ${i === currentImg ? 'pd-carousel__dot--active' : ''}`}
                      onClick={() => setCurrentImg(i)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {productImages.length > 1 && (
              <div className="pd-carousel__thumbs">
                {productImages.map((img, i) => (
                  <button
                    key={i}
                    className={`pd-carousel__thumb ${i === currentImg ? 'pd-carousel__thumb--active' : ''}`}
                    onClick={() => setCurrentImg(i)}
                  >
                    <img src={img} alt={`${product.name} ${i + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right — Product Info */}
          <div className="pd-info">
            <div className="pd-info__badges">
              {product.badge && <span className="badge badge-featured">{product.badge}</span>}
              {product.isNew && <span className="badge badge-new">New</span>}
            </div>

            <p className="pd-info__category">{product.category?.name || ''}</p>
            <h1 className="pd-info__name">{product.name}</h1>

            {/* Rating summary */}
            <div className="pd-info__rating-summary">
              <StarRating rating={Math.round(avgRating)} size={20} />
              <span className="pd-info__rating-text">
                {productReviews.length > 0
                  ? `${avgRating} (${productReviews.length} review${productReviews.length > 1 ? 's' : ''})`
                  : 'No reviews yet'}
              </span>
            </div>

            <div className="pd-info__price-row">
              <span className="pd-info__price">₹{product.price}</span>
              {product.unit && <span className="pd-info__unit">/ {product.unit}</span>}
            </div>

            <p className="pd-info__description">{product.description}</p>

            <button className="btn btn-primary btn-lg pd-info__add-btn" onClick={() => addItem(product)}>
              + Add to Cart
            </button>

            {/* Ingredients Box */}
            {ingredientsList.length > 0 && (
              <div className="pd-ingredients">
                <h3 className="pd-ingredients__title">Ingredients</h3>
                <div className="pd-ingredients__list">
                  {ingredientsList.map((ing, i) => (
                    <span key={i} className="pd-ingredients__tag">{ing}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Product details */}
            <div className="pd-meta">
              {product.stock !== undefined && (
                <div className="pd-meta__item">
                  <span className="pd-meta__label">Availability</span>
                  <span className={`pd-meta__value ${product.stock > 0 ? 'text-success' : 'text-error'}`}>
                    {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                  </span>
                </div>
              )}
              <div className="pd-meta__item">
                <span className="pd-meta__label">Category</span>
                <Link to={`/shop/${product.category?.slug || ''}`} className="pd-meta__value pd-meta__link">
                  {product.category?.name || 'Uncategorized'}
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="pd-reviews">
          <h2 className="pd-reviews__title">Customer Reviews</h2>

          {/* Review Summary */}
          <div className="pd-reviews__summary">
            <div className="pd-reviews__avg">
              <span className="pd-reviews__avg-num">{avgRating || '0'}</span>
              <StarRating rating={Math.round(avgRating)} size={22} />
              <span className="pd-reviews__count">{productReviews.length} review{productReviews.length !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Write Review Form */}
          <div className="pd-reviews__form-card glass-card">
            <h4>Write a Review</h4>
            <form onSubmit={handleSubmitReview}>
              <div className="form-group">
                <label className="form-label">Your Rating *</label>
                <StarRating rating={reviewForm.rating} onRate={r => setReviewForm({...reviewForm, rating: r})} interactive size={32} />
              </div>
              <div className="form-group">
                <label className="form-label">Your Name</label>
                <input type="text" className="form-input" placeholder="Anonymous" value={reviewForm.name} onChange={e => setReviewForm({...reviewForm, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Your Review</label>
                <textarea className="form-textarea" rows={3} placeholder="Share your experience with this product..." value={reviewForm.comment} onChange={e => setReviewForm({...reviewForm, comment: e.target.value})} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={!reviewForm.rating}>
                Submit Review
              </button>
            </form>
          </div>

          {/* Review List */}
          {productReviews.length > 0 && (
            <div className="pd-reviews__list">
              {[...productReviews].reverse().map(review => (
                <div key={review.id} className="pd-review-card glass-card">
                  <div className="pd-review-card__header">
                    <div className="pd-review-card__avatar">{(review.name || 'A')[0].toUpperCase()}</div>
                    <div>
                      <p className="pd-review-card__name">{review.name}</p>
                      <p className="pd-review-card__date">{new Date(review.date).toLocaleDateString()}</p>
                    </div>
                    <div className="pd-review-card__stars">
                      <StarRating rating={review.rating} size={16} />
                    </div>
                  </div>
                  {review.comment && <p className="pd-review-card__comment">{review.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <div className="pd-related">
            <div className="section-header">
              <h2>You May Also <span className="text-gradient">Like</span></h2>
            </div>
            <div className="products-grid">
              {related.map(p => (
                <ProductCard key={p._id || p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
