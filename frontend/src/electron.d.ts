interface ElectronAPI {
  getApiUrl: string
  isElectron: boolean
}

interface Window {
  electronAPI?: ElectronAPI
  __ENV__?: {
    VITE_API_URL?: string
  }
}
