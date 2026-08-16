"use client";

import { useState, type FormEvent } from "react";
import { Flame, Send, MapPin, Phone, Mail } from "lucide-react";

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

const COLUMNS = [
  {
    title: "Liens rapides",
    links: ["Accueil", "Menu", "À propos", "Blog"],
  },
  {
    title: "Nos services",
    links: ["Livraison", "À emporter", "Réservation", "Événements privés"],
  },
];

export function Footer() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email) return;
    setSent(true);
    setEmail("");
  }

  return (
    <footer id="contact" className="bg-ink-950 pt-16 pb-8">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-[1.1fr_repeat(2,1fr)_1.2fr]">
          <div>
            <a href="#top" className="flex items-center gap-2 font-heading text-2xl font-extrabold text-cream-100">
              <Flame className="text-brand-orange" size={24} />
              Ember
            </a>
            <p className="font-body mt-4 max-w-[28ch] text-sm leading-relaxed text-cream-100/50">
              Burgers grillés, poulet croustillant et pizzas — cuisinés au feu,
              servis avec cœur.
            </p>
            <div className="mt-6 flex gap-3">
              {[InstagramGlyph, FacebookGlyph, TwitterGlyph].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  aria-label="Rejoindre sur les réseaux sociaux"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-cream-100/15 text-cream-100/70 transition-colors hover:border-brand-orange hover:text-brand-orange"
                >
                  <Icon />
                </a>
              ))}
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="font-heading text-sm font-bold tracking-wide text-cream-100">{col.title}</h4>
              <ul className="mt-4 flex flex-col gap-2.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="font-body text-sm text-cream-100/55 transition-colors hover:text-brand-orange"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h4 className="font-heading text-sm font-bold tracking-wide text-cream-100">Contact</h4>
            <ul className="font-body mt-4 flex flex-col gap-3 text-sm text-cream-100/55">
              <li className="flex items-center gap-2.5">
                <MapPin size={16} className="shrink-0 text-brand-orange" />
                12 rue de la Grillade, 75011 Paris
              </li>
              <li className="flex items-center gap-2.5">
                <Phone size={16} className="shrink-0 text-brand-orange" />
                01 84 60 22 15
              </li>
              <li className="flex items-center gap-2.5">
                <Mail size={16} className="shrink-0 text-brand-orange" />
                bonjour@ember-burger.fr
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
                className="w-full rounded-full border border-cream-100/15 bg-white/5 px-4 py-2.5 text-sm text-cream-100 placeholder:text-cream-100/40 focus:border-brand-orange focus:outline-none"
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
              <p className="font-body mt-2 text-xs text-brand-yellow" role="status">
                Merci ! Vous êtes inscrit·e.
              </p>
            )}
          </div>
        </div>

        <div className="font-body mt-14 flex flex-col items-center justify-between gap-3 border-t border-cream-100/10 pt-6 text-xs text-cream-100/40 sm:flex-row">
          <p>© {new Date().getFullYear()} Ember. Tous droits réservés.</p>
          <p>Fait avec le feu, servi avec le cœur.</p>
        </div>
      </div>
    </footer>
  );
}
