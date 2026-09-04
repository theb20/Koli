import { AlertTriangle } from "lucide-react";
import { Button } from "./Button";

export function ErrorState({
  title = "Une erreur est survenue",
  description = "Merci de réessayer dans un instant.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl bg-white px-6 py-16 text-center shadow-card">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-maroon-600/10 text-maroon-600">
        <AlertTriangle size={26} />
      </div>
      <h3 className="font-heading text-lg font-bold text-ink-950">{title}</h3>
      <p className="max-w-xs text-sm text-ink-950/55">{description}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Réessayer
        </Button>
      )}
    </div>
  );
}
