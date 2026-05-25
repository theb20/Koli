import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MainLayout } from './components/layout/MainLayout'
import { HomePage } from './pages/HomePage'
import { ShopPage } from './pages/ShopPage'
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



const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1 },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>

      {/* Loader plein écran — s'efface automatiquement après 2.4s */}
      <PageLoader duration={2400} />

      {/* Cookie consent banner */}
      <CookieBanner />

      <BrowserRouter>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/cgu"     element={<CguPage />} />
            <Route path="/legal"   element={<LegalPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
          </Route>
            <Route path="/login"    element={<Login />} />
            <Route path="/register" element={<Register />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
