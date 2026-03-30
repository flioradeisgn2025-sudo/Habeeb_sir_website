import { Link } from 'react-router-dom'
import { useSiteContent } from '../context/SiteContentContext'

export default function AboutUsPage() {
  const { content } = useSiteContent()
  const about = content.about

  return (
    <div className="about-page">
      <header className="page-hero">
        <div className="container">
          <span className="badge badge-saffron">{about.badge}</span>
          <h1>{about.heroTitle.split(' ').slice(0, -1).join(' ')} <span className="text-gradient">{about.heroTitle.split(' ').slice(-1)}</span></h1>
          <p>{about.heroSubtitle}</p>
        </div>
      </header>

      <section className="section container">
        <div className="section-header">
          <h2>{about.sectionTitle.split(' ').slice(0, 1).join(' ')} <span className="text-lime">{about.sectionTitle.split(' ').slice(1).join(' ')}</span></h2>
          <p>{about.sectionSubtitle}</p>
        </div>

        <div className="about-content" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', alignItems: 'center' }}>
          <div className="about-text">
            <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>{about.paragraph1}</p>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>{about.paragraph2}</p>
            <div className="about-stats" style={{ display: 'flex', gap: '40px', marginTop: '40px' }}>
              {about.stats.map((stat, i) => (
                <div key={i}>
                  <h3 style={{ fontSize: '2.5rem', color: 'var(--green-600)' }}>{stat.number}</h3>
                  <p style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="about-image-wrap">
            <img src={about.image} alt="Handmade Food" style={{ width: '100%', borderRadius: '24px', boxShadow: 'var(--shadow-md)' }} />
          </div>
        </div>
      </section>

      <section className="section bg-cream-2">
        <div className="container text-center" style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '2.2rem', marginBottom: '40px' }}>Our <span className="text-gradient">Values</span></h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px' }}>
            {about.values.map((v, i) => (
              <div key={i} className="glass-card" style={{ padding: '30px', textAlign: 'center' }}>
                <span style={{ fontSize: '40px', display: 'block', marginBottom: '20px' }}>{v.icon}</span>
                <h3 style={{ marginBottom: '16px' }}>{v.title}</h3>
                <p style={{ color: 'var(--text-secondary)' }}>{v.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section container" style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: '2.2rem', marginBottom: '20px' }}>{about.ctaTitle.split(' ').slice(0, 2).join(' ')} <span className="text-gradient">{about.ctaTitle.split(' ').slice(2).join(' ')}</span></h2>
        <p style={{ marginBottom: '40px', color: 'var(--text-secondary)', fontSize: '1.2rem' }}>{about.ctaSubtitle}</p>
        <Link to="/shop" className="btn btn-primary btn-lg">Shop Our Collection</Link>
      </section>
    </div>
  )
}
