import { motion } from 'motion/react'
import { Truck, ShieldCheck, RefreshCw, Headphones } from 'lucide-react'

const FEATURES = [
  { icon: Truck, title: 'Livraison rapide', subtitle: 'Gratuite dès 50€' },
  { icon: ShieldCheck, title: 'Paiement sécurisé', subtitle: 'Transactions protégées' },
  { icon: RefreshCw, title: 'Retour facile', subtitle: 'Sous 30 jours' },
  { icon: Headphones, title: 'Support 24/7', subtitle: 'Toujours disponible' },
]

export function FeaturesStrip() {
  return (
    <section className="bg-gradient-to-b from-white to-gray-50 border-y border-gray-100 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 py-10">

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          variants={{
            hidden: {},
            show: {
              transition: {
                staggerChildren: 0.12,
              },
            },
          }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {FEATURES.map(({ icon: Icon, title, subtitle }) => (
            <motion.div
              key={title}
              variants={{
                hidden: { opacity: 0, y: 20, scale: 0.95 },
                show: { opacity: 1, y: 0, scale: 1 },
              }}
              whileHover={{
                scale: 1.05,
                rotate: -0.3,
              }}
              transition={{ type: 'spring', stiffness: 260, damping: 18 }}
              className="
                group relative flex items-center gap-4
                p-5 rounded-3xl
                bg-white
                border border-gray-100
                shadow-sm
                hover:shadow-xl
                transition
              "
            >
              {/* Glow effect */}
              <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition bg-gradient-to-r from-black/5 via-black/10 to-black/5 blur-xl" />

              {/* Icon */}
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="
                  relative z-10
                  w-12 h-12 flex items-center justify-center
                  rounded-2xl bg-black/5
                  group-hover:bg-black
                  transition
                "
              >
                <Icon
                  size={20}
                  className="text-black group-hover:text-white transition"
                  strokeWidth={1.6}
                />
              </motion.div>

              {/* Text */}
              <div className="relative z-10 leading-tight">
                <p className="font-semibold text-sm text-gray-900 group-hover:text-black transition">
                  {title}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {subtitle}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

      </div>
    </section>
  )
}