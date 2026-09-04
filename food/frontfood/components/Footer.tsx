"use client";

import { useState, type FormEvent } from "react";
import { usePathname } from "next/navigation";
import { Send, MapPin, Phone, Mail, Globe } from "lucide-react";
import { Logo } from "./Logo";
import { useUiStore } from "@/lib/store/uiStore";

// lucide-react n'inclut plus les icônes de marque — glifos simples dessinés à la main.
function InstagramGlyph() {
  return (
    <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FacebookGlyph() {
  return (
    <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M15 8h-2a2 2 0 0 0-2 2v10M9 13h6" strokeLinecap="round" />
      <path d="M15 3H9a6 6 0 0 0-6 6v6a6 6 0 0 0 6 6h6a6 6 0 0 0 6-6V9a6 6 0 0 0-6-6Z" />
    </svg>
  );
}

function TwitterGlyph() {
  return (
    <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="currentColor" strokeWidth={2}>
      <path
        d="M22 5.9c-.7.3-1.5.6-2.3.7.8-.5 1.5-1.3 1.8-2.3-.8.5-1.7.8-2.6 1a4.1 4.1 0 0 0-7 3.7A11.6 11.6 0 0 1 3.4 4.6a4.1 4.1 0 0 0 1.3 5.5c-.7 0-1.3-.2-1.9-.5v.1c0 2 1.4 3.6 3.3 4a4.1 4.1 0 0 1-1.9.1c.5 1.6 2 2.8 3.8 2.9A8.2 8.2 0 0 1 2 18.4a11.6 11.6 0 0 0 6.3 1.8c7.5 0 11.7-6.3 11.7-11.7v-.5c.8-.6 1.5-1.3 2-2.1Z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AppleGlyph() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.5 1c.1 1.2-.4 2.4-1.1 3.3-.7.9-1.9 1.6-3 1.5-.1-1.2.4-2.4 1.1-3.2.8-.9 2-1.6 3-1.6zM20.6 17c-.6 1.3-.9 1.9-1.7 3-1.1 1.6-2.6 3.6-4.5 3.6-1.7 0-2.1-1.1-4.4-1.1-2.3 0-2.8 1.1-4.5 1.1-1.9 0-3.3-1.8-4.4-3.4C-1.5 16.8-.7 10 3.3 7.6c1.1-.7 2.5-1.1 3.9-.1.9.6 1.7 1 2.3 1 .6 0 1.6-.4 2.6-1 1.5-.7 2.9-.6 4.1.4-2.3 1.4-2.4 4.5-.1 5.9.4.3.9.5 1.3.6-.1.4-.3.9-.5 1.4z" />
    </svg>
  );
}

function PlayGlyph() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
      <path d="M3.6 2.3c-.4.3-.6.8-.6 1.4v16.6c0 .6.2 1.1.6 1.4l.1.1L13 12.5v-.1L3.7 2.2l-.1.1Z" />
      <path d="m16 9.5-2.6-1.5L10.2 11l3.2 3 2.6-1.5c.9-.5.9-2 0-2.5Z" />
      <path d="m13.4 12.9-9.7 9.5c.4.3.9.3 1.5 0l11-6.3-2.8-3.2Z" />
      <path d="m13.4 11.1 2.8-3.2-11-6.3c-.5-.3-1.1-.2-1.5.1l9.7 9.4Z" />
    </svg>
  );
}

// Ces liens (aide/partenaires/appli mobile) ne mènent pas encore vers un vrai
// espace dédié dans cette démo — on l'indique clairement plutôt que de
// pointer vers une page qui n'existe pas.
const HELP_LINKS = ["Centre d'aide", "Nous contacter", "Conditions", "Confidentialité"];
const PARTNER_LINKS = ["Ajoutez votre restaurant", "Devenez coursier-partenaire", "Créez un compte professionnel"];

export function Footer() {
  const pathname = usePathname();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const pushToast = useUiStore((s) => s.pushToast);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email) return;
    setSent(true);
    setEmail("");
  }

  function notifyComingSoon(label: string) {
    pushToast(`${label} — à venir dans cette démo.`, "info");
  }

  if (pathname === "/connexion") return null;

  return (
    <footer id="contact" className="bg-ink-950 pt-16 pb-8">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-5">
          <div className="col-span-2 lg:col-span-1">
            <a href="#top" className="text-cream-100">
              <Logo size={22} />
            </a>
            <p className="font-body mt-4 max-w-[26ch] text-sm leading-relaxed text-cream-100/50">
              Les plats de vos restaurants préférés, livrés chez vous.
            </p>
            <div className="mt-6 flex gap-3">
              {[InstagramGlyph, FacebookGlyph, TwitterGlyph].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    notifyComingSoon("Réseaux sociaux");
                  }}
                  aria-label="Rejoindre sur les réseaux sociaux"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-cream-100/15 text-cream-100/70 transition-colors hover:border-cta hover:text-cta"
                >
                  <Icon />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-heading text-sm font-bold tracking-wide text-cream-100">Aide</h4>
            <ul className="mt-4 flex flex-col gap-2.5">
              {HELP_LINKS.map((link) => (
                <li key={link}>
                  <button
                    onClick={() => notifyComingSoon(link)}
                    className="font-body text-left text-sm text-cream-100/55 transition-colors hover:text-cta"
                  >
                    {link}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-heading text-sm font-bold tracking-wide text-cream-100">Partenaires</h4>
            <ul className="mt-4 flex flex-col gap-2.5">
              {PARTNER_LINKS.map((link) => (
                <li key={link}>
                  <button
                    onClick={() => notifyComingSoon(link)}
                    className="font-body text-left text-sm text-cream-100/55 transition-colors hover:text-cta"
                  >
                    {link}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-heading text-sm font-bold tracking-wide text-cream-100">Villes</h4>
            <ul className="mt-4 flex flex-col gap-2.5">
              <li className="font-body text-sm text-cream-100/55">Paris</li>
            </ul>
            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={() => notifyComingSoon("Application mobile")}
                className="flex items-center gap-2 rounded-lg border border-cream-100/15 px-3 py-2 text-xs font-semibold text-cream-100/70 transition-colors hover:border-cta hover:text-cta"
              >
                <AppleGlyph />
                App Store
              </button>
              <button
                onClick={() => notifyComingSoon("Application mobile")}
                className="flex items-center gap-2 rounded-lg border border-cream-100/15 px-3 py-2 text-xs font-semibold text-cream-100/70 transition-colors hover:border-cta hover:text-cta"
              >
                <PlayGlyph />
                Google Play
              </button>
            </div>
          </div>

          <div>
            <h4 className="font-heading text-sm font-bold tracking-wide text-cream-100">Contact</h4>
            <ul className="font-body mt-4 flex flex-col gap-3 text-sm text-cream-100/55">
              <li className="flex items-center gap-2.5">
                <MapPin size={16} className="shrink-0 text-cta" />
                12 rue de la Grillade, 75011 Paris
              </li>
              <li className="flex items-center gap-2.5">
                <Phone size={16} className="shrink-0 text-cta" />
                01 84 60 22 15
              </li>
              <li className="flex items-center gap-2.5">
                <Mail size={16} className="shrink-0 text-cta" />
                bonjour@regal-express.fr
              </li>
            </ul>

            <form onSubmit={handleSubmit} className="mt-5 flex gap-2">
              <label htmlFor="newsletter-email" className="sr-only">
                Adresse e-mail
              </label>
              <input
                id="newsletter-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Votre e-mail"
                className="w-full rounded-full border border-cream-100/15 bg-white/5 px-4 py-2.5 text-sm text-cream-100 placeholder:text-cream-100/40 focus:border-cta focus:outline-none"
              />
              <button
                type="submit"
                aria-label="S'inscrire à la newsletter"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cta text-white transition-colors hover:bg-cta-dark"
              >
                <Send size={16} />
              </button>
            </form>
            {sent && (
              <p className="font-body mt-2 text-xs text-cta" role="status">
                Merci ! Vous êtes inscrit·e.
              </p>
            )}
          </div>
        </div>

        <div className="font-body mt-14 flex flex-col items-center justify-between gap-4 border-t border-cream-100/10 pt-6 text-xs text-cream-100/40 sm:flex-row">
          <div className="flex items-center gap-4">
            <span>© {new Date().getFullYear()} Régal Express.</span>
            <button onClick={() => notifyComingSoon("Politique de confidentialité")} className="hover:text-cta">
              Politique de confidentialité
            </button>
            <button onClick={() => notifyComingSoon("Conditions")} className="hover:text-cta">
              Conditions
            </button>
          </div>
          <span className="flex items-center gap-1.5">
            <Globe size={13} />
            Français
          </span>
        </div>
      </div>
    </footer>
  );
}
