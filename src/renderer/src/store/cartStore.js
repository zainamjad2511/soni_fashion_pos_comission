import { create } from 'zustand'

const LAST_SALESPERSON_KEY = 'pos_last_salesperson_id'

export const useCartStore = create((set, get) => ({
  // Active Sale State
  selectedSalesperson: null,
  items: [], // Array of { article_id, sku, name, wholesale_price_snapshot, retail_price_snapshot, quantity, discount_amount, max_stock }
  orderDiscount: 0,
  paymentMethod: 'cash',
  notes: '',
  exchangeReturnId: null,

  // Actions
  setSalesperson: (salesperson) => {
    if (salesperson?.id) {
      localStorage.setItem(LAST_SALESPERSON_KEY, String(salesperson.id))
    }
    set({ selectedSalesperson: salesperson })
  },

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

      const currentQty = Math.max(1, currentItem.quantity)
      const currentFinal = currentItem.final_amount_input === ''
        ? currentItem.retail_price_snapshot * currentQty
        : Number(currentItem.final_amount_input)
      const perPieceFinal = currentFinal / currentQty
      const subtotal = currentItem.retail_price_snapshot * newQty
      const newFinal = perPieceFinal * newQty

      updatedItems[existingIndex] = {
        ...currentItem,
        quantity: newQty,
        final_amount_input: currentItem.final_amount_input === '' ? '' : newFinal,
        discount_amount: currentItem.final_amount_input === '' ? 0 : Math.max(0, subtotal - newFinal),
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
        final_amount_input: Number(article.retail_price || 0),
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
          if (item.final_amount_input === '') {
            return { ...item, quantity: qty }
          }
          const currentQty = Math.max(1, Number(item.quantity) || 1)
          const currentFinal = Number(item.final_amount_input)
          const perPieceFinal = currentFinal / currentQty
          const subtotal = item.retail_price_snapshot * qty
          const newFinal = perPieceFinal * qty
          return {
            ...item,
            quantity: qty,
            final_amount_input: newFinal,
            discount_amount: Math.max(0, subtotal - newFinal),
          }
        }
        return item
      })
    }))
  },

  updateItemDiscount: (articleId, discountAmount) => {
    const disc = Number(discountAmount) || 0
    set((state) => ({
      items: state.items.map((item) => {
        if (item.article_id === articleId) {
          const subtotal = item.retail_price_snapshot * item.quantity
          return { ...item, discount_amount: disc, final_amount_input: subtotal - disc }
        }
        return item
      })
    }))
  },

  updateItemFinalAmount: (articleId, finalAmountInput) => {
    set((state) => ({
      items: state.items.map((item) => {
        if (item.article_id === articleId) {
          const subtotal = item.retail_price_snapshot * item.quantity
          if (finalAmountInput === '' || finalAmountInput === null || finalAmountInput === undefined) {
            return { ...item, final_amount_input: '', discount_amount: 0 }
          }
          const target = Number(finalAmountInput)
          if (isNaN(target)) {
            return item
          }
          const disc = subtotal - target
          return { ...item, final_amount_input: finalAmountInput, discount_amount: disc }
        }
        return item
      })
    }))
  },

  setOrderDiscount: (amount) => {
    if (amount === '' || amount === null || amount === undefined) {
      set({ orderDiscount: 0 })
      return
    }
    set({ orderDiscount: Math.max(0, Number(amount) || 0) })
  },

  setPaymentMethod: (method) => set({ paymentMethod: method }),
  setNotes: (notes) => set({ notes }),
  setExchangeReturnId: (id) => set({ exchangeReturnId: id }),

  clearCart: () =>
    set({
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
    return itemsDiscount + (Number(orderDiscount) || 0)
  },

  getGrandTotal: () => {
    const subtotal = get().getSubtotal()
    const totalDiscount = get().getTotalDiscount()
    return Math.max(0, subtotal - totalDiscount)
  }
}))
