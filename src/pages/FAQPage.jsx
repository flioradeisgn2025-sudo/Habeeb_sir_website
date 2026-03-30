import { useState } from 'react'
import { useSiteContent } from '../context/SiteContentContext'

export default function FAQPage() {
  const { content } = useSiteContent()
  const faq = content.faq
  const footer = content.footer

  const [openIndex, setOpenIndex] = useState(0)

  return (
    <div className="faq-page">
      <header className="page-hero">
        <div className="container">
          <span className="badge badge-saffron">{faq.badge}</span>
          <h1>{faq.heroTitle.split(' ').slice(0, -1).join(' ')} <span className="text-gradient">{faq.heroTitle.split(' ').slice(-1)}</span></h1>
          <p>{faq.heroSubtitle}</p>
        </div>
      </header>

      <section className="section container">
        <div className="section-header" style={{ textAlign: 'center' }}>
          <h2>Got <span className="text-gradient">Questions?</span></h2>
          <p>We've gathered answers to the most common queries below.</p>
        </div>

        <div className="faq-list" style={{ maxWidth: '800px', margin: '0 auto' }}>
          {faq.items.map((item, idx) => (
            <div
              key={idx}
              className={`accordion-item ${openIndex === idx ? 'open' : ''}`}
              onClick={() => setOpenIndex(openIndex === idx ? -1 : idx)}
            >
              <div className="accordion-header">
                {item.q}
                <span className="accordion-chevron">▼</span>
              </div>
              <div className="accordion-body">
                {item.a}
              </div>
            </div>
          ))}
        </div>

        <div className="faq-footer section-sm" style={{ textAlign: 'center', marginTop: '40px' }}>
          <p style={{ color: 'var(--gray)', marginBottom: '20px' }}>Still have questions?</p>
          <a href={footer.whatsappUrl} target="_blank" rel="noreferrer" className="btn btn-secondary">
            Chat with us on WhatsApp
          </a>
        </div>
      </section>
    </div>
  )
}
