import { SearchX } from "lucide-react";
import { FeedTopBar } from "@/components/shop/FeedTopBar";
import { FeedContent } from "@/components/shop/FeedContent";
import { CategoryIconRow } from "@/components/shop/CategoryIconRow";
import { AppSidebar } from "@/components/shop/AppSidebar";
import { FilterSortBar } from "@/components/shop/FilterSortBar";
import { RankingInfoLink } from "@/components/shop/RankingInfoLink";
import { RestaurantCard } from "@/components/shop/RestaurantCard";
import { ProductCard } from "@/components/ProductCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { searchCatalog, type SortOption } from "@/lib/data";
import type { Restaurant } from "@/lib/types";

type SearchPageProps = {
  searchParams: {
    q?: string;
    categorie?: string;
    tri?: string;
    prix?: string;
    ouvert?: string;
    livraison?: string;
    vege?: string;
    halal?: string;
    promo?: string;
  };
};

export default function RecherchePage({ searchParams }: SearchPageProps) {
  const hasActiveFilters = Boolean(
    searchParams.q?.trim() ||
      searchParams.categorie ||
      searchParams.promo === "1" ||
      searchParams.tri ||
      searchParams.prix ||
      searchParams.ouvert === "1" ||
      searchParams.livraison === "1" ||
      searchParams.vege === "1" ||
      searchParams.halal === "1"
  );

  return (
    <div>
      <div className="sticky top-0 z-30 border-b border-ink-950/8 bg-cream-100 px-5 pt-3 sm:px-8">
        <div className="mx-auto">
          <FeedTopBar />
          <CategoryIconRow />
        </div>
      </div>

      <div className="lg:flex">
        <AppSidebar />

        <div className="min-w-0 flex-1 px-5 pb-16 pt-4 sm:px-8">
          <div className="mx-auto max-w-9xl">
            <FilterSortBar />
            <div className="mt-2.5">
              <RankingInfoLink />
            </div>

            {hasActiveFilters ? (
              <ResultsView searchParams={searchParams} />
            ) : (
              <div className="mt-6">
                <FeedContent />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultsView({ searchParams }: SearchPageProps) {
  const { restaurants, matchedProducts } = searchCatalog({
    q: searchParams.q,
    categorySlug: searchParams.categorie,
    sort: searchParams.tri as SortOption | undefined,
    priceRanges: searchParams.prix
      ? (searchParams.prix.split(",") as Restaurant["priceRange"][])
      : undefined,
    openNow: searchParams.ouvert === "1",
    freeDelivery: searchParams.livraison === "1",
    vegetarian: searchParams.vege === "1",
    halal: searchParams.halal === "1",
    promotedOnly: searchParams.promo === "1",
  });

  const hasQuery = Boolean(searchParams.q?.trim());
  const isEmpty = restaurants.length === 0 && matchedProducts.length === 0;

  return (
    <div className="mt-5">
      {hasQuery && (
        <h1 className="font-heading text-xl font-extrabold text-ink-950 sm:text-2xl">
          Résultats pour « {searchParams.q} »
        </h1>
      )}

      {isEmpty ? (
        <div className="mt-10">
          <EmptyState
            icon={SearchX}
            title="Aucun résultat"
            description="Essayez un autre mot-clé ou modifiez vos filtres."
          />
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-10">
          {matchedProducts.length > 0 && (
            <section>
              <h2 className="font-heading text-lg font-bold text-ink-950">Plats correspondants</h2>
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {matchedProducts.map(({ product, restaurant }) => (
                  <ProductCard key={product.id} product={product} restaurant={restaurant} />
                ))}
              </div>
            </section>
          )}

          {restaurants.length > 0 && (
            <section>
              <h2 className="font-heading text-lg font-bold text-ink-950">Restaurants</h2>
              <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {restaurants.map((r) => (
                  <RestaurantCard key={r.id} restaurant={r} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
