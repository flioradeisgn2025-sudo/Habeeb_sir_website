import './ProductCardSkeleton.css'

// Placeholder card shown while products load — mirrors the ProductCard layout.
export default function ProductCardSkeleton() {
  return (
    <div className="prod-skel" aria-hidden="true">
      <div className="prod-skel__top">
        <div className="prod-skel__img sk-shimmer" />
        <div className="prod-skel__chip sk-shimmer" />
      </div>
      <div className="prod-skel__line sk-shimmer" style={{ width: '80%' }} />
      <div className="prod-skel__line sk-shimmer" style={{ width: '95%' }} />
      <div className="prod-skel__line sk-shimmer" style={{ width: '55%' }} />
      <div className="prod-skel__footer">
        <div className="prod-skel__price sk-shimmer" />
        <div className="prod-skel__btn sk-shimmer" />
      </div>
    </div>
  )
}

// Convenience: render N skeleton cards
export function ProductSkeletonGrid({ count = 8 }) {
  return Array.from({ length: count }).map((_, i) => <ProductCardSkeleton key={i} />)
}
