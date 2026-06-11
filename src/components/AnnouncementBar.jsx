import { useState } from 'react'
import SmartLink from './SmartLink'
import { useSiteContent } from '../context/SiteContentContext'
import './AnnouncementBar.css'

export default function AnnouncementBar() {
  const { content } = useSiteContent()
  const ann = content.announcement
  const [dismissed, setDismissed] = useState(false)

  if (!ann || !ann.enabled || !ann.text || dismissed) return null

  const inner = (
    <span className="announce-bar__text">{ann.text}</span>
  )

  return (
    <div className="announce-bar">
      <div className="announce-bar__marquee">
        {ann.link ? (
          <SmartLink to={ann.link} className="announce-bar__link">{inner}</SmartLink>
        ) : inner}
      </div>
      <button
        className="announce-bar__close"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss announcement"
      >
        ✕
      </button>
    </div>
  )
}
