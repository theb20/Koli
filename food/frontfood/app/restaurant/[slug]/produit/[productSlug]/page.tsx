import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ProductDetailView } from "@/components/product/ProductDetailView";
import { getProductBySlug, getReviewsForProduct } from "@/lib/data";

type ProductPageProps = { params: { slug: string; productSlug: string } };

export function generateMetadata({ params }: ProductPageProps): Metadata {
  const entry = getProductBySlug(params.slug, params.productSlug);
  return { title: entry ? `${entry.product.name} — ${entry.restaurant.name}` : "Produit introuvable" };
}

export default function ProductPage({ params }: ProductPageProps) {
  const entry = getProductBySlug(params.slug, params.productSlug);
  if (!entry) notFound();

  const reviews = getReviewsForProduct(entry.product.id);

  return <ProductDetailView product={entry.product} restaurant={entry.restaurant} reviews={reviews} />;
}
