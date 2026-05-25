import { PageMeta } from '../components/seo/PageMeta'

export function AboutPage() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      <PageMeta
        title="À propos"
        description="Découvrez l'histoire de Dropship : notre mission, nos valeurs et pourquoi plus de 12 000 entrepreneurs nous font confiance."
        path="/about"
        image="/wall/og-about.jpg"
      />
      <h1 className="text-4xl font-black text-gray-900 mb-2">About Us</h1>
      <p className="text-gray-400 text-sm max-w-xl">
        PHLOX is your one-stop destination for premium electronics. We offer the latest and greatest
        in tech — from wireless headphones to gaming consoles and smart home devices.
      </p>
    </div>
  )
}
