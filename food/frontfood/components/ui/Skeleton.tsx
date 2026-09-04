export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-ink-950/8 ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-white p-4 shadow-card">
      <Skeleton className="h-36 w-full rounded-2xl" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-3 w-1/3" />
    </div>
  );
}
