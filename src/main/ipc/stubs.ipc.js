import { handleIpc } from './envelope.js'

export function registerStubHandlers() {
  const stubMessage = (channel) => `Stub handler for ${channel}: not implemented yet.`



  // Returns Stubs
  const returnChannels = ['returns:list', 'returns:get', 'returns:create']
  returnChannels.forEach(ch => handleIpc(ch, () => { throw new Error(stubMessage(ch)) }))

  // Reports Stubs
  const reportChannels = ['reports:dailySales', 'reports:monthlyProfit', 'reports:stockValuation', 'reports:salespersonPerformance', 'reports:expensesSummary']
  reportChannels.forEach(ch => handleIpc(ch, () => { throw new Error(stubMessage(ch)) }))


  // Expenses Stubs
  const expenseChannels = ['expenses:list', 'expenses:create', 'expenses:update', 'expenses:delete']
  expenseChannels.forEach(ch => handleIpc(ch, () => { throw new Error(stubMessage(ch)) }))


  console.log('[IPC] Registered all domain IPC handler stubs.')
}
