import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Footer } from './Footer'
import { CartDrawer } from '../ui/CartDrawer'

export function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      {/* pt = hauteur header fixe : 60px mobile | 108px sm (topbar+main) | 156px md (topbar+main+nav) */}
      <main className="flex-1 pt-[60px] sm:pt-[108px] md:pt-[156px]">
        <Outlet />
      </main>
      <Footer />
      {/* Drawer panier — rendu au niveau layout pour être au-dessus de tout */}
      <CartDrawer />
    </div>
  )
}
