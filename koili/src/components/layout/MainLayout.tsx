import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Footer } from './Footer'
import { Chatbox } from './Chatbox'
import { CartDrawer } from '../ui/CartDrawer'
import  SkignasAIBetaPopup  from './SkignasAIBetaPopup'
import { PendingQuoteBanner } from './PendingQuoteBanner'


export function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Devis de sourcing en attente — ramène le client vers sa page devis */}
      <PendingQuoteBanner />
      <Header />
      {/* Header en sticky (plus fixed) — reste dans le flux normal, aucun padding
          de compensation nécessaire, le contenu s'enchaîne naturellement dessous. */}
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      {/* Drawer panier — rendu au niveau layout pour être au-dessus de tout */}
      <CartDrawer />
      {/* Widget de contact flottant — design seul pour l'instant, pas de backend branché */}
      <Chatbox />
      <SkignasAIBetaPopup />
    </div>
  )
}
