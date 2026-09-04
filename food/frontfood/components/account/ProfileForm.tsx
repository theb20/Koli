"use client";

import { useState, type FormEvent } from "react";
import { useProfileStore } from "@/lib/store/profileStore";
import { useUiStore } from "@/lib/store/uiStore";
import { Button } from "../ui/Button";

export function ProfileForm() {
  const profile = useProfileStore();
  const pushToast = useUiStore((s) => s.pushToast);

  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [phone, setPhone] = useState(profile.phone);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    profile.updateProfile({ name, email, phone });
    pushToast("Profil enregistré");
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4 rounded-2xl bg-white p-5 shadow-card">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-semibold text-ink-950">Nom</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Votre nom"
          className="rounded-xl border border-ink-950/15 px-4 py-2.5 focus:border-accent focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-semibold text-ink-950">E-mail</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="vous@exemple.fr"
          className="rounded-xl border border-ink-950/15 px-4 py-2.5 focus:border-accent focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-semibold text-ink-950">Téléphone</span>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="06 12 34 56 78"
          className="rounded-xl border border-ink-950/15 px-4 py-2.5 focus:border-accent focus:outline-none"
        />
      </label>
      <Button type="submit">Enregistrer</Button>
    </form>
  );
}
