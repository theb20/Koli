import type { Metadata } from "next";
import { Poppins, Sacramento } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const sacramento = Sacramento({
  variable: "--font-sacramento",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Ember — Grilled Beef Burgers & Fast Food",
  description:
    "Ember : burgers grillés, poulet croustillant, pizzas et tacos. Cuisiné avec du feu, servi avec du cœur.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${poppins.variable} ${sacramento.variable}`}>
      <body className="min-h-screen bg-cream-100 font-body text-ink-950 antialiased">
        {children}
      </body>
    </html>
  );
}
