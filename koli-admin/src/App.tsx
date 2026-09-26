import { lazy } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AdminLayout } from './components/layout/AdminLayout'
import LoginPage           from './pages/LoginPage'
import ForgotPasswordPage  from './pages/ForgotPasswordPage'
import ResetPasswordPage   from './pages/ResetPasswordPage'
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const ProductsPage = lazy(() => import('./pages/products/ProductsPage'))
const ProductFormPage = lazy(() => import('./pages/products/ProductFormPage'))
const DealsPage = lazy(() => import('./pages/products/DealsPage'))
const OrdersPage = lazy(() => import('./pages/orders/OrdersPage'))
const OrderDetailPage = lazy(() => import('./pages/orders/OrderDetailPage'))
const UsersPage = lazy(() => import('./pages/users/UsersPage'))
const BlogPage = lazy(() => import('./pages/blog/BlogPage'))
const BlogFormPage = lazy(() => import('./pages/blog/BlogFormPage'))
const PromoPage = lazy(() => import('./pages/PromoPage'))
const ReviewsPage = lazy(() => import('./pages/ReviewsPage'))
const ContactPage = lazy(() => import('./pages/ContactPage'))
const ProductRequestsPage = lazy(() => import('./pages/ProductRequestsPage'))
const ProductRequestDetailPage = lazy(() => import('./pages/ProductRequestDetailPage'))
const MerchantApplicationsPage = lazy(() => import('./pages/MerchantApplicationsPage'))
const MerchantApplicationDetailPage = lazy(() => import('./pages/MerchantApplicationDetailPage'))
const StatsPage = lazy(() => import('./pages/StatsPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'))
const StoresPage = lazy(() => import('./pages/stores/StoresPage'))
const StoreDetailPage = lazy(() => import('./pages/stores/StoreDetailPage'))
const MerchantsPage = lazy(() => import('./pages/merchants/MerchantsPage'))
const MerchantDetailPage2 = lazy(() => import('./pages/merchants/MerchantDetailPage'))
const CategoriesPage = lazy(() => import('./pages/categories/CategoriesPage'))
const PromoBannersPage = lazy(() => import('./pages/promo-banners/PromoBannersPage'))
const SubscriptionPlansPage = lazy(() => import('./pages/plans/SubscriptionPlansPage'))
const TaxPage = lazy(() => import('./pages/TaxPage'))
const EmailTemplatesPage = lazy(() => import('./pages/EmailTemplatesPage'))
const ReturnsPage = lazy(() => import('./pages/ReturnsPage'))
const ReturnDetailPage = lazy(() => import('./pages/ReturnDetailPage'))
const LoyaltyPage = lazy(() => import('./pages/LoyaltyPage'))
const LoyaltyDetailPage = lazy(() => import('./pages/LoyaltyDetailPage'))

const qc = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <Toaster position="bottom-right" closeButton
        toastOptions={{ classNames: { toast: '!bg-card !border-line !text-ink !rounded-cta !font-sans', description: '!text-ink-2' } }} />
      <BrowserRouter>
        <Routes>
          <Route path="/login"                    element={<LoginPage />} />
          <Route path="/mot-de-passe-oublie"      element={<ForgotPasswordPage />} />
          <Route path="/reinitialiser-mot-de-passe" element={<ResetPasswordPage />} />
          <Route element={<AdminLayout />}>
            <Route path="/"              element={<DashboardPage />} />
            <Route path="/products"      element={<ProductsPage />} />
            <Route path="/products/new"  element={<ProductFormPage />} />
            <Route path="/products/:id"  element={<ProductFormPage />} />
            <Route path="/deals"         element={<DealsPage />} />
            <Route path="/categories"    element={<CategoriesPage />} />
            <Route path="/promo-banners" element={<PromoBannersPage />} />
            <Route path="/stores"        element={<StoresPage />} />
            <Route path="/stores/:id"    element={<StoreDetailPage />} />
            <Route path="/merchants"     element={<MerchantsPage />} />
            <Route path="/merchants/:id" element={<MerchantDetailPage2 />} />
            <Route path="/plans"         element={<SubscriptionPlansPage />} />
            <Route path="/orders"        element={<OrdersPage />} />
            <Route path="/orders/:id"    element={<OrderDetailPage />} />
            <Route path="/users"         element={<UsersPage />} />
            <Route path="/blog"          element={<BlogPage />} />
            <Route path="/blog/new"      element={<BlogFormPage />} />
            <Route path="/blog/:id"      element={<BlogFormPage />} />
            <Route path="/promo"         element={<PromoPage />} />
            <Route path="/reviews"       element={<ReviewsPage />} />
            <Route path="/contact"       element={<ContactPage />} />
            <Route path="/product-requests"     element={<ProductRequestsPage />} />
            <Route path="/product-requests/:id" element={<ProductRequestDetailPage />} />
            <Route path="/merchant-applications"     element={<MerchantApplicationsPage />} />
            <Route path="/merchant-applications/:id" element={<MerchantApplicationDetailPage />} />
            <Route path="/stats"         element={<StatsPage />} />
            <Route path="/settings"      element={<SettingsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/tax"           element={<TaxPage />} />
            <Route path="/emails"        element={<EmailTemplatesPage />} />
            <Route path="/returns"       element={<ReturnsPage />} />
            <Route path="/returns/:id"   element={<ReturnDetailPage />} />
            <Route path="/loyalty"       element={<LoyaltyPage />} />
            <Route path="/loyalty/:id"   element={<LoyaltyDetailPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
