import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PackifyHero } from "../components/sections/PackifyHero";
import { DropShopSection } from "../components/sections/DropShopSection";
import { DealOfTheDay as PromoPairs } from "../components/sections/PromoPairs";
import { BestSellersSection } from "../components/sections/BestSellersSection";
import { WhyKoliSection } from "../components/sections/WhyKoliSection";
import { TestimonialsSection } from "../components/sections/TestimonialsSection";
import PubImg from "../components/sections/PubImg";
import { PageMeta } from "../components/seo/PageMeta";
import { FaqSection } from "../components/sections/FaqSection";
import { FlashSalesSection } from "../components/sections/FlashSalesSection";
import { RecentlyViewedSection } from "../components/sections/RecentlyViewedSection";

import ScalableCarousel from "../components/sections/ScalableCarousel";
import type {
  CarouselItem,
} from "../components/sections/ScalableCarousel";
import { API_BASE } from "../lib/api";

type RandomProduct = {
  id: number; name: string; price: number; oldPrice?: number | null
  images: { url: string; thumbnailUrl?: string | null }[]
};

type BestSellerProduct = {
  id: number; name: string; sold: number
  images: { url: string; thumbnailUrl?: string | null }[]
};

/** Fisher-Yates — évite le biais de `.sort(() => Math.random() - 0.5)`. */
function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function HomePage() {
  const navigate = useNavigate();

  // N'importe quel produit actif du catalogue — pas seulement ceux en
  // vente flash — d'où un fetch dédié plutôt que de réutiliser ['flash-sales'].
  const { data: productsData } = useQuery({
    queryKey: ["home-carousel-products"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/products?limit=30`);
      return res.json();
    },
    staleTime: 30_000,
  });

  // Nouvelle sélection aléatoire à chaque montage de la page (pas à chaque
  // re-render) — le tableau source ne change qu'avec `productsData`.
  const randomCarouselProducts = useMemo(() => {
    const products: RandomProduct[] = productsData?.data?.products ?? [];
    return shuffle(products).slice(0, 4).map(p => {
      const hasRealDiscount = !!p.oldPrice && p.oldPrice > p.price;
      const discount = hasRealDiscount
        ? `-${Math.round(((p.oldPrice! - p.price) / p.oldPrice!) * 100)}%`
        : undefined;
      const img = p.images[0]?.thumbnailUrl || p.images[0]?.url || "";
      return {
        id: p.id,
        name: p.name,
        image: img,
        discount,
        onClick: () => navigate(`/catalogue/${p.id}`),
      };
    });
  }, [productsData, navigate]);

  // Le produit le plus vendu du catalogue — même logique que
  // BestSellersSection (sort=popular, trié par `sold` décroissant côté API).
  const { data: bestSellerData } = useQuery({
    queryKey: ["home-best-seller"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/products?sort=popular&limit=1`);
      return res.json();
    },
    staleTime: 5 * 60_000,
  });

  const bestSeller: BestSellerProduct | undefined = bestSellerData?.data?.products?.[0];

  /*
   * ========================================================
   * CAROUSEL DATA
   * ========================================================
   */

  const cards: CarouselItem[] = [
    /*
     * ======================================================
     * VIDEO CARD
     * ======================================================
     */

    {
      id: "video-1",
      type: "video",

      title: "Le style à portée de vue",

      subtitle: "Regarder en direct",

      video: {
        src: "/vds/2.webm",
        poster: "/wall/meta.png",
        muted: true,
        loop: true,
      },

      sponsored: true,
    },

    /*
     * ======================================================
     * IMAGE CARD
     * ======================================================
     */

    {
      id: "delivery-1",
      type: "image",

      title: "Livraison gratuite",

      subtitle: "À partir d'un certain montant.",

      image: "/wall/delivery.png",

      background: "#ff6200",

      onClick: () => {
        console.log("Livraison gratuite");
      },
    },
    {
      id: "delivery-2",
      type: "image",

      title: "Espace Marchand",
      subtitle: "Tout ce qu’il vous faut pour gérer votre activité",

      image: "/wall/marchand.png",

      background: "#00ff1aff",
      badge: "Bientôt",  

      onClick: () => {
        console.log("Marchand");
      },
      
    },

    /*
     * ======================================================
     * PRODUCTS CARD
     * ======================================================
     */

    {
      id: "random-products-1",

      type: "products",

      title: "À découvrir",

      background: "#087d3e",

      textColor: "text-white",

      products: randomCarouselProducts,
    },

    /*
     * ======================================================
     * BEAUTY CARD
     * ======================================================
     */

    {
      id: "best-seller-1",

      type: "beauty",

      title: "Notre meilleure vente",

      subtitle: bestSeller?.name ?? "",

      image: bestSeller?.images[0]?.thumbnailUrl || bestSeller?.images[0]?.url || "",

      background: "#ff6200",

      onClick: () => {
        if (bestSeller) navigate(`/catalogue/${bestSeller.id}`);
      },
    },
    {
      id: "delivery-3",
      type: "image",

      title: "Vivez connecté",
      subtitle: "Optimiser votre espace",

      image: "/wall/wall.png",

      background: "#1000bcff",

      onClick: () => {
        console.log("Connecté");
      },
      
    },
    {
      id: "delivery-4",
      type: "image",

      title: "Parrainage",
      subtitle: "Obtenez des points à chaque parrainage",

      image: "/wall/parainage.png",

      background: "#d97e00ff",

      onClick: () => {
        console.log("Parrainage");
      },
      
    },
    {
      id: "delivery-5",
      type: "image",

      title: "Pour 28.000 Fcfa",
      subtitle: "Fire TV Stick HD",

      image: "/wall/wallfiretv.png",

      background: "#08bf45ff",

      onClick: () => {
        console.log("Fire TV Stick HD");
      },
      
    },
  ];

  /*
   * ========================================================
   * PAGE
   * ========================================================
   */

  return (
    <>
      {/* ====================================================
          SEO
      ==================================================== */}

      <PageMeta
        title="Accueil"
        description="Skignas — votre marketplace en ligne. Découvrez des milliers de produits sélectionnés, paiement sécurisé et livraison rapide en Côte d'Ivoire."
        path="/"
      />

      {/* ====================================================
          HERO
      ==================================================== */}

      <PackifyHero />

      {/* ====================================================
          SCALABLE CAROUSEL
      ==================================================== */}

      <section className="w-full py-6">
        <ScalableCarousel
          items={cards.filter(c =>
            (c.id !== "random-products-1" || randomCarouselProducts.length > 0) &&
            (c.id !== "best-seller-1" || !!bestSeller)
          )}
          cardWidth={350}
          cardHeight={510}
          gap={16}
          showArrows={true}
          showDots={true}
          pauseInactiveVideos={true}
          scrollBehavior="smooth"
          autoSlide={false}
          rounded="16px"
        />
      </section>

      {/* ====================================================
          DROP SHOP
      ==================================================== */}

      <DropShopSection />

      {/* ====================================================
          FLASH SALES
      ==================================================== */}

      <FlashSalesSection />

      {/* ====================================================
          BEST SELLERS
      ==================================================== */}

      <BestSellersSection />

      {/* ====================================================
          RECENTLY VIEWED
      ==================================================== */}

      <RecentlyViewedSection />

      {/* ====================================================
          WHY KOLI
      ==================================================== */}

      <WhyKoliSection />

      {/* ====================================================
          TESTIMONIALS
      ==================================================== */}

      <TestimonialsSection />

      {/* ====================================================
          PUBLICITÉ
      ==================================================== */}

      <PubImg />

      {/* ====================================================
          PROMOTIONS
      ==================================================== */}

      <PromoPairs />

      {/* ====================================================
          FAQ
      ==================================================== */}

      <FaqSection />
    </>
  );
}