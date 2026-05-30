import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CartProvider } from './contexts/CartContext'
import { AuthProvider } from './contexts/AuthContext'
import { CompareProvider } from './contexts/CompareContext'
import { MainLayout } from './components/layout/MainLayout'
import { HomePage } from './pages/HomePage'
import { AboutPage } from './pages/AboutPage'
import { BlogPage } from './pages/BlogPage'
import BlogDetailPage from './pages/BlogDetailPage'
import { ContactPage } from './pages/ContactPage'
import { PageLoader } from './components/ui/PageLoader'
import { CookieBanner } from './components/ui/CookieBanner'
import { CompareBar } from './components/ui/CompareBar'
import { PrivateRoute } from './components/auth/PrivateRoute'
import Login from './pages/Login'
import Register from './pages/Signup'
import CguPage from './pages/CguPage'
import LegalPage from './pages/LegalPage'
import PrivacyPage from './pages/PrivacyPage'
import CataloguePage from './pages/CataloguePage'
import ProductPage from './pages/ProductPage'
import OrderDetailPage from './pages/OrderDetailPage'
import OrdersPage      from './pages/OrdersPage'
import PanierPage from './pages/PanierPage'
import ProfilPage from './pages/ProfilPage'
import MagasinPage from './pages/MagasinPage'
import MagicLoginPage from './pages/MagicLoginPage'
import OnboardingPage from './pages/OnboardingPage'
import ComparePage from './pages/ComparePage'
import GiftListPublicPage from './pages/GiftListPublicPage'
import DeliveryPage from './pages/DeliveryPage'
import SellerPage from './pages/SellerPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1 },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
      <CartProvider>
      <CompareProvider>

        {/* Loader plein écran — s'efface automatiquement après 2.4s */}
        <PageLoader duration={2400} />

        {/* Cookie consent banner */}
        <CookieBanner />

        {/* Barre de comparaison flottante */}
        <CompareBar />

        <BrowserRouter>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/blog/:slug" element={<BlogDetailPage />} />
              {/* Legacy /shop → /catalogue */}
              <Route path="/shop" element={<Navigate to="/catalogue" replace />} />
              <Route path="/shop/*" element={<Navigate to="/catalogue" replace />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/catalogue" element={<CataloguePage />} />
              <Route path="/catalogue/:id" element={<ProductPage />} />

              <Route path="/magasin" element={<MagasinPage />} />
              <Route path="/cgu"     element={<CguPage />} />
              <Route path="/legal"   element={<LegalPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />

              {/* ── Comparateur & listes publiques ── */}
              <Route path="/comparer"      element={<ComparePage />} />
              <Route path="/liste/:slug"   element={<GiftListPublicPage />} />

              {/* ── Routes protégées (nécessitent une connexion) ── */}
              <Route element={<PrivateRoute />}>
                <Route path="/commandes"           element={<OrdersPage />} />
                <Route path="/commandes/:id"       element={<OrderDetailPage />} />
                <Route path="/commandes/:id/suivi" element={<DeliveryPage />} />
                <Route path="/vendeur"             element={<SellerPage />} />
              </Route>
            </Route>

            {/* Pages sans header/footer */}
            <Route path="/panier"      element={<PanierPage />} />
            <Route path="/login"       element={<Login />} />
            <Route path="/register"    element={<Register />} />
            <Route path="/auth/magic"  element={<MagicLoginPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />

            {/* Profil — protégé, sans layout standard */}
            <Route element={<PrivateRoute />}>
              <Route path="/profil" element={<ProfilPage />} />
            </Route>
          </Routes>
        </BrowserRouter>

      </CompareProvider>
      </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
