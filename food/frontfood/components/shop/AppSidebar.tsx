"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Home,
  Flame,
  Percent,
  Utensils,
  MapPin,
  ShoppingBag,
  ClipboardList,
  Heart,
  RotateCcw,
  User,
  MapPinned,
  CreditCard,
  Bell,
  Settings,
  CircleHelp,
  MessageCircle,
  TicketPercent,
  Star,
  Search,
  type LucideIcon,
} from "lucide-react";

import { useProfileStore } from "@/lib/store/profileStore";
import { useCartStore, getItemCount } from "@/lib/store/cartStore";

/* =========================================================
   TYPES
========================================================= */

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
  match?: (
    pathname: string,
    searchParams: URLSearchParams
  ) => boolean;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

/* =========================================================
   COMPONENT
========================================================= */

export function AppSidebar() {
  const [mounted, setMounted] = useState(false);

  const pathname = usePathname();
  const searchParams = useSearchParams();

  const profile = useProfileStore();
  const cartItems = useCartStore((state) => state.items);

  useEffect(() => {
    setMounted(true);
  }, []);

  /* =======================================================
     STATE
  ======================================================= */

  const cartCount = useMemo(
    () => (mounted ? getItemCount(cartItems) : 0),
    [mounted, cartItems]
  );

  const hasProfile = useMemo(
    () =>
      mounted &&
      Boolean(
        profile.name ||
          profile.email ||
          profile.phone
      ),
    [
      mounted,
      profile.name,
      profile.email,
      profile.phone,
    ]
  );

  /* =======================================================
     ACTIVE ROUTE
  ======================================================= */

  const isActive = (item: NavItem) => {
    if (item.match) {
      return item.match(pathname, searchParams);
    }

    return pathname === item.href;
  };

  /* =======================================================
     NAVIGATION
  ======================================================= */

  const sections: NavSection[] = [
    {
      title: "Découvrir",

      items: [
        {
          label: "Accueil",
          href: "/recherche",
          icon: Home,
          match: (_, params) =>
            pathname === "/recherche" &&
            !params.get("promo") &&
            !params.get("category"),
        },

        {
          label: "Populaires",
          href: "/recherche?sort=popular",
          icon: Flame,
        },

        {
          label: "Offres",
          href: "/recherche?promo=1",
          icon: Percent,
          match: (_, params) =>
            params.get("promo") === "1",
        },

        {
          label: "Catégories",
          href: "/categories",
          icon: Utensils,
        },

        {
          label: "Autour de moi",
          href: "/autour-de-moi",
          icon: MapPin,
        },
      ],
    },

    {
      title: "Mes commandes",

      items: [
        {
          label: "Panier",
          href: "/panier",
          icon: ShoppingBag,
          badge: cartCount,
        },

        {
          label: "Mes commandes",
          href: "/compte/commandes",
          icon: ClipboardList,
        },

        {
          label: "Mes favoris",
          href: "/compte/favoris",
          icon: Heart,
        },

        {
          label: "Commander à nouveau",
          href: "/compte/recommander",
          icon: RotateCcw,
        },

        {
          label: "Mes coupons",
          href: "/compte/coupons",
          icon: TicketPercent,
        },

        {
          label: "Fidélité",
          href: "/compte/fidelite",
          icon: Star,
        },
      ],
    },

    {
      title: "Mon compte",

      items: [
        {
          label: "Mon profil",
          href: "/compte/profil",
          icon: User,
        },

        {
          label: "Mes adresses",
          href: "/compte/adresses",
          icon: MapPinned,
        },

        {
          label: "Paiements",
          href: "/compte/paiements",
          icon: CreditCard,
        },

        {
          label: "Notifications",
          href: "/compte/notifications",
          icon: Bell,
        },

        {
          label: "Paramètres",
          href: "/compte/parametres",
          icon: Settings,
        },
      ],
    },

    {
      title: "Aide",

      items: [
        {
          label: "Centre d'aide",
          href: "/aide",
          icon: CircleHelp,
        },

        {
          label: "Nous contacter",
          href: "/contact",
          icon: MessageCircle,
        },
      ],
    },
  ];

  /* =======================================================
     ITEM
  ======================================================= */

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = isActive(item);

    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={
          active ? "page" : undefined
        }
        className={[
          "group relative flex w-full",
          "min-h-10 items-center",
          "gap-3 rounded-xl",
          "px-3 py-2",
          "transition-all duration-200",
          "ease-out",

          "text-[clamp(0.75rem,0.85vw,0.875rem)]",
          "font-medium",

          active
            ? "bg-neutral-100 text-black"
            : [
                "text-neutral-600",
                "hover:bg-neutral-50",
                "hover:text-black",
              ].join(" "),
        ].join(" ")}
      >
        {/* Active indicator */}

        {active && (
          <span
            aria-hidden="true"
            className="
              absolute left-0
              h-5 w-0.5
              rounded-full
              bg-black
            "
          />
        )}

        {/* Icon */}

        <span
          className={[
            "flex size-5 shrink-0",
            "items-center justify-center",
            "transition-transform duration-200",
            "group-hover:scale-105",

            active
              ? "text-black"
              : "text-neutral-500",
          ].join(" ")}
        >
          <Icon
            size={19}
            strokeWidth={2}
          />
        </span>

        {/* Label */}

        <span className="min-w-0 flex-1 truncate">
          {item.label}
        </span>

        {/* Badge */}

        {item.badge !== undefined &&
          item.badge > 0 && (
            <span
              className="
                flex h-5 min-w-5
                shrink-0 items-center
                justify-center
                rounded-full
                bg-black
                px-1.5
                text-[9px]
                font-bold
                leading-none
                text-white
              "
            >
              {item.badge > 99
                ? "99+"
                : item.badge}
            </span>
          )}
      </Link>
    );
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <aside
      aria-label="Navigation client"
      className="
        hidden lg:flex
        sticky top-0
        h-screen
        shrink-0
        flex-col
        overflow-y-auto

        bg-white

        w-[clamp(220px,17vw,275px)]

        px-[clamp(0.75rem,1.2vw,1.5rem)]
        py-[clamp(1rem,1.8vw,2rem)]

        scrollbar-thin
      "
    >
      {/* ===================================================
          NAVIGATION
      =================================================== */}

      <nav
        aria-label="Navigation principale"
        className="flex flex-1 flex-col"
      >
        {sections.map(
          (section, sectionIndex) => (
            <section
              key={section.title}
              className="
                mb-[clamp(1.25rem,2vw,1.75rem)]
              "
            >
              <h2
                className="
                  mb-2
                  px-3
                  text-[9px]
                  font-bold
                  uppercase
                  tracking-[0.14em]
                  text-neutral-400
                "
              >
                {section.title}
              </h2>

              <div className="space-y-0.5">
                {section.items.map(
                  renderItem
                )}
              </div>
            </section>
          )
        )}
      </nav>

      {/* ===================================================
          ACCOUNT FOOTER
      =================================================== */}

      <div className="mt-auto">
        <div
          className="
            mb-3
            h-px
            w-full
            bg-neutral-100
          "
        />

        {hasProfile ? (
          <Link
            href="/compte/profil"
            className="
              group flex items-center
              gap-3 rounded-xl
              px-3 py-2.5
              transition-colors
              hover:bg-neutral-50
            "
          >
            <div
              className="
                flex size-8
                shrink-0
                items-center
                justify-center
                rounded-full
                bg-neutral-100
                text-xs
                font-bold
                text-black
              "
            >
              {profile.name
                ?.charAt(0)
                ?.toUpperCase() || "U"}
            </div>

            <div className="min-w-0">
              <p
                className="
                  truncate
                  text-xs
                  font-semibold
                  text-black
                "
              >
                {profile.name ||
                  "Mon compte"}
              </p>

              <p
                className="
                  truncate
                  text-[10px]
                  text-neutral-400
                "
              >
                Voir mon profil
              </p>
            </div>
          </Link>
        ) : (
          <Link
            href="/connexion"
            className="
              flex min-h-10
              items-center
              justify-center
              rounded-xl
              bg-black
              px-4
              text-xs
              font-semibold
              text-white
              transition-all
              hover:bg-neutral-800
              active:scale-[0.98]
            "
          >
            Se connecter
          </Link>
        )}
      </div>
    </aside>
  );
}