import type { Category } from "../types";

// Catégories de filtrage marketplace — indépendantes du tableau CATEGORIES
// codé en dur dans components/CategoryStrip.tsx (fichier intouchable), aucun
// lien ni import entre les deux.
export const CATEGORIES: Category[] = [
  { id: "cat-burgers", slug: "burgers", label: "Burgers", icon: "Beef" },
  { id: "cat-pizza", slug: "pizza", label: "Pizza", icon: "Pizza" },
  { id: "cat-poulet", slug: "poulet", label: "Poulet", icon: "Drumstick" },
  { id: "cat-tacos", slug: "tacos", label: "Tacos & Burritos", icon: "Sandwich" },
  { id: "cat-pates", slug: "pates", label: "Pâtes", icon: "Utensils" },
  { id: "cat-salades", slug: "salades", label: "Salades & Bowls", icon: "Salad" },
  { id: "cat-desserts", slug: "desserts", label: "Desserts", icon: "IceCreamCone" },
  { id: "cat-boissons", slug: "boissons", label: "Boissons", icon: "CupSoda" },
  { id: "cat-petit-dejeuner", slug: "petit-dejeuner", label: "Petit-déjeuner", icon: "Coffee" },
];
