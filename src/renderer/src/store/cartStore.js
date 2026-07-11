import { create } from 'zustand'

const LAST_SALESPERSON_KEY = 'pos_last_salesperson_id'

/** Per-piece selling price; empty string means use retail with no discount. */
export function getItemUnitFinalPrice(item) {
  const retail = Number(item.retail_price_snapshot || 0)
  if (item.final_amount_input === '' || item.final_amount_input === null || item.final_amount_input === undefined) {
    return retail
  }
  const unitFinal = Number(item.final_amount_input)
  return Number.isNaN(unitFinal) ? retail : unitFinal
}

export function computeItemLineTotals(item) {
  const retail = Number(item.retail_price_snapshot || 0)
  const qty = Math.max(1, Number(item.quantity) || 1)
  const unitFinal = getItemUnitFinalPrice(item)
  const lineSubtotal = retail * qty
  const lineTotal = unitFinal * qty
  const discountAmount = Math.max(0, lineSubtotal - lineTotal)
  const unitDiscount = Math.max(0, retail - unitFinal)

  return { retail, qty, unitFinal, lineSubtotal, lineTotal, discountAmount, unitDiscount }
}

function withRecalculatedDiscount(item) {
  const { discountAmount } = computeItemLineTotals(item)
  return { ...item, discount_amount: discountAmount }
}

export const useCartStore = create((set, get) => ({
  // Active Sale State
  selectedSalesperson: null,
  items: [], // { article_id, sku, name, retail_price_snapshot, quantity, final_amount_input (per unit), discount_amount, ... }
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
      const updatedItems = [...items]
      const currentItem = updatedItems[existingIndex]
      const newQty = currentItem.quantity + 1

      if (newQty > currentItem.max_stock) {
        throw new Error(`Cannot add more "${article.name}". Max available stock is ${currentItem.max_stock}.`)
      }

      const nextItem = withRecalculatedDiscount({ ...currentItem, quantity: newQty })
      updatedItems[existingIndex] = nextItem
      set({ items: updatedItems })
    } else {
      if (article.quantity <= 0) {
        throw new Error(`Article "${article.name}" is out of stock!`)
      }

      const retail = Number(article.retail_price || 0)
      const newItem = {
        article_id: article.id,
        sku: article.sku,
        name: article.name,
        wholesale_price_snapshot: Number(article.wholesale_price || 0),
        retail_price_snapshot: retail,
        quantity: 1,
        discount_amount: 0,
        final_amount_input: retail,
        max_stock: Number(article.quantity || 0),
      }
      set({ items: [...items, newItem] })
    }
  },

  removeItem: (articleId) => {
    set((state) => ({
      items: state.items.filter((i) => i.article_id !== articleId),
    }))
  },

  updateQuantity: (articleId, quantity) => {
    // Allow empty string while typing (e.g. backspace) — never auto-remove the line.
    if (quantity === '' || quantity === null || quantity === undefined) {
      set((state) => ({
        items: state.items.map((item) =>
          item.article_id === articleId ? { ...item, quantity: '' } : item
        ),
      }))
      return
    }

    const qty = parseInt(quantity, 10)
    if (isNaN(qty) || qty <= 0) {
      set((state) => ({
        items: state.items.map((item) =>
          item.article_id === articleId ? { ...item, quantity: '' } : item
        ),
      }))
      return
    }

    set((state) => ({
      items: state.items.map((item) => {
        if (item.article_id !== articleId) return item
        if (qty > item.max_stock) {
          throw new Error(`Quantity exceeds available stock (${item.max_stock}).`)
        }
        return withRecalculatedDiscount({ ...item, quantity: qty })
      }),
    }))
  },

  /** Clamp empty/invalid qty back to 1 on blur — still never removes the line. */
  commitQuantity: (articleId) => {
    set((state) => ({
      items: state.items.map((item) => {
        if (item.article_id !== articleId) return item
        let qty = parseInt(item.quantity, 10)
        if (isNaN(qty) || qty <= 0) qty = 1
        if (qty > item.max_stock) qty = item.max_stock
        return withRecalculatedDiscount({ ...item, quantity: Math.max(1, qty) })
      }),
    }))
  },

  updateItemDiscount: (articleId, discountAmount) => {
    const lineDisc = Number(discountAmount) || 0
    set((state) => ({
      items: state.items.map((item) => {
        if (item.article_id !== articleId) return item
        const qty = Math.max(1, Number(item.quantity) || 1)
        const retail = item.retail_price_snapshot
        const unitFinal = Math.max(0, retail - lineDisc / qty)
        return withRecalculatedDiscount({
          ...item,
          final_amount_input: unitFinal,
        })
      }),
    }))
  },

  updateItemFinalAmount: (articleId, finalAmountInput) => {
    set((state) => ({
      items: state.items.map((item) => {
        if (item.article_id !== articleId) return item

        if (finalAmountInput === '' || finalAmountInput === null || finalAmountInput === undefined) {
          return withRecalculatedDiscount({ ...item, final_amount_input: '' })
        }

        const unitFinal = Number(finalAmountInput)
        if (Number.isNaN(unitFinal)) return item

        return withRecalculatedDiscount({
          ...item,
          final_amount_input: finalAmountInput,
        })
      }),
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
      exchangeReturnId: null,
    }),

  getSubtotal: () => {
    const { items } = get()
    return items.reduce((sum, item) => sum + computeItemLineTotals(item).lineSubtotal, 0)
  },

  getTotalDiscount: () => {
    const { items, orderDiscount } = get()
    const itemsDiscount = items.reduce((sum, item) => sum + computeItemLineTotals(item).discountAmount, 0)
    return itemsDiscount + (Number(orderDiscount) || 0)
  },

  getGrandTotal: () => {
    const subtotal = get().getSubtotal()
    const totalDiscount = get().getTotalDiscount()
    return Math.max(0, subtotal - totalDiscount)
  },
}))
