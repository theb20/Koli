import { useLayoutEffect, useRef, type FocusEvent } from 'react'

/* contentEditable + React ne font jamais bon ménage si on laisse React
   contrôler le DOM à chaque frappe (le curseur saute). Solution : DOM non
   contrôlé pendant la frappe, on ne resynchronise `value` dans le DOM que
   si l'élément n'a pas le focus, et on ne commit dans le store qu'au blur. */
function useEditableBase<T extends HTMLElement>(
  value: string,
  onCommit: (v: string) => void,
  sync: (el: T, value: string) => void,
  read: (el: T) => string,
) {
  const ref = useRef<T>(null)
  const isFocused = useRef(false)

  // Layout effect, pas effect : évite un flash de contenu vide au premier
  // rendu (plus de dangerouslySetInnerHTML ici, voir plus bas pourquoi).
  useLayoutEffect(() => {
    if (ref.current && !isFocused.current) sync(ref.current, value)
  }, [value])

  return {
    ref,
    contentEditable: true as const,
    suppressContentEditableWarning: true as const,
    onFocus: () => { isFocused.current = true },
    onBlur: (e: FocusEvent<T>) => {
      isFocused.current = false
      onCommit(read(e.currentTarget as T))
    },
    onKeyDown: (e: React.KeyboardEvent<T>) => {
      if (e.key === 'Escape') (e.currentTarget as HTMLElement).blur()
    },
  }
}

/**
 * Édite du HTML riche (paragraphe) — l'appelant est responsable d'assainir
 * avant stockage définitif (voir sanitizeRichText). Jamais utilisé pour un
 * champ censé être du texte brut : voir useEditableText pour ça.
 */
export function useEditableHtml<T extends HTMLElement>(value: string, onCommit: (html: string) => void) {
  return useEditableBase<T>(
    value, onCommit,
    (el, v) => { if (el.innerHTML !== v) el.innerHTML = v },
    el => el.innerHTML,
  )
}

/**
 * Édite du texte brut (titre, bouton) — jamais innerHTML, ni en lecture ni
 * en écriture : un titre contenant "<img onerror=...>" ne doit jamais
 * pouvoir s'exécuter comme du HTML, y compris importé depuis un fichier
 * JSON externe. Toute mise en forme collée est perdue, par design.
 */
export function useEditableText<T extends HTMLElement>(value: string, onCommit: (text: string) => void) {
  return useEditableBase<T>(
    value, onCommit,
    (el, v) => { if (el.textContent !== v) el.textContent = v },
    el => el.textContent ?? '',
  )
}
