import { PackifyHero } from '../components/sections/PackifyHero'
import { DropShopSection } from '../components/sections/DropShopSection'
import { DealOfTheDay as PromoPairs } from '../components/sections/PromoPairs'
import { BestSellersSection } from '../components/sections/BestSellersSection'
import { WhyKoliSection } from '../components/sections/WhyKoliSection'
import { TestimonialsSection } from '../components/sections/TestimonialsSection'
import PubImg from '../components/sections/PubImg'
import { PageMeta } from '../components/seo/PageMeta'
import { FaqSection } from '../components/sections/FaqSection'

export function HomePage() {
  return (
    <>
      <PageMeta
        title="Accueil"
        description="Dropship — votre marketplace en ligne. Découvrez des milliers de produits sélectionnés, paiement sécurisé et livraison rapide en Côte d'Ivoire."
        path="/"
        image="/wall/og-home.jpg"
      />
      <PackifyHero />
      <DropShopSection />
      <BestSellersSection />
      <WhyKoliSection />
      <TestimonialsSection />
      <PubImg />
      <PromoPairs />
      <FaqSection />
      
    </>
  )
}
