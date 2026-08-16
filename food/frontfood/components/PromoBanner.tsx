import Image from "next/image";
import { Phone } from "lucide-react";
import { Reveal } from "./Reveal";

type PromoBannerProps = {
  title: string;
  image: string;
  tone: "dark" | "orange" | "maroon";
  price?: string;
  phone?: string;
  badge?: string;
  ctaLabel: string;
  delay?: number;
};

const TONE_BG: Record<PromoBannerProps["tone"], string> = {
  dark: "bg-ink-950",
  orange: "bg-brand-orange",
  maroon: "bg-maroon-700",
};

const TONE_TEXT: Record<PromoBannerProps["tone"], string> = {
  dark: "text-cream-100",
  orange: "text-ink-950",
  maroon: "text-cream-100",
};

export function PromoBanner({ title, image, tone, price, phone, badge, ctaLabel, delay = 0 }: PromoBannerProps) {
  const light = tone !== "orange";

  return (
    <Reveal delay={delay} className="h-full">
      <article
        className={`relative flex h-full min-h-[320px] flex-col justify-end overflow-hidden rounded-3xl p-7 shadow-card transition-transform duration-300 hover:-translate-y-1.5 ${TONE_BG[tone]}`}
      >
        <Image
          src={image}
          alt={title}
          fill
          sizes="(min-width: 1024px) 33vw, 90vw"
          className={`object-cover ${light ? "opacity-40" : "opacity-30"}`}
        />
        <div
          className={`absolute inset-0 bg-gradient-to-t ${
            light ? "from-black/80 via-black/20 to-transparent" : "from-white/70 via-white/10 to-transparent"
          }`}
          aria-hidden="true"
        />

        {badge && (
          <span
            className={`absolute top-5 right-5 -rotate-[8deg] rounded-full px-3 py-1.5 font-heading text-xs font-extrabold tracking-wide uppercase shadow-md ${
              light ? "bg-brand-yellow text-ink-950" : "bg-ink-950 text-brand-yellow"
            }`}
          >
            {badge}
          </span>
        )}

        <div className={`relative ${TONE_TEXT[tone]}`}>
          <h3 className="font-heading text-2xl font-extrabold tracking-tight">{title}</h3>

          {price && <p className="font-heading mt-2 text-3xl font-extrabold">{price}</p>}

          {phone && (
            <p className="font-heading mt-2 flex items-center gap-2 text-lg font-bold">
              <Phone size={18} />
              {phone}
            </p>
          )}

          <a
            href="#menu"
            className={`mt-5 inline-block rounded-full px-6 py-2.5 font-heading text-sm font-bold tracking-wide uppercase transition-colors ${
              light
                ? "bg-cta text-white hover:bg-cta-dark"
                : "bg-ink-950 text-cream-100 hover:bg-ink-900"
            }`}
          >
            {ctaLabel}
          </a>
        </div>
      </article>
    </Reveal>
  );
}
