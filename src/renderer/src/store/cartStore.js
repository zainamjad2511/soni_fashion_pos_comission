import { create } from 'zustand'

export const useCartStore = create((set, get) => ({
  // Active Sale State
  selectedSalesperson: null,
  items: [], // Array of { article_id, sku, name, wholesale_price_snapshot, retail_price_snapshot, quantity, discount_amount, max_stock }
  orderDiscount: 0,
  paymentMethod: 'cash',
  notes: '',
  exchangeReturnId: null,

  // Actions
  setSalesperson: (salesperson) => set({ selectedSalesperson: salesperson }),

  addItem: (article) => {
    const { items } = get()
    const existingIndex = items.findIndex((i) => i.article_id === article.id)

    if (existingIndex > -1) {
      // Item already exists, increment quantity if stock permits
      const updatedItems = [...items]
      const currentItem = updatedItems[existingIndex]
      const newQty = currentItem.quantity + 1

      if (newQty > currentItem.max_stock) {
        throw new Error(`Cannot add more "${article.name}". Max available stock is ${currentItem.max_stock}.`)
      }

      updatedItems[existingIndex] = {
        ...currentItem,
        quantity: newQty
      }
      set({ items: updatedItems })
    } else {
      // New item
      if (article.quantity <= 0) {
        throw new Error(`Article "${article.name}" is out of stock!`)
      }

      const newItem = {
        article_id: article.id,
        sku: article.sku,
        name: article.name,
        wholesale_price_snapshot: Number(article.wholesale_price || 0),
        retail_price_snapshot: Number(article.retail_price || 0),
        quantity: 1,
        discount_amount: 0,
        max_stock: Number(article.quantity || 0)
      }
      set({ items: [...items, newItem] })
    }
  },

  removeItem: (articleId) => {
    set((state) => ({
      items: state.items.filter((i) => i.article_id !== articleId)
    }))
  },

  updateQuantity: (articleId, quantity) => {
    const qty = parseInt(quantity, 10)
    if (isNaN(qty) || qty <= 0) {
      get().removeItem(articleId)
      return
    }

    set((state) => ({
      items: state.items.map((item) => {
        if (item.article_id === articleId) {
          if (qty > item.max_stock) {
            throw new Error(`Quantity exceeds available stock (${item.max_stock}).`)
          }
          return { ...item, quantity: qty }
        }
        return item
      })
    }))
  },

  updateItemDiscount: (articleId, discountAmount) => {
    const disc = Math.max(0, Number(discountAmount) || 0)
    set((state) => ({
      items: state.items.map((item) => {
        if (item.article_id === articleId) {
          const maxDisc = item.retail_price_snapshot * item.quantity
          if (disc > maxDisc) {
            throw new Error(`Line discount cannot exceed line subtotal (Rs. ${maxDisc}).`)
          }
          return { ...item, discount_amount: disc }
        }
        return item
      })
    }))
  },

  setOrderDiscount: (amount) => {
    const disc = Math.max(0, Number(amount) || 0)
    set({ orderDiscount: disc })
  },

  setPaymentMethod: (method) => set({ paymentMethod: method }),
  setNotes: (notes) => set({ notes }),
  setExchangeReturnId: (id) => set({ exchangeReturnId: id }),

  clearCart: () =>
    set({
      selectedSalesperson: null,
      items: [],
      orderDiscount: 0,
      paymentMethod: 'cash',
      notes: '',
      exchangeReturnId: null
    }),

  // Getters / Computed Helpers
  getSubtotal: () => {
    const { items } = get()
    return items.reduce((sum, item) => sum + item.retail_price_snapshot * item.quantity, 0)
  },

  getTotalDiscount: () => {
    const { items, orderDiscount } = get()
    const itemsDiscount = items.reduce((sum, item) => sum + (item.discount_amount || 0), 0)
    return itemsDiscount + orderDiscount
  },

  getGrandTotal: () => {
    const subtotal = get().getSubtotal()
    const totalDiscount = get().getTotalDiscount()
    return Math.max(0, subtotal - totalDiscount)
  }
}))
