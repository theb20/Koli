export function formatPriceCents(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

export function formatOrderDate(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Génère un identifiant de commande façon CMD-YYYYMMDD-###### */
export function generateOrderId(existingIds: string[] = []): string {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate()
  ).padStart(2, "0")}`;

  let id: string;
  do {
    const random = Math.floor(100000 + Math.random() * 900000);
    id = `CMD-${datePart}-${random}`;
  } while (existingIds.includes(id));

  return id;
}

/** Sélection pseudo-aléatoire mais stable pour une clé donnée (ex : livreur assigné par commande). */
export function seededPick<T>(items: T[], seed: string): T {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return items[hash % items.length];
}
