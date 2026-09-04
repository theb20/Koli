"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

const MAX_RECENT = 8;

type SearchState = {
  recentSearches: string[];
  addRecentSearch: (term: string) => void;
  removeRecentSearch: (term: string) => void;
  clearRecentSearches: () => void;
};

export const useSearchStore = create<SearchState>()(
  persist(
    (set) => ({
      recentSearches: [],

      addRecentSearch: (term) => {
        const trimmed = term.trim();
        if (!trimmed) return;
        set((state) => {
          const withoutDupe = state.recentSearches.filter((t) => t.toLowerCase() !== trimmed.toLowerCase());
          return { recentSearches: [trimmed, ...withoutDupe].slice(0, MAX_RECENT) };
        });
      },

      removeRecentSearch: (term) =>
        set((state) => ({ recentSearches: state.recentSearches.filter((t) => t !== term) })),

      clearRecentSearches: () => set({ recentSearches: [] }),
    }),
    { name: "koli-recent-searches" }
  )
);
