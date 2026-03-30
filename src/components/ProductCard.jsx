import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import './ProductCard.css'

export default function ProductCard({ product }) {
  const { addItem } = useCart()
  const pid = product._id || product.id

  return (
    <article className="product-card">
      <Link to={`/product/${pid}`} className="product-card__link">
        <div className="product-card__image-wrap">
          <img
            src={product.images?.[0]?.url || product.image}
            alt={product.name}
            className="product-card__image"
            loading="lazy"
            onError={e => {
              e.target.src = 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&q=60'
            }}
          />
          {product.badge && (
            <span className="product-card__badge">{product.badge}</span>
          )}
          {product.isAdmin && (
            <span className="product-card__badge product-card__badge--admin">New Upload</span>
          )}
        </div>

        <div className="product-card__body">
          <p className="product-card__category">{(product.category?.name || String(product.category)).replace(/-/g, ' ')}</p>
          <h3 className="product-card__name">{product.name}</h3>
          {product.unit && (
            <p className="product-card__unit">{product.unit}</p>
          )}
        </div>
      </Link>

      <div className="product-card__footer-wrap">
        <div className="product-card__footer">
          <p className="product-card__price">₹{product.price}</p>
          <button
            className="btn btn-primary btn-sm product-card__add-btn"
            onClick={(e) => { e.preventDefault(); addItem(product) }}
          >
            + Add
          </button>
        </div>
      </div>
    </article>
  )
}
