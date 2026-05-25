import { PageMeta } from '../components/seo/PageMeta'

export function ContactPage() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      <PageMeta
        title="Contact"
        description="Une question, un partenariat, un problème de commande ? Contactez l'équipe Dropship — nous répondons sous 24 h."
        path="/contact"
      />
      <h1 className="text-4xl font-black text-gray-900 mb-2">Contact Us</h1>
      <p className="text-gray-400 text-sm mb-10">We'd love to hear from you.</p>
      <form className="max-w-lg space-y-4" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            type="text"
            className="w-full border border-gray-200 rounded-sm px-4 py-2.5 text-sm outline-none focus:border-[#E84040] transition-colors"
            placeholder="Your name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            className="w-full border border-gray-200 rounded-sm px-4 py-2.5 text-sm outline-none focus:border-[#E84040] transition-colors"
            placeholder="your@email.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
          <textarea
            rows={5}
            className="w-full border border-gray-200 rounded-sm px-4 py-2.5 text-sm outline-none focus:border-[#E84040] transition-colors resize-none"
            placeholder="How can we help?"
          />
        </div>
        <button
          type="submit"
          className="bg-[#E84040] text-white px-8 py-3 text-sm font-semibold rounded-sm hover:bg-[#cc3535] transition-colors cursor-pointer"
        >
          Send Message
        </button>

        {/* RGPD notice */}
        <p className="text-xs text-gray-400 leading-relaxed pt-1">
          En soumettant ce formulaire, vous acceptez que vos données soient traitées par Dropship SAS
          afin de répondre à votre demande, conformément à notre{" "}
          <a href="/privacy" className="underline underline-offset-2 hover:text-gray-600 transition-colors">
            politique de confidentialité
          </a>
          . Vous pouvez exercer vos droits à tout moment en écrivant à{" "}
          <a href="mailto:dpo@dropship.fr" className="underline underline-offset-2 hover:text-gray-600 transition-colors">
            dpo@dropship.fr
          </a>.
        </p>
      </form>
    </div>
  )
}
