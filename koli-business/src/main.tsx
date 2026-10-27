import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { installFetchIdempotency } from './lib/idempotency'
import { BACKEND_URL, MERCHANTGO_URL } from './lib/api'

// Idempotency-Key sur toutes les écritures envoyées au backend et à merchantgo (voir lib/idempotency.ts)
installFetchIdempotency([BACKEND_URL, MERCHANTGO_URL])
import { initAnalytics } from './lib/firebase'

initAnalytics()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
