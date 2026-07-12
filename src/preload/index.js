import { contextBridge, ipcRenderer, webFrame } from 'electron'
import { electronAPI as toolkitElectronAPI } from '@electron-toolkit/preload'

// Apply Global UI Scaling (Option B: Electron Native Zoom)
// Uniformly scale the entire Chromium renderer instance by 18% for improved desktop legibility
try {
  webFrame.setZoomFactor(1.18)
} catch (err) {
  console.warn('[Preload] Could not apply initial zoom factor:', err)
}

// Soni Fashion POS Domain IPC Bridge Contract
const customElectronAPI = {
  ...toolkitElectronAPI,

  articles: {
    list: (filters) => ipcRenderer.invoke('articles:list', filters),
    get: (id) => ipcRenderer.invoke('articles:get', id),
    getBySku: (sku) => ipcRenderer.invoke('articles:getBySku', sku),
    search: (query) => ipcRenderer.invoke('articles:search', query),
    create: (data) => ipcRenderer.invoke('articles:create', data),
    update: (id, data) => ipcRenderer.invoke('articles:update', id, data),
    toggleActive: (id, status) => ipcRenderer.invoke('articles:toggleActive', id, status),
    adjustStock: (payload) => ipcRenderer.invoke('articles:adjustStock', payload),
    getStockMovements: (articleId) => ipcRenderer.invoke('articles:getStockMovements', articleId)
  },

  suppliers: {
    list: (filters) => ipcRenderer.invoke('suppliers:list', filters),
    get: (id) => ipcRenderer.invoke('suppliers:get', id),
    create: (data) => ipcRenderer.invoke('suppliers:create', data),
    update: (id, data) => ipcRenderer.invoke('suppliers:update', id, data),
    toggleActive: (id, status) => ipcRenderer.invoke('suppliers:toggleActive', id, status)
  },

  sales: {
    list: (filters) => ipcRenderer.invoke('sales:list', filters),
    get: (idOrInvoice) => ipcRenderer.invoke('sales:get', idOrInvoice),
    create: (payload) => ipcRenderer.invoke('sales:create', payload),
    void: (id, reason) => ipcRenderer.invoke('sales:void', id, reason),
    reprint: (invoiceNo) => ipcRenderer.invoke('sales:reprint', invoiceNo)
  },

  returns: {
    lookupSale: (invoiceNo) => ipcRenderer.invoke('returns:lookupSale', invoiceNo),
    lookupBySku: (term) => ipcRenderer.invoke('returns:lookupBySku', term),
    list: (filters) => ipcRenderer.invoke('returns:list', filters),
    get: (idOrNumber) => ipcRenderer.invoke('returns:get', idOrNumber),
    create: (payload) => ipcRenderer.invoke('returns:create', payload),
    void: (id, reason) => ipcRenderer.invoke('returns:void', id, reason)
  },

  reports: {
    salesSummary: (filters) => ipcRenderer.invoke('reports:salesSummary', filters),
    profitSummary: (filters) => ipcRenderer.invoke('reports:profitSummary', filters),
    commissionSummary: (filters) => ipcRenderer.invoke('reports:commissionSummary', filters),
    markCommissionPaid: (filters) => ipcRenderer.invoke('reports:markCommissionPaid', filters),
    inventoryValuation: () => ipcRenderer.invoke('reports:inventoryValuation'),
    topArticles: (filters) => ipcRenderer.invoke('reports:topArticles', filters),
    expenseSummary: (filters) => ipcRenderer.invoke('reports:expenseSummary', filters),
    dailyCashFlow: (filters) => ipcRenderer.invoke('reports:dailyCashFlow', filters),
    // Legacy aliases
    dailySales: (date) => ipcRenderer.invoke('reports:dailySales', date),
    monthlyProfit: (month) => ipcRenderer.invoke('reports:monthlyProfit', month),
    stockValuation: () => ipcRenderer.invoke('reports:stockValuation'),
    salespersonPerformance: (month) => ipcRenderer.invoke('reports:salespersonPerformance', month),
    expensesSummary: (filters) => ipcRenderer.invoke('reports:expensesSummary', filters)
  },

  salespersons: {
    list: () => ipcRenderer.invoke('salespersons:list'),
    get: (id) => ipcRenderer.invoke('salespersons:get', id),
    create: (data) => ipcRenderer.invoke('salespersons:create', data),
    update: (id, data) => ipcRenderer.invoke('salespersons:update', id, data),
    toggleActive: (id, status) => ipcRenderer.invoke('salespersons:toggleActive', id, status)
  },

  commissions: {
    list: (filters) => ipcRenderer.invoke('commissions:list', filters),
    getSummary: (month) => ipcRenderer.invoke('commissions:getSummary', month),
    setRate: (data) => ipcRenderer.invoke('commissions:setRate', data),
    updateStatus: (id, status) => ipcRenderer.invoke('commissions:updateStatus', id, status),
    recordPayout: (data) => ipcRenderer.invoke('commissions:recordPayout', data)
  },

  expenses: {
    list: (filters) => ipcRenderer.invoke('expenses:list', filters),
    create: (data) => ipcRenderer.invoke('expenses:create', data),
    update: (id, data) => ipcRenderer.invoke('expenses:update', id, data),
    delete: (id) => ipcRenderer.invoke('expenses:delete', id)
  },

  drawer: {
    addCashEntry: (data) => ipcRenderer.invoke('drawer:addCashEntry', data),
    listCashEntries: (filters) => ipcRenderer.invoke('drawer:listCashEntries', filters),
    deleteCashEntry: (id) => ipcRenderer.invoke('drawer:deleteCashEntry', id),
    getReconciliation: (filters) => ipcRenderer.invoke('drawer:getReconciliation', filters),
    // Legacy aliases
    getOpeningBalance: (filters) => ipcRenderer.invoke('drawer:getOpeningBalance', filters),
    setOpeningBalance: (data) => ipcRenderer.invoke('drawer:setOpeningBalance', data)
  },

  settings: {
    getAll: () => ipcRenderer.invoke('settings:getAll'),
    get: (key) => ipcRenderer.invoke('settings:get', key),
    update: (key, value) => ipcRenderer.invoke('settings:update', key, value),
    updateBatch: (settingsObject) => ipcRenderer.invoke('settings:updateBatch', settingsObject)
  },

  print: {
    receipt: (receiptData) => ipcRenderer.invoke('print:receipt', receiptData),
    report: (reportData) => ipcRenderer.invoke('print:report', reportData),
    getPrinters: () => ipcRenderer.invoke('print:getPrinters')
  },

  audit: {
    list: (filters) => ipcRenderer.invoke('audit:list', filters)
  },

  ui: {
    setZoomFactor: (factor) => webFrame.setZoomFactor(factor),
    getZoomFactor: () => webFrame.getZoomFactor()
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', customElectronAPI)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electronAPI = customElectronAPI
}
