import type { Review } from "@/lib/types";
import { StarRating } from "../ui/StarRating";
import { formatOrderDate } from "@/lib/utils/format";

export function ProductReviews({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) {
    return <p className="text-sm text-ink-950/45">Aucun avis pour le moment.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {reviews.map((review) => (
        <div key={review.id} className="rounded-2xl bg-white p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="font-heading text-sm font-bold text-ink-950">{review.authorName}</span>
            <StarRating rating={review.rating} size={13} />
          </div>
          <p className="mt-2 text-sm text-ink-950/65">{review.comment}</p>
          <p className="mt-2 text-xs text-ink-950/35">{formatOrderDate(review.createdAt)}</p>
        </div>
      ))}
    </div>
  );
}
