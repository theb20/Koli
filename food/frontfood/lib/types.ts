// Types du catalogue et du parcours de commande — pensés comme le shape d'un vrai
// backend (mêmes noms/formes qu'on retrouverait dans une API), mais actuellement
// alimentés par des données mock locales (voir lib/data/). Les prix sont toujours
// en centimes (entiers) pour éviter les erreurs d'arrondi en virgule flottante.

export type Category = {
  id: string;
  slug: string;
  label: string;
  icon: string; // clé lucide-react, résolue par le composant qui l'affiche
};

export type Restaurant = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  coverImage: string;
  logoImage: string;
  categoryIds: string[];
  rating: number; // 0-5
  ratingCount: number;
  priceRange: "€" | "€€" | "€€€";
  deliveryFeeCents: number;
  minOrderCents: number;
  estimatedDeliveryMinutesMin: number;
  estimatedDeliveryMinutesMax: number;
  distanceKm: number;
  isOpen: boolean;
  openingHours: { day: string; hours: string }[];
  isVegetarianFriendly?: boolean;
  isHalal?: boolean;
  promoted?: boolean;
  tags: string[];
};

export type ProductOption = {
  id: string;
  name: string;
  priceDeltaCents: number;
  isDefault?: boolean;
};

export type ProductOptionGroup = {
  id: string;
  name: string;
  type: "single" | "multiple";
  required: boolean;
  minSelect: number;
  maxSelect: number;
  options: ProductOption[];
};

export type Product = {
  id: string;
  slug: string;
  restaurantId: string;
  menuCategory: string; // "Entrées" | "Plats" | "Accompagnements" | "Boissons" | "Desserts"...
  name: string;
  description: string;
  priceCents: number;
  image: string;
  rating: number;
  ratingCount: number;
  isAvailable: boolean;
  prepTimeMinutes?: number;
  optionGroups: ProductOptionGroup[];
  tags?: string[];
};

export type Promotion = {
  id: string;
  code: string;
  label: string;
  description: string;
  type: "percent" | "fixed";
  value: number; // % si "percent", centimes si "fixed"
  minOrderCents?: number;
};

export type Review = {
  id: string;
  restaurantId: string;
  productId?: string;
  orderId?: string;
  authorName: string;
  rating: number;
  comment: string;
  createdAt: string; // ISO
};

export type AddressType = "domicile" | "travail" | "autre";

export type Address = {
  id: string;
  label: string;
  type: AddressType;
  line1: string;
  line2?: string;
  ville: string;
  codePostal: string;
  instructions?: string;
};

export type DriverInfo = {
  name: string;
  vehicle: string;
  rating: number;
  photoSeed: string;
};

export type OrderStatus =
  | "PENDING"
  | "PAYMENT_CONFIRMED"
  | "RESTAURANT_CONFIRMED"
  | "PREPARING"
  | "READY_FOR_PICKUP"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

export const ORDER_STATUS_SEQUENCE: OrderStatus[] = [
  "PENDING",
  "PAYMENT_CONFIRMED",
  "RESTAURANT_CONFIRMED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

export type DeliveryMode = "livraison_standard" | "livraison_rapide" | "retrait";

export type OrderItem = {
  productId: string;
  productSlug: string;
  name: string;
  image: string;
  unitPriceCents: number;
  quantity: number;
  selectedOptions: { groupName: string; optionName: string; priceDeltaCents: number }[];
  notes?: string;
};

export type PaymentMethod = "carte" | "especes" | "mobile_money";

export type SimulatedOrder = {
  id: string;
  isDemo: true;
  createdAt: string; // ISO
  restaurantId: string;
  restaurantName: string;
  restaurantSlug: string;
  restaurantImage: string;
  items: OrderItem[];
  address: Address;
  deliveryMode: DeliveryMode;
  subtotalCents: number;
  deliveryFeeCents: number;
  serviceFeeCents: number;
  promo?: { code: string; discountCents: number };
  tipCents: number;
  totalCents: number;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  statusHistory: { status: OrderStatus; at: string }[];
  driver: DriverInfo | null;
  restaurantRated?: boolean;
};
