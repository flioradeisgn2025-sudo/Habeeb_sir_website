import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { SEED_PRODUCTS } from '../data/products'
import { CATEGORIES } from '../data/categories'

const ProductContext = createContext(null)

const STORAGE_KEY = 'nalamvaazha_products'
const CAT_STORAGE_KEY = 'nalamvaazha_categories'
const DATA_VERSION_KEY = 'nalamvaazha_data_version'
const CURRENT_DATA_VERSION = 4 // bump this to force clients to drop stale local caches

const API_TIMEOUT = 15000 // generous so serverless cold starts don't read as offline

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

// Extract a human-readable message from an axios error
function errMessage(err, fallback) {
  return err?.response?.data?.message || err?.message || fallback
}

// Only 24-hex Mongo ObjectIds exist on the server. Demo ids ("ap-001") and
// offline ids ("local-...") must never be sent to the API.
function isDbId(id) {
  return /^[0-9a-f]{24}$/i.test(String(id))
}

export function ProductProvider({ children }) {
  const [allProducts, setAllProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [isApiOnline, setIsApiOnline] = useState(false)

  // Cache to localStorage so the site paints instantly on the next visit and
  // still works offline. The API remains the source of truth.
  useEffect(() => {
    if (allProducts.length > 0) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(allProducts)) } catch {}
    }
  }, [allProducts])

  useEffect(() => {
    if (categories.length > 0) {
      try { localStorage.setItem(CAT_STORAGE_KEY, JSON.stringify(categories)) } catch {}
    }
  }, [categories])

  const fetchData = useCallback(async () => {
    setLoading(true)

    // Paint instantly from the local cache (if it isn't from an old app
    // version), then refresh from the API below.
    const savedVersion = Number(localStorage.getItem(DATA_VERSION_KEY)) || 0
    const isStale = savedVersion < CURRENT_DATA_VERSION
    const localProducts = isStale ? null : loadLocalProducts()
    const localCategories = isStale ? null : loadLocalCategories()
    const hasLocal = !!(localProducts && localProducts.length > 0)

    if (hasLocal) {
      setAllProducts(localProducts)
      setCategories(localCategories || buildStaticCategories())
      setLoading(false)
    }

    // The API/database is the source of truth: always fetch and overwrite the
    // local cache so admin changes reach every browser and device.
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        axios.get('/api/products', { timeout: API_TIMEOUT }),
        axios.get('/api/categories', { timeout: API_TIMEOUT })
      ])
      const apiProducts = productsRes.data.data || []
      const apiCategories = categoriesRes.data.data || []
      setIsApiOnline(true)

      // The server answered, so the database is the source of truth — even
      // when it's empty. (The demo catalog is only for offline/no-backend use;
      // showing it here would resurrect products the admin deleted.)
      setAllProducts(apiProducts)
      setCategories(apiCategories.length ? apiCategories : buildStaticCategories())
      if (apiProducts.length === 0) {
        try { localStorage.removeItem(STORAGE_KEY) } catch {}
      }
      localStorage.setItem(DATA_VERSION_KEY, String(CURRENT_DATA_VERSION))
    } catch {
      console.warn('MongoDB API unreachable, using local/static data.')
      setIsApiOnline(false)
      if (!hasLocal) {
        const staticCategories = buildStaticCategories()
        setCategories(staticCategories)
        setAllProducts(buildStaticProducts(staticCategories))
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
  // Every operation saves to the API first (when reachable) and only updates
  // local state from the server's response, so the website always reflects
  // what is actually in the database. Offline, changes are kept locally so a
  // demo without a backend still works.

  const getProductId = (p) => p._id || p.id

  const buildImagePayload = (mainImage, extraImages) =>
    [mainImage, ...(extraImages || [])].filter(Boolean).map((url, i) => ({ url, isPrimary: i === 0 }))

  // Send the selected category's details along with its id/slug so the server
  // can create it on the fly if it isn't in the database yet (demo categories).
  const buildCategoryData = (categoryRef) => {
    const cat = categories.find(c => (c._id || c.slug) === categoryRef)
    if (!cat) return undefined
    return {
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
      image: cat.image?.url || '',
    }
  }

  const addProduct = async (productData) => {
    if (isApiOnline) {
      try {
        const payload = {
          name: productData.name,
          description: productData.description,
          category: productData.category,
          categoryData: buildCategoryData(productData.category),
          price: Number(productData.price),
          salePrice: productData.salePrice ? Number(productData.salePrice) : null,
          stock: Number(productData.stock) || 0,
          unit: productData.unit || '',
          ingredients: productData.ingredients || '',
          images: buildImagePayload(productData.image, productData.extraImages),
        }
        const res = await axios.post('/api/admin/products', payload, { timeout: API_TIMEOUT })
        const created = res.data.data
        setAllProducts(prev => [created, ...prev])
        return { ok: true }
      } catch (err) {
        return { ok: false, message: errMessage(err, 'Could not save product to the server') }
      }
    }

    // Offline fallback — local-only product
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
    setAllProducts(prev => [newProduct, ...prev])
    return { ok: true, offline: true }
  }

  const updateProduct = async (id, updates) => {
    if (isApiOnline && isDbId(id)) {
      try {
        const payload = {
          name: updates.name,
          description: updates.description,
          ingredients: updates.ingredients,
          category: updates.category,
          categoryData: buildCategoryData(updates.category),
          price: updates.price,
          salePrice: updates.salePrice === '' ? null : updates.salePrice,
          stock: updates.stock,
          images: updates.image ? buildImagePayload(updates.image, updates.extraImages) : undefined,
        }
        const res = await axios.put(`/api/admin/products/${id}`, payload, { timeout: API_TIMEOUT })
        const updated = res.data.data
        setAllProducts(prev => prev.map(p => (getProductId(p) === id ? updated : p)))
        return { ok: true }
      } catch (err) {
        return { ok: false, message: errMessage(err, 'Could not update product on the server') }
      }
    }

    // Offline fallback — local-only update
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
    return { ok: true, offline: true }
  }

  const deleteProduct = async (id) => {
    if (isApiOnline && isDbId(id)) {
      try {
        await axios.delete(`/api/admin/products/${id}`, { timeout: API_TIMEOUT })
      } catch (err) {
        return { ok: false, message: errMessage(err, 'Could not delete product on the server') }
      }
    }
    setAllProducts(prev => prev.filter(p => getProductId(p) !== id))
    return { ok: true }
  }

  const togglePublish = async (id) => {
    if (isApiOnline && isDbId(id)) {
      try {
        const res = await axios.patch(`/api/admin/products/${id}/toggle`, {}, { timeout: API_TIMEOUT })
        const updated = res.data.data
        setAllProducts(prev => prev.map(p => (getProductId(p) === id ? updated : p)))
        return { ok: true }
      } catch (err) {
        return { ok: false, message: errMessage(err, 'Could not update visibility on the server') }
      }
    }
    setAllProducts(prev => prev.map(p => {
      if (getProductId(p) !== id) return p
      return { ...p, isPublished: !p.isPublished }
    }))
    return { ok: true }
  }

  // One-time bootstrap: copy the built-in demo catalog into the database so
  // the products the admin sees are real, editable and deletable. The server
  // refuses the import if the database has ever held a product, so this can
  // never resurrect anything the admin deleted.
  const importDemoCatalog = async () => {
    const staticCategories = buildStaticCategories()
    const products = SEED_PRODUCTS.map(p => {
      const cat = staticCategories.find(c => c.slug === p.category)
      return {
        name: p.name,
        description: p.description,
        category: p.category,
        categoryData: cat ? {
          name: cat.name,
          slug: cat.slug,
          description: cat.description || '',
          image: cat.image?.url || '',
        } : { name: p.category },
        price: p.price,
        stock: 100,
        unit: p.unit || '',
        ingredients: p.ingredients || '',
        badge: p.badge || null,
        images: (p.images || [p.image]).filter(Boolean).map((url, i) => ({ url, isPrimary: i === 0 })),
      }
    })
    const res = await axios.post('/api/admin/products/import', { products }, { timeout: 60000 })
    const imported = res.data?.data?.imported || 0
    if (imported > 0) await fetchData()
    return imported
  }

  // ── Category CRUD ──────────────────────────────────────

  const addCategory = async (catData) => {
    if (isApiOnline) {
      try {
        const res = await axios.post('/api/admin/categories', catData, { timeout: API_TIMEOUT })
        setCategories(prev => [...prev, res.data.data])
        return { ok: true }
      } catch (err) {
        return { ok: false, message: errMessage(err, 'Could not save category to the server') }
      }
    }
    const newCat = {
      _id: 'cat-' + Date.now(),
      name: catData.name,
      slug: catData.slug || catData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
      description: catData.description || '',
      image: { url: catData.image || '' },
      displayOrder: categories.length,
    }
    setCategories(prev => [...prev, newCat])
    return { ok: true, offline: true }
  }

  const updateCategory = async (id, updates) => {
    if (isApiOnline && !String(id).startsWith('cat-')) {
      try {
        const res = await axios.put(`/api/admin/categories/${id}`, updates, { timeout: API_TIMEOUT })
        const updated = res.data.data
        setCategories(prev => prev.map(c => ((c._id || c.slug) === id ? updated : c)))
        return { ok: true }
      } catch (err) {
        return { ok: false, message: errMessage(err, 'Could not update category on the server') }
      }
    }
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
    return { ok: true, offline: true }
  }

  const deleteCategory = async (id) => {
    if (isApiOnline && !String(id).startsWith('cat-')) {
      try {
        await axios.delete(`/api/admin/categories/${id}`, { timeout: API_TIMEOUT })
      } catch (err) {
        return { ok: false, message: errMessage(err, 'Could not delete category on the server') }
      }
    }
    setCategories(prev => prev.filter(c => (c._id || c.slug) !== id))
    return { ok: true }
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
      addProduct, updateProduct, deleteProduct, togglePublish, importDemoCatalog,
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
