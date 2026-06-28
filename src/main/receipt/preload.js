import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('receiptAPI', {
  onReceiptData: (callback) => ipcRenderer.on('render-receipt', (_, data) => callback(data))
})
