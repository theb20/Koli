import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { CartConflictDialog } from "@/components/cart/CartConflictDialog";
import { CartSummaryBar } from "@/components/cart/CartSummaryBar";
import { PromoOneBanner } from "@/components/PromoOneBanner";
import { ToastPortal } from "@/components/ui/ToastPortal";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Régal Express — Livraison de repas",
  description:
    "Régal Express : les plats de vos restaurants préférés, livrés chez vous.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={archivo.variable}>
      <body className="min-h-screen bg-cream-100 font-body text-ink-950 antialiased pb-16 sm:pb-0">
        <Header />
        {children}
        <Footer />
        <MobileBottomNav />
        <CartDrawer />
        <CartConflictDialog />
        <CartSummaryBar />
        <PromoOneBanner />
        <ToastPortal />
      </body>
    </html>
  );
}
