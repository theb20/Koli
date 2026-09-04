"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Address, DeliveryMode, OrderItem, OrderStatus, PaymentMethod, SimulatedOrder } from "../types";
import { ORDER_STATUS_SEQUENCE } from "../types";
import { DRIVERS } from "../data";
import { generateOrderId, seededPick } from "../utils/format";
import type { CartItem } from "./cartStore";

export type CreateOrderPayload = {
  restaurantId: string;
  restaurantName: string;
  restaurantSlug: string;
  restaurantImage: string;
  items: CartItem[];
  address: Address;
  deliveryMode: DeliveryMode;
  subtotalCents: number;
  deliveryFeeCents: number;
  serviceFeeCents: number;
  promo?: { code: string; discountCents: number };
  tipCents: number;
  totalCents: number;
  paymentMethod: PaymentMethod;
};

type OrderState = {
  orders: SimulatedOrder[];
  createOrder: (payload: CreateOrderPayload) => SimulatedOrder;
  advanceStatus: (orderId: string) => void;
  resetStatus: (orderId: string) => void;
  rateOrder: (orderId: string) => void;
  getOrder: (id: string) => SimulatedOrder | undefined;
};

function toOrderItems(items: CartItem[]): OrderItem[] {
  return items.map((it) => ({
    productId: it.productId,
    productSlug: it.productSlug,
    name: it.name,
    image: it.image,
    unitPriceCents: it.unitPriceCents,
    quantity: it.quantity,
    selectedOptions: it.selectedOptions.map((o) => ({ groupName: o.groupName, optionName: o.optionName, priceDeltaCents: o.priceDeltaCents })),
    notes: it.notes,
  }));
}

export const useOrderStore = create<OrderState>()(
  persist(
    (set, get) => ({
      orders: [],

      createOrder: (payload) => {
        const now = new Date().toISOString();
        const id = generateOrderId(get().orders.map((o) => o.id));
        const driver = seededPick(DRIVERS, id);

        const order: SimulatedOrder = {
          id,
          isDemo: true,
          createdAt: now,
          restaurantId: payload.restaurantId,
          restaurantName: payload.restaurantName,
          restaurantSlug: payload.restaurantSlug,
          restaurantImage: payload.restaurantImage,
          items: toOrderItems(payload.items),
          address: payload.address,
          deliveryMode: payload.deliveryMode,
          subtotalCents: payload.subtotalCents,
          deliveryFeeCents: payload.deliveryFeeCents,
          serviceFeeCents: payload.serviceFeeCents,
          promo: payload.promo,
          tipCents: payload.tipCents,
          totalCents: payload.totalCents,
          paymentMethod: payload.paymentMethod,
          status: "PAYMENT_CONFIRMED",
          statusHistory: [
            { status: "PENDING", at: now },
            { status: "PAYMENT_CONFIRMED", at: now },
          ],
          driver: null,
        };

        set((state) => ({ orders: [order, ...state.orders] }));
        return order;
      },

      advanceStatus: (orderId) =>
        set((state) => ({
          orders: state.orders.map((order) => {
            if (order.id !== orderId) return order;
            const currentIndex = ORDER_STATUS_SEQUENCE.indexOf(order.status);
            const nextIndex = currentIndex + 1;
            if (currentIndex === -1 || nextIndex >= ORDER_STATUS_SEQUENCE.length) return order;

            const nextStatus: OrderStatus = ORDER_STATUS_SEQUENCE[nextIndex];
            const driver =
              nextStatus === "OUT_FOR_DELIVERY" && !order.driver
                ? seededPick(DRIVERS, order.id)
                : order.driver;

            return {
              ...order,
              status: nextStatus,
              statusHistory: [...order.statusHistory, { status: nextStatus, at: new Date().toISOString() }],
              driver,
            };
          }),
        })),

      resetStatus: (orderId) =>
        set((state) => ({
          orders: state.orders.map((order) =>
            order.id === orderId
              ? {
                  ...order,
                  status: "PAYMENT_CONFIRMED",
                  statusHistory: [
                    { status: "PENDING", at: order.createdAt },
                    { status: "PAYMENT_CONFIRMED", at: order.createdAt },
                  ],
                  driver: null,
                }
              : order
          ),
        })),

      rateOrder: (orderId) =>
        set((state) => ({
          orders: state.orders.map((order) => (order.id === orderId ? { ...order, restaurantRated: true } : order)),
        })),

      getOrder: (id) => get().orders.find((o) => o.id === id),
    }),
    { name: "koli-orders" }
  )
);
