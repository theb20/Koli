"use client";

import { create } from "zustand";
import type { AddItemPayload } from "./cartStore";

export type Toast = { id: string; message: string; tone?: "success" | "error" | "info" };

type UiState = {
  isCartDrawerOpen: boolean;
  isAddressSheetOpen: boolean;
  cartConflictPending: AddItemPayload | null;
  toasts: Toast[];

  openCartDrawer: () => void;
  closeCartDrawer: () => void;
  openAddressSheet: () => void;
  closeAddressSheet: () => void;
  requestCartConflict: (payload: AddItemPayload) => void;
  resolveCartConflict: () => void;
  pushToast: (message: string, tone?: Toast["tone"]) => void;
  dismissToast: (id: string) => void;
};

export const useUiStore = create<UiState>((set) => ({
  isCartDrawerOpen: false,
  isAddressSheetOpen: false,
  cartConflictPending: null,
  toasts: [],

  openCartDrawer: () => set({ isCartDrawerOpen: true }),
  closeCartDrawer: () => set({ isCartDrawerOpen: false }),
  openAddressSheet: () => set({ isAddressSheetOpen: true }),
  closeAddressSheet: () => set({ isAddressSheetOpen: false }),

  requestCartConflict: (payload) => set({ cartConflictPending: payload }),
  resolveCartConflict: () => set({ cartConflictPending: null }),

  pushToast: (message, tone = "success") => {
    const id = `toast-${Date.now()}-${Math.round(Math.random() * 1000)}`;
    set((state) => ({ toasts: [...state.toasts, { id, message, tone }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 3000);
  },
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
