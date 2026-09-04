"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { MapPin, ChevronDown } from "lucide-react";
import { useUiStore } from "@/lib/store/uiStore";
import { Reveal } from "./Reveal";

export function Hero() {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const pushToast = useUiStore((s) => s.pushToast);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // Pas de géocodage réel dans cette démo : on renvoie simplement vers le
    // catalogue local, adresse ou non.
    router.push(address.trim() ? `/recherche?q=${encodeURIComponent(address)}` : "/recherche");
  }

  return (
    <section id="top" className="relative isolate overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <Image
          src="/walls/1.png"
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent" />
      </div>

      <div className="relative mx-auto max-w-7xl px-5 py-28 sm:px-8 sm:py-36">
        <Reveal className="max-w-lg">
          <h1 className="font-heading text-4xl font-extrabold leading-[1.05] text-white sm:text-5xl lg:text-6xl">
            Vos restos locaux
            <br />
            livrés chez vous
          </h1>
          <p className="font-body mt-5 max-w-md text-base text-white/75 sm:text-lg">
            Des dizaines de restaurants du quartier, prêts à être commandés en
            quelques clics.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-2.5">
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <div className="flex flex-1 items-center gap-2 rounded-full bg-white px-5 py-3.5 shadow-card">
                <MapPin size={17} className="shrink-0 text-ink-950/40" />
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Saisissez l'adresse de livraison"
                  className="w-full bg-transparent text-sm text-ink-950 placeholder:text-ink-950/40 focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() => pushToast("Programmer une commande — à venir dans cette démo.", "info")}
                className="flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-white px-4 py-3.5 text-sm font-semibold text-ink-950 shadow-card"
              >
                Livrer maintenant
                <ChevronDown size={14} />
              </button>
            </div>

            <button
              type="submit"
              className="rounded-full bg-cta px-7 py-3.5 text-sm font-bold text-white transition-colors hover:bg-cta-dark sm:self-start"
            >
              Trouver un restaurant
            </button>
          </form>

          <p className="font-body mt-4 text-sm text-white/70">
            Ou{" "}
            <Link href="/connexion" className="font-semibold text-white underline underline-offset-2">
              Connexion
            </Link>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
