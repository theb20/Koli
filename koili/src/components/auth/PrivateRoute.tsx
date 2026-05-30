import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

/**
 * Protège les routes qui nécessitent une connexion.
 * Redirige vers /login en conservant l'URL d'origine via `state.from`.
 *
 * Usage dans App.tsx :
 *   <Route element={<PrivateRoute />}>
 *     <Route path="/profil" element={<ProfilPage />} />
 *     <Route path="/commandes/:id" element={<OrderDetailPage />} />
 *   </Route>
 */
export function PrivateRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  // Pendant le chargement initial, ne pas rediriger
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 rounded-full border-2 border-gray-900 border-t-transparent" />
      </div>
    )
  }

  if (!isAuthenticated) {
    // Mémorise la destination pour y revenir après login
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}
