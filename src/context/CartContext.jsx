import { createContext, useContext, useState, useEffect } from 'react'
import toast from 'react-hot-toast'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem('nalamvaazha_cart')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    localStorage.setItem('nalamvaazha_cart', JSON.stringify(items))
  }, [items])

  const addItem = (product, { openDrawer = true } = {}) => {
    const pid = product.id || product._id

    // Build a lightweight cart item — no base64 images or nested objects
    const imageUrl = product.images?.[0]?.url || product.image || ''
    const cartImage = imageUrl.startsWith('data:')
      ? 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&q=60'
      : imageUrl
    const catName = typeof product.category === 'object' ? product.category?.name : product.category

    setItems(prev => {
      const existing = prev.find(i => i.id === pid)
      if (existing) {
        toast.success(`${product.name} quantity updated!`)
        return prev.map(i =>
          i.id === pid ? { ...i, qty: i.qty + 1 } : i
        )
      }
      toast.success(`${product.name} added to cart!`)
      return [...prev, {
        id: pid,
        _id: pid,
        name: product.name,
        price: product.price,
        unit: product.unit || '',
        category: catName || '',
        image: cartImage,
        qty: 1
      }]
    })

    // Slide the mini-cart open so checkout is one continuous flow
    if (openDrawer) setIsOpen(true)
  }

  const removeItem = (id) => {
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const updateQty = (id, qty) => {
    if (qty <= 0) {
      removeItem(id)
      return
    }
    setItems(prev => prev.map(i => i.id === id ? { ...i, qty } : i))
  }

  const clearCart = () => setItems([])

  const totalItems = items.reduce((sum, i) => sum + i.qty, 0)
  const totalPrice = items.reduce((sum, i) => sum + i.price * i.qty, 0)

  return (
    <CartContext.Provider value={{
      items, addItem, removeItem, updateQty, clearCart,
      totalItems, totalPrice,
      isOpen, setIsOpen,
    }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
