import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl items-center px-5 pt-24 sm:pt-28">
      <EmptyState
        icon={SearchX}
        title="Page introuvable"
        description="Cette page n'existe pas ou n'est plus disponible."
        action={
          <Button href="/" size="sm">
            Retour à l&apos;accueil
          </Button>
        }
      />
    </div>
  );
}
