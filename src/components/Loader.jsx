import './Loader.css'

// Reusable branded inline loader (ring + pulsing leaf). Use inside sections,
// the admin panel, tab transitions, etc.
export default function Loader({ label = 'Loading…', compact = false }) {
  return (
    <div className={`inline-loader ${compact ? 'inline-loader--compact' : ''}`} role="status" aria-live="polite">
      <span className="inline-loader__mark">
        <span className="inline-loader__ring" />
        {!compact && <span className="inline-loader__leaf">🌿</span>}
      </span>
      {label && <span className="inline-loader__label">{label}</span>}
    </div>
  )
}
