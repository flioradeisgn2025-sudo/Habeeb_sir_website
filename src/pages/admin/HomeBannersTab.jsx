import ImageUpload from '../../components/admin/ImageUpload'
import './HomeBannersTab.css'

const THEMES = [
  { key: 'green', label: 'Dark Green' },
  { key: 'lime', label: 'Lime' },
]

export default function HomeBannersTab({ content, updateSection }) {
  const ann = content.announcement || { enabled: false, text: '', link: '' }
  const banners = content.offerBanners || []

  const updateAnn = (field, val) => updateSection('announcement', { ...ann, [field]: val })

  const updateBanner = (id, patch) =>
    updateSection('offerBanners', banners.map(b => (b.id === id ? { ...b, ...patch } : b)))

  const addBanner = () =>
    updateSection('offerBanners', [
      ...banners,
      { id: 'ob-' + Date.now(), title: 'New Offer', subtitle: '', cta: 'Shop Now', image: '', link: '/shop', theme: 'green', enabled: true },
    ])

  const removeBanner = (id) =>
    updateSection('offerBanners', banners.filter(b => b.id !== id))

  return (
    <div className="home-banners animate-fade-in">
      {/* Announcement bar */}
      <div className="hb-card glass-card">
        <div className="hb-card__head">
          <div>
            <h3>Announcement Bar</h3>
            <p className="hb-card__hint">Shows as a thin strip at the very top of every page.</p>
          </div>
          <label className="hb-toggle">
            <input type="checkbox" checked={!!ann.enabled} onChange={e => updateAnn('enabled', e.target.checked)} />
            <span className="hb-toggle__track"><span className="hb-toggle__thumb" /></span>
            <span className="hb-toggle__label">{ann.enabled ? 'Visible' : 'Hidden'}</span>
          </label>
        </div>

        <div className="form-group">
          <label className="form-label">Announcement Text</label>
          <input className="form-input" value={ann.text || ''} onChange={e => updateAnn('text', e.target.value)} placeholder="e.g. 🎉 Free delivery on orders above ₹500" />
        </div>
        <div className="form-group">
          <label className="form-label">Link (optional)</label>
          <input className="form-input" value={ann.link || ''} onChange={e => updateAnn('link', e.target.value)} placeholder="/shop" />
        </div>

        {/* Live preview */}
        {ann.enabled && ann.text && (
          <div className="hb-ann-preview">{ann.text}</div>
        )}
      </div>

      {/* Offer banners */}
      <div className="hb-card glass-card">
        <div className="hb-card__head">
          <div>
            <h3>Offer Banners</h3>
            <p className="hb-card__hint">Promotional cards shown on the homepage. Drag an image or paste a URL.</p>
          </div>
          <button className="btn btn-sm btn-primary" onClick={addBanner}>+ Add Banner</button>
        </div>

        {banners.length === 0 ? (
          <div className="empty-state-small">No offer banners yet. Add one to feature a promotion.</div>
        ) : (
          <div className="hb-banner-list">
            {banners.map(b => (
              <div key={b.id} className={`hb-banner ${b.enabled === false ? 'hb-banner--off' : ''}`}>
                <div className="hb-banner__media">
                  <ImageUpload value={b.image} onChange={v => updateBanner(b.id, { image: v })} id={`ob-img-${b.id}`} small />
                  <input
                    type="url"
                    className="form-input"
                    style={{ marginTop: 8 }}
                    value={b.image && !b.image.startsWith('data:') ? b.image : ''}
                    onChange={e => updateBanner(b.id, { image: e.target.value })}
                    placeholder="Or paste image URL"
                  />
                </div>
                <div className="hb-banner__fields">
                  <div className="form-group">
                    <label className="form-label">Title</label>
                    <input className="form-input" value={b.title} onChange={e => updateBanner(b.id, { title: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Subtitle</label>
                    <input className="form-input" value={b.subtitle || ''} onChange={e => updateBanner(b.id, { subtitle: e.target.value })} />
                  </div>
                  <div className="flex-group">
                    <div className="form-group">
                      <label className="form-label">Button Text</label>
                      <input className="form-input" value={b.cta || ''} onChange={e => updateBanner(b.id, { cta: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Link</label>
                      <input className="form-input" value={b.link || ''} onChange={e => updateBanner(b.id, { link: e.target.value })} placeholder="/shop" />
                    </div>
                  </div>
                  <div className="flex-group">
                    <div className="form-group">
                      <label className="form-label">Theme</label>
                      <select className="form-select" value={b.theme || 'green'} onChange={e => updateBanner(b.id, { theme: e.target.value })}>
                        {THEMES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                      </select>
                    </div>
                    <div className="form-group hb-banner__toggle-group">
                      <label className="form-label">Status</label>
                      <label className="hb-toggle">
                        <input type="checkbox" checked={b.enabled !== false} onChange={e => updateBanner(b.id, { enabled: e.target.checked })} />
                        <span className="hb-toggle__track"><span className="hb-toggle__thumb" /></span>
                        <span className="hb-toggle__label">{b.enabled !== false ? 'Live' : 'Hidden'}</span>
                      </label>
                    </div>
                  </div>
                  <button className="btn btn-sm btn-danger hb-banner__delete" onClick={() => removeBanner(b.id)}>Delete Banner</button>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="content-save-note">Changes save automatically and appear on the homepage instantly.</p>
      </div>
    </div>
  )
}
