import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { applyStoredTheme } from './lib/theme'
import { initAnalytics } from './lib/firebase'
import App from './App.tsx'

// Avant le premier rendu — évite un flash clair→sombre au chargement.
applyStoredTheme()

// Jamais bloquant pour le premier rendu — Analytics se charge en tâche de fond.
void initAnalytics()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
