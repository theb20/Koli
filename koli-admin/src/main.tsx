import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initAnalytics } from './lib/firebase'
import { applyStoredTheme } from './lib/theme'

// Avant le premier rendu : évite un flash clair en mode sombre
applyStoredTheme()

initAnalytics()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
