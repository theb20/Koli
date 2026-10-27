import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { installFetchIdempotency } from './lib/idempotency'
import { MERCHANTGO_URL } from './lib/merchantgo'

// Idempotency-Key sur les écritures envoyées directement à merchantgo (le backend passe par axios)
installFetchIdempotency([MERCHANTGO_URL])
import { initAnalytics } from './lib/firebase'

initAnalytics()

async function enableMocking() {
  if (import.meta.env.VITE_ENABLE_MOCKS === 'false') return
  const { worker } = await import('./mocks/browser')
  return worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: { url: '/mockServiceWorker.js' },
  })
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
