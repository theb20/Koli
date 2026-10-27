import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { installFetchIdempotency } from './lib/idempotency'
import { API_BASE } from './lib/api'

// Idempotency-Key sur toutes les écritures envoyées au backend (voir lib/idempotency.ts)
installFetchIdempotency([API_BASE])
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
