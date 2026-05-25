import { motion } from "framer-motion";
import { Mail, ArrowRight } from "lucide-react";
import Button from "../components/ui/btnStyle";
import { useNavigate } from "react-router-dom";
import { PageMeta } from "../components/seo/PageMeta";

export default function LoginPage() {
  const navigate = useNavigate();
  return (
    <>
    <PageMeta
      title="Connexion"
      description="Connectez-vous à votre espace Dropship pour accéder à vos commandes, votre panier et vos préférences."
      path="/login"
      noIndex
    />
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      {/* VIDEO BACKGROUND */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source
          src="https://media.istockphoto.com/id/2162665170/fr/vid%C3%A9o/concept-de-vision-robotique-dans-un-entrep%C3%B4t-des-travailleurs-g%C3%A8rent-les-stocks-au-centre.mp4?s=mp4-640x640-is&k=20&c=ADWTTgzfDHE04Yk9RF4AFkNic8ahiSmRMbDMb7lDJLw="
          type="video/mp4"
        />
      </video>

      {/* DARK OVERLAY */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[6px]" />

      {/* CONTENT */}
      <div className="relative z-10 flex min-h-screen items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="lg:w-full relative lg:max-w-md lg:border rounded-2xl lg:border-white/10 lg:bg-white/10 p-8 lg:shadow-2xl lg:backdrop-blur-xl"
        >
          {/* LOGO / TITLE */}

          <img src="/imgs_dropship/logohori_dropship_white.png" className="w-full h-30 mb-4 hidden lg:block" alt="logo dropship" />
          <div className="flex justify-center items-center">
            <img src="/imgs_dropship/favicon-dropship.png" className="w-30 h-30 mb-4 block lg:hidden" alt="logo dropship" />
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-8 text-center"
          >
         
            <h1 className="text-3xl font-semibold tracking-tight">
              Connexion
            </h1>
            <p className="mt-2 text-sm text-white/70">
              Accédez à votre espace sécurisé
            </p>
          </motion.div>

          {/* EMAIL INPUT */}
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm text-white/80">
                Adresse e-mail
              </label>

              <div className="flex items-center rounded-2xl border border-white/10 bg-white/5 px-4">
                <Mail className="h-4 w-4 text-white/50" />

                <input
                  type="email"
                  placeholder="vous@exemple.com"
                  className="w-full bg-transparent px-3 py-4 text-sm outline-none placeholder:text-white/40"
                />
              </div>
            </div>

            {/* CONTINUE BUTTON */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              whileHover={{ scale: 1.01 }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-4 text-sm font-medium text-black transition-all hover:bg-white/90"
            >
              Continuer
              <ArrowRight className="h-4 w-4" />
            </motion.button>

            {/* DIVIDER */}
            <div className="relative py-2">
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-transparent px-2 text-white/50">
                  ou continuer avec
                </span>
              </div>
            </div>

            {/* GOOGLE BUTTON */}
            <Button text="Google" />
          </div>

          {/* FOOTER */}
          <div className="mt-8 text-center text-sm text-white/60">
            Pas encore de compte ?{" "}
            <button onClick={() => navigate("/register")} className="font-medium text-white transition hover:underline">
              S'inscrire gratuitement →
            </button>
          </div>

          {/* LEGAL LINKS */}
          <div className="mt-6 flex items-center justify-center gap-4 text-[11px] text-white/30">
            <a href="/cgu"     target="_blank" rel="noreferrer" className="transition-colors hover:text-white/60">CGU</a>
            <span>·</span>
            <a href="/privacy" target="_blank" rel="noreferrer" className="transition-colors hover:text-white/60">Confidentialité</a>
            <span>·</span>
            <a href="/legal"   target="_blank" rel="noreferrer" className="transition-colors hover:text-white/60">Mentions légales</a>
          </div>
        </motion.div>
      </div>
    </div>
    </>
  );
}