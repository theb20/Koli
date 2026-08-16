import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { CategoryStrip } from "@/components/CategoryStrip";
import { AboutSection } from "@/components/AboutSection";
import { PromoGrid } from "@/components/PromoGrid";
import { BestSellingSection } from "@/components/BestSellingSection";
import { QuesadillaPromo } from "@/components/QuesadillaPromo";
import { MadeForYouSection } from "@/components/MadeForYouSection";
import { TestimonialSection } from "@/components/TestimonialSection";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <CategoryStrip />
        <AboutSection />
        <PromoGrid variant="meals" />
        <BestSellingSection />
        <QuesadillaPromo />
        <MadeForYouSection />
        <TestimonialSection />
        <PromoGrid variant="final" />
      </main>
      <Footer />
    </>
  );
}
