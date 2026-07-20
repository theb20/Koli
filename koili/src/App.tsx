import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CartProvider } from './contexts/CartContext'
import { AuthProvider } from './contexts/AuthContext'
import { CompareProvider } from './contexts/CompareContext'
import { MainLayout } from './components/layout/MainLayout'
import { PageLoader } from './components/ui/PageLoader'
import { CookieBanner } from './components/ui/CookieBanner'
import { CompareBar } from './components/ui/CompareBar'
import { PrivateRoute } from './components/auth/PrivateRoute'
import { RouteLoader } from './components/ui/RouteLoader'

/* ── Pages en code-splitting — chaque route ne charge que son propre JS ── */
const HomePage            = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })))
const AboutPage           = lazy(() => import('./pages/AboutPage').then(m => ({ default: m.AboutPage })))
const BlogPage            = lazy(() => import('./pages/BlogPage').then(m => ({ default: m.BlogPage })))
const BlogDetailPage      = lazy(() => import('./pages/BlogDetailPage'))
const ContactPage         = lazy(() => import('./pages/ContactPage').then(m => ({ default: m.ContactPage })))
const Login                = lazy(() => import('./pages/Login'))
const Register             = lazy(() => import('./pages/Signup'))
const CguPage              = lazy(() => import('./pages/CguPage'))
const LegalPage            = lazy(() => import('./pages/LegalPage'))
const PrivacyPage          = lazy(() => import('./pages/PrivacyPage'))
const CataloguePage        = lazy(() => import('./pages/CataloguePage'))
const ProductPage          = lazy(() => import('./pages/ProductPage'))
const OrderDetailPage      = lazy(() => import('./pages/OrderDetailPage'))
const OrdersPage           = lazy(() => import('./pages/OrdersPage'))
const PanierPage           = lazy(() => import('./pages/PanierPage'))
const ProfilPage           = lazy(() => import('./pages/ProfilPage'))
const MagicLoginPage       = lazy(() => import('./pages/MagicLoginPage'))
const CompleteBirthdatePage = lazy(() => import('./pages/CompleteBirthdatePage'))
const OnboardingPage       = lazy(() => import('./pages/OnboardingPage'))
const ComparePage          = lazy(() => import('./pages/ComparePage'))
const GiftListPublicPage   = lazy(() => import('./pages/GiftListPublicPage'))
const DeliveryPage         = lazy(() => import('./pages/DeliveryPage'))
const SellerPage           = lazy(() => import('./pages/SellerPage'))
const RequestProductPage   = lazy(() => import('./pages/RequestProductPage'))
const NotFoundPage         = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })))

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

        {/* Loader plein écran — s'efface automatiquement après 0.9s */}
        <PageLoader duration={900} />

        {/* Cookie consent banner */}
        <CookieBanner />

        {/* Barre de comparaison flottante */}
        <CompareBar />

        <BrowserRouter>
          <Suspense fallback={<RouteLoader />}>
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

              <Route path="/cgu"     element={<CguPage />} />
              <Route path="/legal"   element={<LegalPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />

              {/* ── Comparateur & listes publiques ── */}
              <Route path="/comparer"      element={<ComparePage />} />
              <Route path="/liste/:slug"   element={<GiftListPublicPage />} />
              <Route path="/demande"   element={<RequestProductPage />} />

              {/* ── Routes protégées (nécessitent une connexion) ── */}
              <Route element={<PrivateRoute />}>
                <Route path="/commandes"           element={<OrdersPage />} />
                <Route path="/commandes/:id"       element={<OrderDetailPage />} />
                <Route path="/commandes/:id/suivi" element={<DeliveryPage />} />
                <Route path="/vendeur"             element={<SellerPage />} />
                <Route path="/panier"      element={<PanierPage />} />

              </Route>
            </Route>

            {/* Pages sans header/footer */}
            

            <Route path="/login"       element={<Login />} />
            <Route path="/register"    element={<Register />} />
            <Route path="/auth/magic"  element={<MagicLoginPage />} />
            <Route path="/completer-naissance" element={<CompleteBirthdatePage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />

            {/* Profil — protégé, sans layout standard */}
            <Route element={<PrivateRoute />}>
              <Route path="/profil" element={<ProfilPage />} />
            </Route>

            {/* Route de secours — toute URL non reconnue (Firebase réécrit tout vers index.html) */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          </Suspense>
        </BrowserRouter>

      </CompareProvider>
      </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
