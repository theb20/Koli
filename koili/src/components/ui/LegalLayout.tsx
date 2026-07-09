/**
 * LegalLayout — layout générique pour toutes les pages légales.
 * Scalable : passe juste un tableau de sections, tout le chrome
 * (TOC, scroll-spy, barre de progression, back-to-top) est géré ici.
 */
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Copy,
  Check,
  ArrowUp,
  Calendar,
  Clock,
} from "lucide-react";

/* ── Types ──────────────────────────────────────────────────────── */
export type LegalSection = {
  id: string;
  title: string;
  content: React.ReactNode;
};

export type LegalLayoutProps = {
  badge: string;
  accentColor?: string;
  title: string;
  subtitle: string;
  lastUpdated: string;
  readTime?: string;
  sections: LegalSection[];
  /** Email de contact affiché en pied de page — passez settings.supportEmail pour rester à jour. */
  contactEmail?: string;
};

/* ── Prose helpers — réutilisables dans les pages ──────────────── */
export function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 text-sm leading-relaxed text-gray-500">{children}</p>
  );
}

export function Strong({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold text-gray-700">{children}</strong>;
}

export function Ul({ items }: { items: string[] }) {
  return (
    <ul className="mb-4 mt-2 space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3 text-sm text-gray-500">
          <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function InfoBox({
  children,
  variant = "blue",
}: {
  children: React.ReactNode;
  variant?: "blue" | "green" | "amber";
}) {
  const styles = {
    blue:  "border-blue-100  bg-blue-50/70  text-blue-700",
    green: "border-green-100 bg-green-50/70 text-green-700",
    amber: "border-amber-100 bg-amber-50/70 text-amber-700",
  };
  return (
    <div
      className={`mb-4 rounded-xl border p-4 text-sm leading-relaxed ${styles[variant]}`}
    >
      {children}
    </div>
  );
}

export function SubTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 mt-6 text-base font-semibold text-gray-800">
      {children}
    </h3>
  );
}

/* ════════════════════════════════════════════════════════════════ */
export function LegalLayout({
  badge,
  accentColor = "#3b9c3c",
  title,
  subtitle,
  lastUpdated,
  readTime = "5 min",
  sections,
  contactEmail = "legal@skignas.ahobaut.fr",
}: LegalLayoutProps) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");
  const [showTop, setShowTop]   = useState(false);
  const [tocOpen, setTocOpen]   = useState(false);
  const [copied, setCopied]     = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const mainRef                 = useRef<HTMLDivElement>(null);

  /* ── Reading progress + back-to-top ── */
  useEffect(() => {
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      setProgress(scrollHeight > clientHeight ? (scrollTop / (scrollHeight - clientHeight)) * 100 : 0);
      setShowTop(scrollTop > 400);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ── Scroll-spy ── */
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([e]) => { if (e.isIntersecting) setActiveId(id); },
        { rootMargin: "-15% 0px -70% 0px" },
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [sections]);

  /* ── Hash navigation on page load ── */
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    // Wait for layout then scroll (requestAnimationFrame ensures elements are painted)
    const raf = requestAnimationFrame(() => {
      const el = document.getElementById(hash);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        setActiveId(hash);
      }
    });
    return () => cancelAnimationFrame(raf);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTocOpen(false);
  };

  const copyLink = (id: string) => {
    const url = `${window.location.href.split("#")[0]}#${id}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  /* ── Render ── */
  return (
    <div className="min-h-screen bg-white">

      {/* ── Progress bar — sits above the fixed header (z-[51]) ── */}
      <div className="fixed inset-x-0 top-0 z-[51] h-[3px] bg-gray-100/60">
        <motion.div
          className="h-full origin-left"
          style={{ width: `${progress}%`, background: accentColor }}
        />
      </div>

      {/* ── Hero ── */}
      <div className="border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-10">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Badge */}
            <span
              className="mb-5 inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em]"
              style={{ background: `${accentColor}14`, color: accentColor }}
            >
              {badge}
            </span>

            {/* Title */}
            <h1 className="mb-4 text-3xl font-black leading-[1.08] tracking-tight text-gray-900 sm:text-5xl">
              {title}
            </h1>

            {/* Subtitle */}
            <p className="mb-6 max-w-2xl text-base leading-relaxed text-gray-400 sm:text-lg">
              {subtitle}
            </p>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-5 text-xs text-gray-400">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Mis à jour le {lastUpdated}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Lecture {readTime}
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: accentColor }}
                />
                {sections.length} sections
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Mobile TOC ── Offsets: mobile=60px header, sm=108px, md=156px (nav shown) ── */}
      <div className="sticky top-[60px] sm:top-[108px] md:top-[156px] z-40 border-b border-gray-100 bg-white/95 backdrop-blur lg:hidden">
        <button
          onClick={() => setTocOpen((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3.5 text-sm font-semibold text-gray-700"
        >
          <span>
            Table des matières
            <span className="ml-2 text-xs font-normal text-gray-400">
              — {sections.find((s) => s.id === activeId)?.title}
            </span>
          </span>
          <motion.span animate={{ rotate: tocOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </motion.span>
        </button>

        <AnimatePresence>
          {tocOpen && (
            <motion.nav
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden border-t border-gray-100 bg-gray-50 px-4 py-3"
            >
              <div className="space-y-0.5">
                {sections.map(({ id, title }, i) => (
                  <button
                    key={id}
                    onClick={() => scrollTo(id)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-all ${
                      activeId === id
                        ? "bg-white font-semibold text-gray-900 shadow-sm"
                        : "text-gray-500 hover:bg-white/70 hover:text-gray-800"
                    }`}
                  >
                    <span
                      className="text-[10px] font-black tabular-nums"
                      style={{ color: activeId === id ? accentColor : "#d1d5db" }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {title}
                  </button>
                ))}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </div>

      {/* ── Body ── */}
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-10 lg:py-16">
        <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-16 xl:gap-24">

          {/* ── Sidebar TOC (desktop) ── */}
          <aside className="hidden lg:block">
            {/* Offset = 156px header + 16px breathing room = 172px */}
            <div className="sticky top-[172px] space-y-0.5">
              <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-300">
                Sommaire
              </p>

              {sections.map(({ id, title }, i) => {
                const isActive = activeId === id;
                return (
                  <button
                    key={id}
                    onClick={() => scrollTo(id)}
                    className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-all duration-200 ${
                      isActive
                        ? "bg-gray-50 font-semibold text-gray-900"
                        : "text-gray-400 hover:bg-gray-50/70 hover:text-gray-700"
                    }`}
                  >
                    {/* Active bar */}
                    <motion.span
                      animate={{ opacity: isActive ? 1 : 0, scaleY: isActive ? 1 : 0.4 }}
                      transition={{ duration: 0.2 }}
                      className="h-5 w-[3px] shrink-0 rounded-full"
                      style={{ background: accentColor }}
                    />

                    {/* Number */}
                    <span
                      className="text-[10px] font-black tabular-nums transition-colors"
                      style={{ color: isActive ? accentColor : "#d1d5db" }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>

                    {/* Label */}
                    <span className="leading-tight">{title}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* ── Content ── */}
          <main ref={mainRef} className="min-w-0">
            <div className="divide-y divide-gray-100">
              {sections.map(({ id, title, content }, i) => (
                <motion.section
                  key={id}
                  id={id}
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="scroll-mt-[120px] sm:scroll-mt-[168px] md:scroll-mt-[216px] lg:scroll-mt-[172px] py-12 first:pt-0"
                >
                  {/* Section header */}
                  <div className="group mb-6 flex items-start gap-4">
                    {/* Number chip */}
                    <motion.span
                      whileHover={{ scale: 1.08 }}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black"
                      style={{ background: `${accentColor}12`, color: accentColor }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </motion.span>

                    {/* Title + copy link */}
                    <div className="flex flex-1 items-center gap-2">
                      <h2 className="text-xl font-bold leading-tight text-gray-900 sm:text-2xl">
                        {title}
                      </h2>

                      <AnimatePresence mode="wait">
                        <motion.button
                          key={copied === id ? "check" : "copy"}
                          initial={{ opacity: 0, scale: 0.7 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.7 }}
                          onClick={() => copyLink(id)}
                          className="ml-1 rounded-md p-1.5 text-gray-300 opacity-0 transition-all hover:bg-gray-100 hover:text-gray-500 group-hover:opacity-100"
                          title="Copier le lien"
                        >
                          {copied === id
                            ? <Check className="h-3.5 w-3.5 text-emerald-500" />
                            : <Copy className="h-3.5 w-3.5" />}
                        </motion.button>
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Prose content */}
                  <div className="lg:pl-[52px]">{content}</div>
                </motion.section>
              ))}
            </div>

            {/* Bottom stamp */}
            <div className="mt-8 flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-black"
                style={{ background: `${accentColor}12`, color: accentColor }}
              >
                ✓
              </span>
              <p className="text-xs text-gray-400">
                Document mis à jour le{" "}
                <strong className="text-gray-600">{lastUpdated}</strong>.
                Pour toute question, contactez-nous à{" "}
                <a
                  href={`mailto:${contactEmail}`}
                  className="font-medium underline underline-offset-2 hover:text-gray-700"
                  style={{ color: accentColor }}
                >
                  {contactEmail}
                </a>
              </p>
            </div>
          </main>
        </div>
      </div>

      {/* ── Back to top ── */}
      <AnimatePresence>
        {showTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.75, y: 16 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{   opacity: 0, scale: 0.75, y: 16  }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-8 right-6 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
            title="Retour en haut"
          >
            <ArrowUp className="h-4 w-4 text-gray-600" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
