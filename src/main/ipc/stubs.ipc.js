import { handleIpc } from './envelope.js'

export function registerStubHandlers() {
  const stubMessage = (channel) => `Stub handler for ${channel}: not implemented yet.`


  // Sales Stubs
  const saleChannels = ['sales:list', 'sales:get', 'sales:create', 'sales:void', 'sales:reprint']
  saleChannels.forEach(ch => handleIpc(ch, () => { throw new Error(stubMessage(ch)) }))

  // Returns Stubs
  const returnChannels = ['returns:list', 'returns:get', 'returns:create']
  returnChannels.forEach(ch => handleIpc(ch, () => { throw new Error(stubMessage(ch)) }))

  // Reports Stubs
  const reportChannels = ['reports:dailySales', 'reports:monthlyProfit', 'reports:stockValuation', 'reports:salespersonPerformance', 'reports:expensesSummary']
  reportChannels.forEach(ch => handleIpc(ch, () => { throw new Error(stubMessage(ch)) }))

  // Salespersons Stubs
  const salespersonChannels = ['salespersons:list', 'salespersons:get', 'salespersons:create', 'salespersons:update', 'salespersons:toggleActive']
  salespersonChannels.forEach(ch => handleIpc(ch, () => { throw new Error(stubMessage(ch)) }))

  // Commissions Stubs
  const commissionChannels = ['commissions:list', 'commissions:getSummary', 'commissions:setRate', 'commissions:updateStatus']
  commissionChannels.forEach(ch => handleIpc(ch, () => { throw new Error(stubMessage(ch)) }))

  // Expenses Stubs
  const expenseChannels = ['expenses:list', 'expenses:create', 'expenses:update', 'expenses:delete']
  expenseChannels.forEach(ch => handleIpc(ch, () => { throw new Error(stubMessage(ch)) }))

  // Print Stubs
  const printChannels = ['print:receipt', 'print:report', 'print:getPrinters']
  printChannels.forEach(ch => handleIpc(ch, () => { throw new Error(stubMessage(ch)) }))

  console.log('[IPC] Registered all domain IPC handler stubs.')
}
