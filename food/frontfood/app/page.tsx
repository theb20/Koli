import { Hero } from "@/components/Hero";
import { CategoryStrip } from "@/components/CategoryStrip";
import { AboutSection } from "@/components/AboutSection";
import { BestSellingSection } from "@/components/BestSellingSection";
import { HowItWorksSection } from "@/components/HowItWorksSection";
import { TestimonialSection } from "@/components/TestimonialSection";
import { PartnerSection } from "@/components/PartnerSection";
import { RestaurantRail } from "@/components/shop/RestaurantRail";
import { getNearbyRestaurants } from "@/lib/data";

export default function Home() {
  return (
    <main>
      <Hero />
      <CategoryStrip />
      <RestaurantRail
        title="Restaurants près de chez vous"
        restaurants={getNearbyRestaurants(8)}
        seeAllHref="/recherche"
      />
      <HowItWorksSection />
      <AboutSection />
      <BestSellingSection />
      <TestimonialSection />
      <PartnerSection />
    </main>
  );
}
