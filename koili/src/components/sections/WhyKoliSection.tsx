import { cn } from '../../lib/utils'
import {
  IconTruck,
  IconShieldCheck,
  IconTag,
  IconHeadset,
  IconArrowBack,
  IconLock,
  IconSparkles,
  IconStarFilled,
} from '@tabler/icons-react'

/* ─────────────────────────────────────────
   DATA — adapté Koli
───────────────────────────────────────── */
const FEATURES = [
  {
    title: 'Livraison rapide',
    description: 'Recevez vos commandes en 2 à 7 jours ouvrés, partout en Afrique de l\'Ouest.',
    icon: <IconTruck size={24} />,
  },
  {
    title: 'Produits vérifiés',
    description: 'Chaque produit est soigneusement sélectionné et testé avant d\'être mis en vente.',
    icon: <IconShieldCheck size={24} />,
  },
  {
    title: 'Meilleurs prix',
    description: 'Nous négocions directement avec les fournisseurs pour vous offrir les tarifs les plus bas.',
    icon: <IconTag size={24} />,
  },
  {
    title: 'Nouveautés chaque semaine',
    description: 'Notre catalogue est mis à jour chaque semaine avec des produits tendance sélectionnés pour vous.',
    icon: <IconSparkles size={24} />,
  },
  {
    title: 'Support 7j/7',
    description: 'Notre équipe est disponible tous les jours pour répondre à vos questions en moins d\'une heure.',
    icon: <IconHeadset size={24} />,
  },
  {
    title: 'Retours facilités',
    description: 'Vous avez 30 jours pour retourner un produit. Remboursement rapide et sans discussion.',
    icon: <IconArrowBack size={24} />,
  },
  {
    title: 'Paiement 100 % sécurisé',
    description: 'Vos données bancaires sont chiffrées. Nous acceptons Mobile Money, carte et virement.',
    icon: <IconLock size={24} />,
  },
  {
    title: 'Des milliers d\'avis 5★',
    description: 'Plus de 4 000 clients satisfaits notent nos produits 4,8/5 en moyenne. Leur confiance, c\'est notre fierté.',
    icon: <IconStarFilled size={24} />,
  },
]

/* ─────────────────────────────────────────
   FEATURE TILE
───────────────────────────────────────── */
function Feature({
  title,
  description,
  icon,
  index,
}: {
  title: string
  description: string
  icon: React.ReactNode
  index: number
}) {
  return (
    <div
      className={cn(
        'flex flex-col lg:border-r border-gray-100/10 py-6 sm:py-8 lg:py-10 relative group/feature',
        (index === 0 || index === 4) && 'lg:border-l border-gray-100/10',
        index < 4 && 'lg:border-b border-gray-100/10',
        'border-b border-gray-100/10 lg:border-b-0',
      )}
    >
      {/* Hover gradient — top row */}
      {index < 4 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-t from-blue-50 to-transparent pointer-events-none" />
      )}
      {/* Hover gradient — bottom row */}
      {index >= 4 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-b from-blue-50 to-transparent pointer-events-none" />
      )}
      {/* Icon */}
      <div className="mb-4 relative z-10 px-5 sm:px-8 lg:px-10 text-white group-hover/feature:text-blue-600 transition-colors duration-200">
        {icon}
      </div>
      {/* Title */}
      <div className="text-base font-bold mb-2 relative z-10 px-5 sm:px-8 lg:px-10">
        {/* Accent bar */}
        <div className="absolute left-0 inset-y-0 h-6 group-hover/feature:h-8 w-1 rounded-tr-full rounded-br-full bg-gray-200 group-hover/feature:bg-blue-600 transition-all duration-200 origin-center" />
        <span className="group-hover/feature:translate-x-2 transition duration-200 inline-block text-white">
          {title}
        </span>
      </div>
      {/* Description */}
      <p className="text-sm text-white/60 max-w-xs relative z-10 px-5 sm:px-8 lg:px-10 leading-relaxed">
        {description}
      </p>
    </div>
  )
}

/* ─────────────────────────────────────────
   SECTION COMPONENT
───────────────────────────────────────── */
export function WhyKoliSection() {
  return (
    <section
      className="relative py-6 overflow-hidden"
      style={{
        backgroundImage: 'url(/wall/why-dropship.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Overlay blanc semi-transparent */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-4 py-9">

          <h2 className="text-3xl font-bold text-white">
            Tout ce qui fait la différence
          </h2>
          <p className="text-white text-sm mt-2 max-w-lg mx-auto">
            De la sélection produit à la livraison, chaque détail est pensé pour vous.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 relative z-10">
          {FEATURES.map((feature, index) => (
            <Feature key={feature.title} {...feature} index={index} />
          ))}
        </div>

      </div>
    </section>
  )
}
