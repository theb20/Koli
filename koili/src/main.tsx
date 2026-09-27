import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initConsentDefaults, readConsent, applyConsent } from './lib/consent'

// Consentement : tout refusé par défaut ; GTM n'est chargé qu'après acceptation
initConsentDefaults()
const storedConsent = readConsent()
if (storedConsent) applyConsent(storedConsent)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
