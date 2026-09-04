import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { ToastPortal } from './components/ui/Toast'
import { useAuthStore } from './store/authStore'

import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import ProformasListPage from './pages/ProformasListPage'
import ProformaEditorPage from './pages/ProformaEditorPage'
import ProformaDetailPage from './pages/ProformaDetailPage'
import InvoicesListPage from './pages/InvoicesListPage'
import InvoiceDetailPage from './pages/InvoiceDetailPage'
import ClientsPage from './pages/ClientsPage'
import ClientDetailPage from './pages/ClientDetailPage'
import ProductsPage from './pages/ProductsPage'
import AutomationPage from './pages/AutomationPage'
import SettingsPage from './pages/SettingsPage'
import ProformaPublicPage from './pages/ProformaPublicPage'
import NotFoundPage from './pages/NotFoundPage'

export default function App() {
  const fetchMe = useAuthStore((s) => s.fetchMe)

  useEffect(() => {
    if (localStorage.getItem('proforma_token')) fetchMe()
    else useAuthStore.setState({ status: 'error' })
  }, [fetchMe])

  return (
    <>
      <Routes>
        <Route path="/connexion" element={<LoginPage />} />
        <Route path="/inscription" element={<RegisterPage />} />
        <Route path="/p/:token" element={<ProformaPublicPage />} />

        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/proformas" element={<ProformasListPage />} />
          <Route path="/proformas/nouvelle" element={<ProformaEditorPage />} />
          <Route path="/proformas/:id/modifier" element={<ProformaEditorPage />} />
          <Route path="/proformas/:id" element={<ProformaDetailPage />} />
          <Route path="/factures" element={<InvoicesListPage />} />
          <Route path="/factures/:id" element={<InvoiceDetailPage />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/clients/:id" element={<ClientDetailPage />} />
          <Route path="/produits" element={<ProductsPage />} />
          <Route path="/automatisation" element={<AutomationPage />} />
          <Route path="/parametres" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <ToastPortal />
    </>
  )
}
