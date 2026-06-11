import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import './RouteLoader.css'

// Shows a top progress bar + a brief branded spinner overlay on every route
// change, so navigating to any page (including /admin) has an animated loader.
export default function RouteLoader() {
  const { pathname } = useLocation()
  const [phase, setPhase] = useState('idle') // 'loading' | 'done' | 'idle'
  const firstRender = useRef(true)

  useEffect(() => {
    // Skip the very first render — the full-screen PageLoader covers initial load
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    setPhase('loading')
    const toDone = setTimeout(() => setPhase('done'), 480)
    const toIdle = setTimeout(() => setPhase('idle'), 820)
    return () => { clearTimeout(toDone); clearTimeout(toIdle) }
  }, [pathname])

  return (
    <>
      <div className={`route-bar route-bar--${phase}`} />

      <div className={`route-loader ${phase === 'loading' ? 'route-loader--show' : ''}`} aria-hidden={phase !== 'loading'}>
        <div className="route-loader__mark">
          <span className="route-loader__ring" />
          <span className="route-loader__dot" />
          <span className="route-loader__leaf">🌿</span>
        </div>
        <span className="route-loader__text">Nalam Vaazha</span>
      </div>
    </>
  )
}
