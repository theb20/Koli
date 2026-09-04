type LogoProps = {
  /** Taille du texte en px (contrôle tout le logo, y compris en tout petit format). */
  size?: number;
  className?: string;
};

/**
 * Logo texte Régal Express — « Régal » en noir, « Express » en vert. Basé
 * sur des unités relatives (em) pour rester net à n'importe quelle taille,
 * du favicon au grand format.
 */
export function Logo({ size = 24, className = "" }: LogoProps) {
  return (
    <span
      className={`font-heading flex flex-col font-extrabold tracking-tight ${className}`}
      style={{ fontSize: size, lineHeight: 1 }}
    >
      {/* "Régal" hérite de la couleur du parent (noir sur fond clair, blanc sur le bandeau noir) — "Express" reste vert en toute circonstance. */}
      <span>Régal</span> 
      <span className="text-cta text-sm"> Skignas</span>
    </span>
  );
}
