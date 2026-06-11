import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import './ProductCard.css'

export default function ProductCard({ product }) {
  const { addItem } = useCart()
  const pid = product._id || product.id
  const categoryName = (product.category?.name || String(product.category || '')).replace(/-/g, ' ')

  return (
    <article className="product-card">
      <Link to={`/product/${pid}`} className="product-card__link">
        <div className="product-card__top">
          <div className="product-card__img-ring">
            <img
              src={product.images?.[0]?.url || product.image}
              alt={product.name}
              className="product-card__image"
              loading="lazy"
              onError={e => {
                e.target.src = 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&q=60'
              }}
            />
          </div>
          {product.badge && (
            <span className="product-card__chip">{product.badge}</span>
          )}
          {product.isAdmin && (
            <span className="product-card__chip product-card__chip--new">New Upload</span>
          )}
        </div>

        {categoryName && <p className="product-card__category">{categoryName}</p>}
        <h3 className="product-card__name">{product.name}</h3>
        {product.description && (
          <p className="product-card__desc">{product.description}</p>
        )}
      </Link>

      <div className="product-card__footer">
        <div className="product-card__price-wrap">
          <p className="product-card__price">₹{product.price}</p>
          {product.unit && (
            <span className="product-card__per">/ {product.unit}</span>
          )}
        </div>
        <button
          className="product-card__add"
          onClick={(e) => { e.preventDefault(); addItem(product) }}
        >
          Add <span className="product-card__add-plus">＋</span>
        </button>
      </div>
    </article>
  )
}
