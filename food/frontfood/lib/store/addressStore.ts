"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Address } from "../types";

type AddressState = {
  addresses: Address[];
  selectedAddressId: string | null;
  addAddress: (address: Omit<Address, "id">) => Address;
  updateAddress: (id: string, patch: Partial<Omit<Address, "id">>) => void;
  removeAddress: (id: string) => void;
  selectAddress: (id: string) => void;
};

export const useAddressStore = create<AddressState>()(
  persist(
    (set, get) => ({
      addresses: [],
      selectedAddressId: null,

      addAddress: (address) => {
        const newAddress: Address = { ...address, id: `addr-${Date.now()}-${Math.round(Math.random() * 1000)}` };
        set((state) => ({
          addresses: [...state.addresses, newAddress],
          selectedAddressId: state.selectedAddressId ?? newAddress.id,
        }));
        return newAddress;
      },

      updateAddress: (id, patch) =>
        set((state) => ({
          addresses: state.addresses.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        })),

      removeAddress: (id) =>
        set((state) => {
          const addresses = state.addresses.filter((a) => a.id !== id);
          const selectedAddressId =
            state.selectedAddressId === id ? addresses[0]?.id ?? null : state.selectedAddressId;
          return { addresses, selectedAddressId };
        }),

      selectAddress: (id) => {
        if (get().addresses.some((a) => a.id === id)) set({ selectedAddressId: id });
      },
    }),
    { name: "koli-addresses" }
  )
);
