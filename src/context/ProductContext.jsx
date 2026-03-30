import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { SEED_PRODUCTS } from '../data/products'
import { CATEGORIES } from '../data/categories'

const ProductContext = createContext(null)

const STORAGE_KEY = 'nalamvaazha_products'
const CAT_STORAGE_KEY = 'nalamvaazha_categories'
const DATA_VERSION_KEY = 'nalamvaazha_data_version'
const CURRENT_DATA_VERSION = 2 // bump this to force re-seed

const BASE = import.meta.env.BASE_URL

function resolveAsset(path) {
  if (!path || path.startsWith('http') || path.startsWith('data:')) return path
  return `${BASE}${path.replace(/^\//, '')}`
}

function buildStaticCategories() {
  return CATEGORIES.map(c => ({
    _id: c.id,
    name: c.label,
    slug: c.id,
    description: c.description,
    image: { url: resolveAsset(c.image) }
  }))
}

function buildStaticProducts(staticCategories) {
  return SEED_PRODUCTS.map(p => ({
    _id: p.id,
    id: p.id,
    name: p.name,
    category: staticCategories.find(c => c.slug === p.category) || p.category,
    price: p.price,
    unit: p.unit,
    description: p.description,
    ingredients: p.ingredients || '',
    images: (p.images || [p.image]).map(url => ({ url })),
    image: p.image,
    stock: 100,
    badge: p.badge,
    isNew: p.isNew,
    isPublished: true,
    createdAt: new Date().toISOString()
  }))
}

function loadLocalProducts() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

function loadLocalCategories() {
  try {
    const saved = localStorage.getItem(CAT_STORAGE_KEY)
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

export function ProductProvider({ children }) {
  const [allProducts, setAllProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [isApiOnline, setIsApiOnline] = useState(false)

  // Persist products to localStorage whenever they change
  useEffect(() => {
    if (allProducts.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allProducts))
    }
  }, [allProducts])

  useEffect(() => {
    if (categories.length > 0) {
      localStorage.setItem(CAT_STORAGE_KEY, JSON.stringify(categories))
    }
  }, [categories])

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [productsRes, categoriesRes] = await Promise.all([
        axios.get('/api/products', { timeout: 1000 }),
        axios.get('/api/categories', { timeout: 1000 })
      ])

      setAllProducts(productsRes.data.data)
      setCategories(categoriesRes.data.data)
      setIsApiOnline(true)
    } catch {
      console.warn('MongoDB API unreachable, using local data.')
      setIsApiOnline(false)

      // Check if cached data is stale (old version)
      const savedVersion = Number(localStorage.getItem(DATA_VERSION_KEY)) || 0
      const isStale = savedVersion < CURRENT_DATA_VERSION

      const localProducts = isStale ? null : loadLocalProducts()
      const localCategories = isStale ? null : loadLocalCategories()

      if (localProducts && localProducts.length > 0) {
        setAllProducts(localProducts)
        setCategories(localCategories || buildStaticCategories())
      } else {
        // Re-seed from static data
        const staticCategories = buildStaticCategories()
        const staticProducts = buildStaticProducts(staticCategories)
        setCategories(staticCategories)
        setAllProducts(staticProducts)
        localStorage.setItem(DATA_VERSION_KEY, String(CURRENT_DATA_VERSION))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ── CRUD Operations ──────────────────────────────────────

  const getProductId = (p) => p._id || p.id

  const addProduct = (productData) => {
    const extraImages = (productData.extraImages || []).filter(Boolean)
    const allImages = [productData.image, ...extraImages].filter(Boolean).map(url => ({ url }))
    const newProduct = {
      _id: 'local-' + Date.now(),
      id: 'local-' + Date.now(),
      name: productData.name,
      category: categories.find(c => (c._id || c.slug) === productData.category) || productData.category,
      price: Number(productData.price),
      salePrice: productData.salePrice ? Number(productData.salePrice) : undefined,
      unit: productData.unit || '',
      description: productData.description,
      ingredients: productData.ingredients || '',
      images: allImages.length ? allImages : [{ url: productData.image }],
      image: productData.image,
      stock: Number(productData.stock) || 100,
      badge: null,
      isNew: true,
      isPublished: true,
      isAdmin: true,
      createdAt: new Date().toISOString()
    }

    // Instant local update
    setAllProducts(prev => [...prev, newProduct])

    // Sync to API in background
    if (isApiOnline) {
      const payload = {
        ...productData,
        price: Number(productData.price),
        stock: Number(productData.stock),
        images: [{ url: productData.image, publicId: 'dummy', isPrimary: true }],
        slug: productData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
      }
      axios.post('/api/admin/products', payload, { timeout: 3000 }).catch(() => {})
    }
    return true
  }

  const updateProduct = (id, updates) => {
    // Instant local update
    setAllProducts(prev => prev.map(p => {
      if (getProductId(p) !== id) return p
      const updatedCategory = categories.find(c => (c._id || c.slug) === updates.category) || p.category
      const extraImages = (updates.extraImages || []).filter(Boolean)
      const mainImg = updates.image || p.image
      const allImgs = updates.image
        ? [mainImg, ...extraImages].filter(Boolean).map(url => ({ url }))
        : p.images
      return {
        ...p,
        name: updates.name || p.name,
        price: updates.price ? Number(updates.price) : p.price,
        salePrice: updates.salePrice ? Number(updates.salePrice) : p.salePrice,
        stock: updates.stock !== undefined ? Number(updates.stock) : p.stock,
        description: updates.description || p.description,
        ingredients: updates.ingredients !== undefined ? updates.ingredients : (p.ingredients || ''),
        category: updatedCategory,
        images: allImgs,
        image: mainImg,
      }
    }))

    // Sync to API in background
    if (isApiOnline) {
      const payload = {
        name: updates.name,
        price: Number(updates.price),
        salePrice: updates.salePrice ? Number(updates.salePrice) : undefined,
        stock: Number(updates.stock),
        description: updates.description,
        category: updates.category,
        images: [{ url: updates.image, publicId: 'dummy', isPrimary: true }]
      }
      axios.patch(`/api/admin/products/${id}`, payload, { timeout: 3000 }).catch(() => {})
    }
    return true
  }

  const deleteProduct = (id) => {
    // Instant local delete
    setAllProducts(prev => prev.filter(p => getProductId(p) !== id))

    // Sync to API in background
    if (isApiOnline) {
      axios.delete(`/api/admin/products/${id}`, { timeout: 3000 }).catch(() => {})
    }
    return true
  }

  const togglePublish = (id) => {
    // Instant local toggle
    setAllProducts(prev => prev.map(p => {
      if (getProductId(p) !== id) return p
      return { ...p, isPublished: !p.isPublished }
    }))

    // Sync to API in background
    if (isApiOnline) {
      axios.patch(`/api/admin/products/${id}/toggle`, {}, { timeout: 3000 }).catch(() => {})
    }
    return true
  }

  // ── Category CRUD ──────────────────────────────────────

  const addCategory = (catData) => {
    const newCat = {
      _id: 'cat-' + Date.now(),
      name: catData.name,
      slug: catData.slug || catData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
      description: catData.description || '',
      image: { url: catData.image || '' },
      displayOrder: categories.length,
    }
    setCategories(prev => [...prev, newCat])
    if (isApiOnline) {
      axios.post('/api/admin/categories', catData, { timeout: 3000 }).catch(() => {})
    }
    return true
  }

  const updateCategory = (id, updates) => {
    setCategories(prev => prev.map(c => {
      const cid = c._id || c.slug
      if (cid !== id) return c
      return {
        ...c,
        name: updates.name || c.name,
        slug: updates.slug || c.slug,
        description: updates.description !== undefined ? updates.description : c.description,
        image: updates.image ? { url: updates.image } : c.image,
      }
    }))
    if (isApiOnline) {
      axios.patch(`/api/admin/categories/${id}`, updates, { timeout: 3000 }).catch(() => {})
    }
    return true
  }

  const deleteCategory = (id) => {
    setCategories(prev => prev.filter(c => (c._id || c.slug) !== id))
    if (isApiOnline) {
      axios.delete(`/api/admin/categories/${id}`, { timeout: 3000 }).catch(() => {})
    }
    return true
  }

  // ── Query Helpers ──────────────────────────────────────

  const getByCategory = (categoryId) =>
    allProducts.filter(p => p.category && p.category.slug === categoryId)

  const getNewArrivals = (limit = 8) => {
    const sorted = [...allProducts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    return sorted.slice(0, limit)
  }

  const getBestSellers = (limit = 4) => {
    return allProducts.filter(p => p.badge && p.badge.toLowerCase().includes('best')).slice(0, limit)
  }

  const getProductById = (id) => allProducts.find(p => (p._id || p.id) === id)

  const getAllProducts = () => allProducts

  return (
    <ProductContext.Provider value={{
      allProducts, categories, loading, isApiOnline,
      getByCategory, getNewArrivals, getBestSellers, getAllProducts, getProductById,
      addProduct, updateProduct, deleteProduct, togglePublish,
      addCategory, updateCategory, deleteCategory,
      refreshData: fetchData
    }}>
      {children}
    </ProductContext.Provider>
  )
}

export const useProducts = () => {
  const ctx = useContext(ProductContext)
  if (!ctx) throw new Error('useProducts must be used within ProductProvider')
  return ctx
}
