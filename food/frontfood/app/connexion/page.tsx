"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QrCode } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useProfileStore } from "@/lib/store/profileStore";
import { useUiStore } from "@/lib/store/uiStore";

function GoogleGlyph() {
  return (
    <svg width={18} height={18} viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.56 2.7-3.87 2.7-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.94v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.94A9 9 0 0 0 0 9c0 1.45.35 2.83.94 4.03z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .94 4.97L3.95 7.3C4.66 5.17 6.65 3.58 9 3.58z" />
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

export default function ConnexionPage() {
  const [value, setValue] = useState("");
  const router = useRouter();
  const updateProfile = useProfileStore((s) => s.updateProfile);
  const pushToast = useUiStore((s) => s.pushToast);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    const isEmail = value.includes("@");
    updateProfile(isEmail ? { email: value.trim() } : { phone: value.trim() });
    pushToast("Profil local enregistré — aucun code n'a été envoyé dans cette démo.");
    router.push("/compte/profil");
  }

  function handleUnavailable(provider: string) {
    pushToast(`Connexion ${provider} indisponible dans cette démo — nécessite une intégration réelle.`, "info");
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-ink-950 px-5 py-4 sm:px-8">
        <Link href="/" className="text-cream-100">
          <Logo size={22} />
        </Link>
      </div>

      <div className="mx-auto max-w-sm px-5 py-12 sm:py-16">
        <h1 className="font-heading text-3xl font-extrabold leading-tight text-ink-950">
          Indiquez votre numéro de téléphone ou votre adresse e-mail
        </h1>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Saisir n° de tél. ou e-mail"
            className="rounded-xl bg-ink-950/5 px-4 py-3.5 text-sm text-ink-950 placeholder:text-ink-950/40 focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <button
            type="submit"
            className="rounded-xl bg-ink-950 py-3.5 text-sm font-bold text-cream-100 transition-colors hover:bg-ink-900"
          >
            Continuer
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-ink-950/40">
          <span className="h-px flex-1 bg-ink-950/10" />
          ou
          <span className="h-px flex-1 bg-ink-950/10" />
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => handleUnavailable("Google")}
            className="flex items-center justify-center gap-2.5 rounded-xl bg-ink-950/5 py-3.5 text-sm font-semibold text-ink-950 transition-colors hover:bg-ink-950/10"
          >
            <GoogleGlyph />
            Continuer avec Google
          </button>
          <button
            onClick={() => handleUnavailable("Apple")}
            className="flex items-center justify-center gap-2.5 rounded-xl bg-ink-950/5 py-3.5 text-sm font-semibold text-ink-950 transition-colors hover:bg-ink-950/10"
          >
            <AppleGlyph />
            Continuer avec Apple
          </button>
        </div>

        <div className="my-5 flex items-center gap-3 text-xs text-ink-950/40">
          <span className="h-px flex-1 bg-ink-950/10" />
          ou
          <span className="h-px flex-1 bg-ink-950/10" />
        </div>

        <button
          onClick={() => handleUnavailable("par QR code")}
          className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-ink-950/5 py-3.5 text-sm font-semibold text-ink-950 transition-colors hover:bg-ink-950/10"
        >
          <QrCode size={17} />
          Connectez-vous avec le QR code
        </button>

        <p className="mt-6 text-xs leading-relaxed text-ink-950/40">
          En continuant, vous acceptez que ce profil reste local à cet appareil. Régal Express
          n&apos;envoie aucun SMS ni e-mail de vérification dans cette démonstration.
        </p>
      </div>
    </div>
  );
}
