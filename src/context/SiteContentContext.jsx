import { createContext, useContext, useState, useEffect } from 'react'

const SiteContentContext = createContext(null)

const STORAGE_KEY = 'nalamvaazha_sitecontent'

const DEFAULT_CONTENT = {
  hero: {
    badge: 'தினந்தோறும் ஆரோக்கியம்',
    titleLine1: 'GOOD 🌿 TASTE.',
    titleLine2: 'GOOD 😋 HEALTH.',
    description: '100% natural, homemade wellness products crafted with traditional recipes — delivered fresh to your family.',
    btnPrimary: 'Shop Collection →',
    btnSecondary: 'Our Story',
    mainImage: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=700&q=85',
    stats: [
      { number: '50+', label: 'Products' },
      { number: '2000+', label: 'Happy Families' },
      { number: '100%', label: 'Natural' },
    ],
    floatingPills: [
      { icon: '🥒', name: 'Pickles' },
      { icon: '🌶️', name: 'Podis' },
      { icon: '🫓', name: 'Appalams' },
      { icon: '🍃', name: 'Vathal' },
    ],
  },
  features: [
    { icon: '🏠', title: '100% Homemade', description: 'Prepared in small batches at home using traditional recipes passed down through generations.' },
    { icon: '🌿', title: 'Pure Ingredients', description: 'No preservatives, artificial colors or chemical additives. Just pure, natural goodness.' },
    { icon: '✨', title: 'Authentic Taste', description: 'Bringing you the genuine local flavours that remind you of your grandmother\'s kitchen.' },
  ],
  about: {
    badge: 'Our Journey',
    heroTitle: 'Traditional Roots',
    heroSubtitle: 'The story of Nalam Vaazha and our commitment to authentic homemade daily health.',
    sectionTitle: 'The Nalam Vaazha Story',
    sectionSubtitle: 'Founded on a simple belief: Good food starts at home.',
    paragraph1: 'Nalam Vaazha began in a small kitchen, where our founder set out to share the aromatic, handcrafted flavours of home-cooked daily health products with families who missed that authentic natural touch.',
    paragraph2: 'We believe that traditional recipes are more than just food; they are a heritage of love, patience and pure ingredients. That\'s why every product we sell is made in small batches, by hand, without any artificial additives or preservatives.',
    image: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=700&q=80',
    stats: [
      { number: '100%', label: 'Homemade' },
      { number: '50+', label: 'Recipes' },
      { number: '0', label: 'Preservatives' },
    ],
    values: [
      { icon: '👵', title: 'Heritage Recipes', description: 'Following authentic methods passed down through families for generations.' },
      { icon: '🌿', title: 'Pure & Natural', description: 'Sourcing the finest local ingredients and spices for genuine flavour.' },
      { icon: '❤️', title: 'Handcrafted Love', description: 'Small batch production ensures every pack meets our high quality standards.' },
    ],
    ctaTitle: 'Ready to Taste the Difference?',
    ctaSubtitle: 'Experience authentic homemade goodness delivered to your home.',
  },
  faq: {
    badge: 'Help Center',
    heroTitle: 'Frequently Asked Questions',
    heroSubtitle: 'Everything you need to know about our products and ordering process.',
    items: [
      { q: 'Are your products truly homemade?', a: 'Yes! Every single product in our catalog is prepared in a home kitchen by skilled home chefs who follow traditional recipes. We produce in small batches to ensure absolute freshness and authentic taste.' },
      { q: 'Do you use any preservatives?', a: 'No. We believe in pure, natural food. Our products are made using traditional preservation methods like sun-drying and natural pickling with oils and spices, ensuring they stay fresh naturally.' },
      { q: 'How long is the shelf life of your Podis and Appalams?', a: 'Generally, our Podis have a shelf life of 4-6 months, and sun-dried Appalams/Vathal can last up to 12 months if stored in a cool, dry place in airtight containers. Specific expiry dates are mentioned on each pack.' },
      { q: 'How do you deliver orders?', a: 'We partner with reliable courier services to deliver across India. Within Chennai, we offer faster local delivery options. All orders are packed securely to prevent breakage.' },
      { q: 'Can I customize the spice levels of my order?', a: 'While our standard batches follow consistent recipes, for bulk orders or specific needs, you can contact us via WhatsApp to see if customization is possible for the next batch.' },
      { q: 'How do I place an order?', a: 'Simply add items to your cart and click \'Order via WhatsApp\'. This will send your order details directly to us, and we\'ll confirm the payment and delivery details through chat.' },
    ],
  },
  contact: {
    badge: 'Support',
    heroTitle: 'Get in Touch',
    heroSubtitle: 'We\'d love to hear from you! Reach out for orders, queries or feedback.',
    phone: '+91 99999 99999',
    email: 'hello@nalamvaazha.in',
    address: '123 Traditional St, Mylapore,\nChennai, Tamil Nadu - 600004',
    hours: 'Mon-Sat, 9am-7pm',
  },
  footer: {
    tagline: 'தினந்தோறும் ஆரோக்கியம். Authentic homemade health & wellness products delivered fresh to your doorstep.',
    phone: '+91 99999 99999',
    email: 'hello@nalamvaazha.in',
    location: 'Chennai, Tamil Nadu',
    hours: 'Mon-Sat, 9am-7pm',
    instagramUrl: '#',
    facebookUrl: '#',
    whatsappUrl: 'https://wa.me/918778836682',
    copyrightExtra: 'All products are freshly made at home with natural ingredients.',
  },
  shop: {
    badge: 'Fresh & Healthy',
    heroTitle: 'Our Full Collection',
    heroSubtitle: 'Explore all our homemade delicacies in one place.',
  },
  cart: {
    heroTitle: 'Review Your Order',
    heroSubtitle: 'You\'re just one step away from authentic homemade goodness.',
  },
}

function loadContent() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      // Deep merge with defaults so new fields are always present
      return deepMerge(DEFAULT_CONTENT, parsed)
    }
  } catch {}
  return DEFAULT_CONTENT
}

function deepMerge(defaults, overrides) {
  const result = { ...defaults }
  for (const key of Object.keys(overrides)) {
    if (
      overrides[key] &&
      typeof overrides[key] === 'object' &&
      !Array.isArray(overrides[key]) &&
      defaults[key] &&
      typeof defaults[key] === 'object' &&
      !Array.isArray(defaults[key])
    ) {
      result[key] = deepMerge(defaults[key], overrides[key])
    } else {
      result[key] = overrides[key]
    }
  }
  return result
}

export function SiteContentProvider({ children }) {
  const [content, setContent] = useState(loadContent)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(content))
  }, [content])

  const updateSection = (section, data) => {
    setContent(prev => ({
      ...prev,
      [section]: typeof data === 'function' ? data(prev[section]) : data,
    }))
  }

  const resetSection = (section) => {
    setContent(prev => ({
      ...prev,
      [section]: DEFAULT_CONTENT[section],
    }))
  }

  const resetAll = () => {
    setContent(DEFAULT_CONTENT)
  }

  return (
    <SiteContentContext.Provider value={{ content, updateSection, resetSection, resetAll, DEFAULT_CONTENT }}>
      {children}
    </SiteContentContext.Provider>
  )
}

export const useSiteContent = () => {
  const ctx = useContext(SiteContentContext)
  if (!ctx) throw new Error('useSiteContent must be used within SiteContentProvider')
  return ctx
}
