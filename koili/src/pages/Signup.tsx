import { useState } from "react";
import { motion } from "framer-motion";
import {
  Mail,
  User,
  ArrowRight,
  Check
} from "lucide-react";
import Button from "../components/ui/btnStyle";
import { useNavigate } from "react-router-dom";
import CardUniverse from "../components/ui/Card-universe";
import { PageMeta } from "../components/seo/PageMeta";

/* ── Stagger helper ────────────────────────────────────────────── */
const fadeUp = (delay = 0) => ({
  initial:    { opacity: 0, y: 16 },
  animate:    { opacity: 1, y: 0  },
  transition: { duration: 0.5, delay },
});

/* ═══════════════════════════════════════════════════════════════ */
export default function SignupPage() {
  const navigate = useNavigate();
  const [agreed, setAgreed]     = useState(false);

  return (
    <>
    <PageMeta
      title="Créer un compte"
      description="Rejoignez Dropship gratuitement. Accédez à des milliers de produits, suivez vos commandes et profitez d'offres exclusives."
      path="/register"
      noIndex
    />
    <div className="relative min-h-screen overflow-hidden bg-black text-white">

      {/* ── Video background ── */}
      <video
        autoPlay muted loop playsInline
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source
          src="https://media.istockphoto.com/id/2162665170/fr/vid%C3%A9o/concept-de-vision-robotique-dans-un-entrep%C3%B4t-des-travailleurs-g%C3%A8rent-les-stocks-au-centre.mp4?s=mp4-640x640-is&k=20&c=ADWTTgzfDHE04Yk9RF4AFkNic8ahiSmRMbDMb7lDJLw="
          type="video/mp4"
        />
      </video>

      {/* ── Dark overlay ── */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-[8px]" />

      {/* ── Animated gradient orbs ── */}
      <motion.div
        animate={{ x: [0, 50, 0], y: [0, -40, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        className="absolute left-[8%] top-[20%] h-[520px] w-[520px] rounded-full bg-blue-700/20 blur-[130px]"
      />
      <motion.div
        animate={{ x: [0, -40, 0], y: [0, 35, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-[8%] right-[8%] h-[440px] w-[440px] rounded-full bg-blue-600/15 blur-[130px]"
      />
      <motion.div
        animate={{ x: [0, 20, 0], y: [0, 20, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        className="absolute right-[28%] top-[4%] h-[200px] w-[200px] rounded-full bg-blue-600/10 blur-[80px]"
      />

      {/* ── Main content ── */}
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4 sm:p-8">
        <div className="grid w-full max-w-5xl gap-10 lg:grid-cols-[1fr_430px] lg:items-center">

          {/* ══════════════════════════════════════════
              LEFT — branding (desktop only)
          ══════════════════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0  }}
            transition={{ duration: 0.85 }}
            className="hidden lg:flex lg:flex-col"
          >
            {/* Logo */}
            <div className=" w-90 h-20 flex items-center justify-center">
              <img
                src="/imgs_dropship/logohori_dropship_white.png"
                className="mb-12 w-auto h-auto object-contain"
                alt="Dropship"
              />
            </div>

            {/* Headline */}
            <h2 className="text-[1.9rem] leading-[1.1] tracking-tight">
            Achetez vos produits
            <span className="block bg-gradient-to-r from-blue-400 via-green-400 to-blue-400 bg-clip-text text-transparent">
                simplement
            </span>
            et recevez-les en quelques jours
            </h2>
           <p className="mt-5 max-w-sm text-lg leading-relaxed text-white/55">
            Plus de{" "}
            <span className="font-semibold text-white/90">12&nbsp;000</span>{" "}
            entrepreneurs font confiance à Dropship pour faire grandir leur business.
            </p>

            {/* Perks */}
            <CardUniverse
            title="Pourquoi nous choisir"
            items={[
                { text: "Navigation simple et rapide" },
                { text: "Livraison en quelques jours" },
                { text: "Prix compétitifs toute l’année" },
                { text: "Support client réactif 24/7" },
                { text: "Paiement sécurisé et fiable" },
            ]}
            description="Une expérience d’achat pensée pour être simple, rapide et efficace."
            buttonText="En savoir plus"
            onClick={() => navigate("/cgu")}
            />


            {/* Social proof */}
            <motion.div
              {...fadeUp(1.0)}
              className="mt-10 flex items-center gap-4"
            >
              <div className="flex -space-x-2.5">
                {[
                  "https://icon2.cleanpng.com/20180803/ubx/5ba055fe0b3b79a8f55892cc8186c6b6.webp",
                  "https://cdn.worldvectorlogo.com/logos/zara-2.svg",
                  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT2_7EeeGsOoVp5cSfWpyU9dhBuz71c-kNjZw&s",
                  "https://upload.wikimedia.org/wikipedia/commons/e/e8/Normal_logo_%28profile_picture%29.jpg",
                ].map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt={`avatar ${i + 1}`}
                    className="h-9 w-9 rounded-full border-2 border-black object-cover shadow-lg"
                  />
                ))}
              </div>
              <p className="text-sm text-white/50">
                <span className="font-semibold text-white">+500</span> Magasins actifs
              </p>
            </motion.div>
          </motion.div>

          {/* ══════════════════════════════════════════
              RIGHT — signup form
          ══════════════════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0  }}
            transition={{ duration: 0.75 }}
            className="relative w-full rounded-3xl border border-white/[0.08] bg-white/[0.06] p-8 shadow-[0_32px_80px_-16px_rgba(0,0,0,0.7)] backdrop-blur-2xl"
          >
            {/* Inner glow */}
            <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-violet-500/[0.07] via-transparent to-blue-600/[0.07]" />

            {/* Mobile logo */}
            <div className="mb-6 flex justify-center lg:hidden">
              <img
                src="/imgs_dropship/favicon-dropship.png"
                className="h-16 w-16 drop-shadow-2xl"
                alt="Dropship"
              />
            </div>

            {/* Title */}
            <motion.div {...fadeUp(0.2)} className="mb-7">
              <h1 className="text-[1.75rem] font-bold tracking-tight">Créer votre compte</h1>
              <p className="mt-1 text-sm text-white/45">
                Gratuit 30 jours · Sans carte bancaire
              </p>
            </motion.div>

            <div className="space-y-4">

              {/* ── Nom ── */}
              <motion.div {...fadeUp(0.30)}>
                <FieldLabel>Nom complet</FieldLabel>
                <InputRow icon={<User className="h-4 w-4" />}>
                  <input
                    type="text"
                    placeholder="Jean Dupont"
                    className="w-full bg-transparent px-3 py-[14px] text-sm outline-none placeholder:text-white/30"
                  />
                </InputRow>
              </motion.div>

              {/* ── Email ── */}
              <motion.div {...fadeUp(0.38)}>
                <FieldLabel>Adresse e-mail</FieldLabel>
                <InputRow icon={<Mail className="h-4 w-4" />}>
                  <input
                    type="email"
                    placeholder="vous@exemple.com"
                    className="w-full bg-transparent px-3 py-[14px] text-sm outline-none placeholder:text-white/30"
                  />
                </InputRow>
              </motion.div>

              {/* ── Terms ── */}
              <motion.div {...fadeUp(0.52)} className="flex items-start gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setAgreed((v) => !v)}
                  className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border transition-all duration-200 ${
                    agreed
                      ? "border-violet-500 bg-violet-500"
                      : "border-white/20 bg-white/5 hover:border-white/40"
                  }`}
                >
                  {agreed && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 25 }}
                    >
                      <Check className="h-2.5 w-2.5 text-white" />
                    </motion.div>
                  )}
                </button>
                <p className="text-xs leading-relaxed text-white/40">
                  J'accepte les{" "}
                  <a
                    href="/cgu"
                    target="_blank"
                    rel="noreferrer"
                    className="text-white/70 underline underline-offset-2 transition-colors hover:text-white"
                  >
                    conditions d'utilisation
                  </a>{" "}
                  et la{" "}
                  <a
                    href="/privacy"
                    target="_blank"
                    rel="noreferrer"
                    className="text-white/70 underline underline-offset-2 transition-colors hover:text-white"
                  >
                    politique de confidentialité
                  </a>
                </p>
              </motion.div>

              {/* ── CTA ── */}
              <motion.div {...fadeUp(0.58)}>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.015 }}
                  whileTap={{  scale: 0.980 }}
                  className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-blue-600 py-[15px] text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-shadow hover:shadow-blue-600/45"
                >
                  <span className="relative z-10">Créer mon compte</span>
                  <ArrowRight className="relative z-10 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  {/* shimmer sweep */}
                  <motion.span
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    animate={{ x: ["-110%", "210%"] }}
                    transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 3.5, ease: "easeInOut" }}
                  />
                </motion.button>
              </motion.div>

              {/* ── Divider ── */}
              <motion.div {...fadeUp(0.62)} className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/[0.07]" />
                </div>
                <div className="relative flex justify-center text-[11px] uppercase tracking-widest">
                  <span className="bg-transparent px-3 text-white/30">ou s'inscrire avec</span>
                </div>
              </motion.div>

              {/* ── Google ── */}
              <motion.div {...fadeUp(0.66)}>
                <Button text="Google" />
              </motion.div>
            </div>

            {/* Footer */}
            <motion.div {...fadeUp(0.72)} className="mt-7 text-center text-[13px] text-white/40">
              Déjà un compte ?{" "}
              <button
                onClick={() => navigate("/login")}
                className="font-medium text-white transition-opacity hover:opacity-75"
              >
                Se connecter →
              </button>
            </motion.div>
          </motion.div>

        </div>
      </div>
    </div>
    </>
  );
}

/* ── Sub-components ──────────────────────────────────────────── */
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-2 block text-[11px] font-medium uppercase tracking-widest text-white/40">
      {children}
    </label>
  );
}

function InputRow({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="group flex items-center rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 transition-all duration-200 focus-within:border-violet-500/50 focus-within:bg-white/[0.07] hover:border-white/[0.14]">
      <span className="text-white/30 transition-colors duration-200 group-focus-within:text-violet-400">
        {icon}
      </span>
      {children}
    </div>
  );
}
