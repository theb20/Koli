"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DeliveryMode, PaymentMethod, Product, Restaurant } from "../types";
import { getPromotionByCode } from "../data";

export type SelectedOption = { groupName: string; optionName: string; priceDeltaCents: number };

export type CartItem = {
  id: string;
  productId: string;
  productSlug: string;
  restaurantId: string;
  name: string;
  image: string;
  unitPriceCents: number;
  quantity: number;
  selectedOptions: SelectedOption[];
  notes?: string;
};

export type AddItemPayload = {
  product: Product;
  restaurant: Restaurant;
  selectedOptions: SelectedOption[];
  quantity: number;
  notes?: string;
};

export type AddItemResult = { ok: true } | { ok: false; reason: "restaurant-conflict" };

type PromoState = { code: string; discountCents: number } | null;

type CartState = {
  restaurantId: string | null;
  items: CartItem[];
  promo: PromoState;
  tipCents: number;
  deliveryMode: DeliveryMode | null;
  paymentMethod: PaymentMethod | null;

  addItem: (payload: AddItemPayload, force?: boolean) => AddItemResult;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  applyPromoCode: (code: string) => { ok: true } | { ok: false; reason: "invalid" | "min-order" };
  removePromo: () => void;
  setTip: (cents: number) => void;
  setDeliveryMode: (mode: DeliveryMode) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
};

function computeUnitPrice(product: Product, selectedOptions: SelectedOption[]) {
  return product.priceCents + selectedOptions.reduce((sum, o) => sum + o.priceDeltaCents, 0);
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      restaurantId: null,
      items: [],
      promo: null,
      tipCents: 0,
      deliveryMode: null,
      paymentMethod: null,

      addItem: (payload, force = false) => {
        const { product, restaurant, selectedOptions, quantity, notes } = payload;
        const current = get();

        if (!force && current.restaurantId && current.restaurantId !== restaurant.id && current.items.length > 0) {
          return { ok: false, reason: "restaurant-conflict" };
        }

        set((state) => {
          const shouldReset = force && state.restaurantId !== restaurant.id;
          const baseItems = shouldReset ? [] : state.items;

          const unitPriceCents = computeUnitPrice(product, selectedOptions);
          const id = `${product.id}-${selectedOptions.map((o) => o.optionName).join("|")}-${notes ?? ""}`;

          const existingIndex = baseItems.findIndex((it) => it.id === id);
          let items: CartItem[];
          if (existingIndex >= 0) {
            items = baseItems.map((it, i) => (i === existingIndex ? { ...it, quantity: it.quantity + quantity } : it));
          } else {
            items = [
              ...baseItems,
              {
                id,
                productId: product.id,
                productSlug: product.slug,
                restaurantId: restaurant.id,
                name: product.name,
                image: product.image,
                unitPriceCents,
                quantity,
                selectedOptions,
                notes,
              },
            ];
          }

          return {
            restaurantId: restaurant.id,
            items,
            promo: shouldReset ? null : state.promo,
            tipCents: shouldReset ? 0 : state.tipCents,
          };
        });

        return { ok: true };
      },

      removeItem: (itemId) =>
        set((state) => {
          const items = state.items.filter((it) => it.id !== itemId);
          const emptied = items.length === 0;
          return {
            items,
            restaurantId: emptied ? null : state.restaurantId,
            promo: emptied ? null : state.promo,
            deliveryMode: emptied ? null : state.deliveryMode,
            paymentMethod: emptied ? null : state.paymentMethod,
          };
        }),

      updateQuantity: (itemId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            const items = state.items.filter((it) => it.id !== itemId);
            const emptied = items.length === 0;
            return {
              items,
              restaurantId: emptied ? null : state.restaurantId,
              promo: emptied ? null : state.promo,
              deliveryMode: emptied ? null : state.deliveryMode,
              paymentMethod: emptied ? null : state.paymentMethod,
            };
          }
          return { items: state.items.map((it) => (it.id === itemId ? { ...it, quantity } : it)) };
        }),

      clearCart: () =>
        set({ restaurantId: null, items: [], promo: null, tipCents: 0, deliveryMode: null, paymentMethod: null }),

      applyPromoCode: (code) => {
        const promo = getPromotionByCode(code);
        if (!promo) return { ok: false, reason: "invalid" };

        const subtotal = getSubtotalCents(get().items);
        if (promo.minOrderCents && subtotal < promo.minOrderCents) {
          return { ok: false, reason: "min-order" };
        }

        const discountCents = promo.type === "percent" ? Math.round((subtotal * promo.value) / 100) : promo.value;
        set({ promo: { code: promo.code, discountCents } });
        return { ok: true };
      },

      removePromo: () => set({ promo: null }),

      setTip: (cents) => set({ tipCents: Math.max(0, cents) }),
      setDeliveryMode: (mode) => set({ deliveryMode: mode }),
      setPaymentMethod: (method) => set({ paymentMethod: method }),
    }),
    { name: "koli-cart" }
  )
);

export function getSubtotalCents(items: CartItem[]) {
  return items.reduce((sum, it) => sum + it.unitPriceCents * it.quantity, 0);
}

export function getItemCount(items: CartItem[]) {
  return items.reduce((sum, it) => sum + it.quantity, 0);
}
