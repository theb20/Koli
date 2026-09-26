/* Navigation du backoffice — source unique pour la sidebar et la palette ⌘K. */
import {
  House, BarChart3, Bell, Package, Layers, Zap, PackageSearch, Star,
  ShoppingCart, RotateCcw, Tag, Percent, Store, Building2, Briefcase, CreditCard,
  Users, Gift, Megaphone, BookOpen, Send, MessageSquare, Settings, type LucideIcon,
} from 'lucide-react'

/** Clé du compteur affiché en pastille (voir useAdminCounters). */
export type CounterKey = 'pendingOrders' | 'requestedReturns' | 'newProductRequests' | 'unreadContacts' | 'unreadNotifications' | 'pendingApplications'

export type NavItem = { to: string; label: string; icon: LucideIcon; counter?: CounterKey; keywords?: string }
export type NavGroup = { title: string; items: NavItem[] }

export const NAV_GROUPS: NavGroup[] = [
  { title: 'Pilotage', items: [
    { to: '/',              label: "Vue d'ensemble", icon: House, keywords: 'dashboard accueil' },
    { to: '/stats',         label: 'Statistiques',   icon: BarChart3, keywords: 'rapports ventes' },
    { to: '/notifications', label: 'Notifications',  icon: Bell, counter: 'unreadNotifications' },
  ] },
  { title: 'Catalogue', items: [
    { to: '/products',         label: 'Produits',              icon: Package, keywords: 'catalogue stock' },
    { to: '/categories',       label: 'Catégories',            icon: Layers },
    { to: '/deals',            label: 'Deals',                 icon: Zap, keywords: 'vente flash promo du jour' },
    { to: '/product-requests', label: 'Demandes',              icon: PackageSearch, counter: 'newProductRequests', keywords: 'demandes de produits sourcing devis' },
    { to: '/reviews',          label: 'Avis',                  icon: Star, keywords: 'commentaires notes' },
  ] },
  { title: 'Ventes', items: [
    { to: '/orders',  label: 'Commandes',   icon: ShoppingCart, counter: 'pendingOrders' },
    { to: '/returns', label: 'Retours',     icon: RotateCcw, counter: 'requestedReturns', keywords: 'remboursements' },
    { to: '/promo',   label: 'Codes promo', icon: Tag, keywords: 'coupons réductions' },
    { to: '/tax',     label: 'Taxes',       icon: Percent, keywords: 'tva' },
  ] },
  { title: 'Marketplace', items: [
    { to: '/stores',                label: 'Boutiques',    icon: Store, keywords: 'magasins' },
    { to: '/merchants',             label: 'Marchands',    icon: Building2, keywords: 'vendeurs' },
    { to: '/merchant-applications', label: 'Candidatures', icon: Briefcase, counter: 'pendingApplications' },
    { to: '/plans',                 label: 'Abonnements',  icon: CreditCard, keywords: 'plans offres' },
  ] },
  { title: 'Clients & Marketing', items: [
    { to: '/users',         label: 'Utilisateurs',   icon: Users, keywords: 'clients comptes' },
    { to: '/loyalty',       label: 'Fidélité',       icon: Gift, keywords: 'points' },
    { to: '/promo-banners', label: 'Bannières promo', icon: Megaphone },
    { to: '/blog',          label: 'Blog',           icon: BookOpen, keywords: 'articles' },
    { to: '/emails',        label: 'Emails',         icon: Send, keywords: 'templates modèles' },
    { to: '/contact',       label: 'Contact',        icon: MessageSquare, counter: 'unreadContacts', keywords: 'messages support' },
  ] },
  { title: 'Système', items: [
    { to: '/settings', label: 'Paramètres', icon: Settings, keywords: 'réglages configuration' },
  ] },
]

export const NAV_ITEMS = NAV_GROUPS.flatMap(g => g.items)

/** Libellé de la section correspondant à une URL (fil d'Ariane). */
export function sectionFor(pathname: string): NavItem | undefined {
  const base = '/' + (pathname.split('/')[1] ?? '')
  return NAV_ITEMS.find(i => i.to === base)
}

/** Raccourcis « G puis lettre » */
export const GOTO_SHORTCUTS: Record<string, string> = {
  d: '/', o: '/orders', p: '/products', u: '/users', r: '/returns', s: '/stats', c: '/contact', m: '/merchants', n: '/notifications',
}
