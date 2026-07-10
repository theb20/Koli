import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AdminLayout } from './components/layout/AdminLayout'
import LoginPage           from './pages/LoginPage'
import ForgotPasswordPage  from './pages/ForgotPasswordPage'
import ResetPasswordPage   from './pages/ResetPasswordPage'
import DashboardPage    from './pages/DashboardPage'
import ProductsPage     from './pages/products/ProductsPage'
import ProductFormPage  from './pages/products/ProductFormPage'
import DealsPage        from './pages/products/DealsPage'
import OrdersPage       from './pages/orders/OrdersPage'
import OrderDetailPage  from './pages/orders/OrderDetailPage'
import UsersPage        from './pages/users/UsersPage'
import BlogPage         from './pages/blog/BlogPage'
import BlogFormPage     from './pages/blog/BlogFormPage'
import PromoPage        from './pages/PromoPage'
import ReviewsPage      from './pages/ReviewsPage'
import ContactPage      from './pages/ContactPage'
import ProductRequestsPage      from './pages/ProductRequestsPage'
import ProductRequestDetailPage from './pages/ProductRequestDetailPage'
import StatsPage        from './pages/StatsPage'
import SettingsPage       from './pages/SettingsPage'
import NotificationsPage  from './pages/NotificationsPage'
import StoresPage         from './pages/stores/StoresPage'
import StoreDetailPage    from './pages/stores/StoreDetailPage'
import CategoriesPage     from './pages/categories/CategoriesPage'
import TaxPage            from './pages/TaxPage'
import EmailTemplatesPage from './pages/EmailTemplatesPage'
import ReturnsPage        from './pages/ReturnsPage'
import ReturnDetailPage   from './pages/ReturnDetailPage'

const qc = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

export default function App() {
  return (
    <QueryClientProvider client={qc}>
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
            <Route path="/stores"        element={<StoresPage />} />
            <Route path="/stores/:id"    element={<StoreDetailPage />} />
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
            <Route path="/stats"         element={<StatsPage />} />
            <Route path="/settings"      element={<SettingsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/tax"           element={<TaxPage />} />
            <Route path="/emails"        element={<EmailTemplatesPage />} />
            <Route path="/returns"       element={<ReturnsPage />} />
            <Route path="/returns/:id"   element={<ReturnDetailPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
