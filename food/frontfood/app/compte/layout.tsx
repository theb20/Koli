import { AccountSidebarNav } from "@/components/account/AccountSidebarNav";

export default function CompteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl px-5 pb-24 pt-24 sm:px-8 sm:pt-28">
      <h1 className="font-heading text-2xl font-extrabold text-ink-950">Mon compte</h1>
      <p className="mt-1 text-sm text-ink-950/45">
        Profil local à cet appareil — aucun compte en ligne n&apos;est requis pour cette démo.
      </p>

      <div className="mt-6 flex flex-col gap-6 sm:flex-row">
        <AccountSidebarNav />
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
