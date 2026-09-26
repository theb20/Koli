import { createContext, useContext } from 'react'

/** Actions globales du layout, accessibles depuis n'importe quel composant. */
export type LayoutActions = {
  openPalette: () => void
  openShortcuts: () => void
  openAssistant: () => void
}

export const LayoutContext = createContext<LayoutActions>({
  openPalette: () => {}, openShortcuts: () => {}, openAssistant: () => {},
})

export const useLayout = () => useContext(LayoutContext)
