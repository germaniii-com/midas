interface ElectronAPI {
  getApiUrl: string
  isElectron: boolean
}

interface Window {
  electronAPI?: ElectronAPI
}
