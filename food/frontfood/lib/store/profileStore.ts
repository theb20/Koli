"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// Profil local uniquement — il n'y a pas de backend d'authentification.
// Sert à pré-remplir la commande (nom/téléphone), pas à "se connecter".
type ProfileState = {
  name: string;
  email: string;
  phone: string;
  updateProfile: (patch: Partial<{ name: string; email: string; phone: string }>) => void;
};

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      name: "",
      email: "",
      phone: "",
      updateProfile: (patch) => set((state) => ({ ...state, ...patch })),
    }),
    { name: "koli-profile" }
  )
);
