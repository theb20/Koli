import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CartProvider } from './contexts/CartContext'
import { MainLayout } from './components/layout/MainLayout'
import { HomePage } from './pages/HomePage'
import { AboutPage } from './pages/AboutPage'
import { BlogPage } from './pages/BlogPage'
import { ContactPage } from './pages/ContactPage'
import { PageLoader } from './components/ui/PageLoader'
import { CookieBanner } from './components/ui/CookieBanner'
import Login from './pages/Login'
import Register from './pages/Signup'
import CguPage from './pages/CguPage'
import LegalPage from './pages/LegalPage'
import PrivacyPage from './pages/PrivacyPage'
import CataloguePage from './pages/CataloguePage'
import ProductPage from './pages/ProductPage'
import OrderDetailPage from './pages/OrderDetailPage'
import PanierPage from './pages/PanierPage'
import ProfilPage from './pages/ProfilPage'
import MagasinPage from './pages/MagasinPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1 },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>

        {/* Loader plein écran — s'efface automatiquement après 2.4s */}
        <PageLoader duration={2400} />

        {/* Cookie consent banner */}
        <CookieBanner />

        <BrowserRouter>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/catalogue" element={<CataloguePage />} />
              <Route path="/catalogue/:id" element={<ProductPage />} />
              
              <Route path="/magasin" element={<MagasinPage />} />
              <Route path="/commandes/:id" element={<OrderDetailPage />} />
              <Route path="/commandes" element={<OrderDetailPage />} />
              <Route path="/cgu"     element={<CguPage />} />
              <Route path="/legal"   element={<LegalPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
            </Route>
            {/* Pages sans header/footer */}
            <Route path="/panier"   element={<PanierPage />} />
            <Route path="/login"    element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/profil" element={<ProfilPage />} />
          </Routes>
        </BrowserRouter>

      </CartProvider>
    </QueryClientProvider>
  )
}

export default App
