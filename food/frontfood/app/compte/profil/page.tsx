"use client";

import { useEffect, useState } from "react";
import { ProfileForm } from "@/components/account/ProfileForm";

export default function ProfilPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <div>
      <h2 className="font-heading text-lg font-bold text-ink-950">Profil</h2>
      <p className="mt-1 text-sm text-ink-950/50">
        Ces informations pré-remplissent vos commandes. Rien n&apos;est envoyé à un serveur.
      </p>
      <div className="mt-4">
        <ProfileForm />
      </div>
    </div>
  );
}
