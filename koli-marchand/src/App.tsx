import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MerchantLayout } from '@/components/layout/MerchantLayout'
import LoginPage from '@/features/auth/LoginPage'
import DashboardPage from '@/features/dashboard/DashboardPage'
import ProductsPage from '@/features/products/ProductsPage'
import OrdersPage from '@/features/orders/OrdersPage'
import PaymentsPage from '@/features/payouts/PaymentsPage'
import CustomersPage from '@/features/customers/CustomersPage'
import CustomerDetailPage from '@/features/customers/CustomerDetailPage'
import PromotionsPage from '@/features/promotions/PromotionsPage'
import StatsPage from '@/features/stats/StatsPage'
import SettingsPage from '@/features/settings/SettingsPage'

const qc = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          <Route path="/connexion" element={<LoginPage />} />

          <Route element={<MerchantLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/produits" element={<ProductsPage />} />
            <Route path="/commandes" element={<OrdersPage />} />
            <Route path="/paiements" element={<PaymentsPage />} />
            <Route path="/clients" element={<CustomersPage />} />
            <Route path="/clients/:id" element={<CustomerDetailPage />} />
            <Route path="/promotions" element={<PromotionsPage />} />
            <Route path="/statistiques" element={<StatsPage />} />
            <Route path="/parametres" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
