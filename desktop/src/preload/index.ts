import { contextBridge } from 'electron'

const apiUrlArg = process.argv.find((arg) => arg.startsWith('--backend-url='))
const backendUrl = apiUrlArg ? apiUrlArg.split('=')[1] : 'http://localhost:5001'

contextBridge.exposeInMainWorld('electronAPI', {
  getApiUrl: backendUrl,
  isElectron: true,
})
