/** 48000 → « 48 000 F CFA » (XOF, entier, séparateur de milliers insécable) */
export const fmtFcfa = (n: number) =>
  `${Math.round(n).toLocaleString('fr-FR', { maximumFractionDigits: 0 }).replace(/[\u202F\u00A0 ]/g, '\u00A0')}\u00A0F\u00A0CFA`

export const fmtNumber = (n: number) => n.toLocaleString('fr-FR')

export const fmtPercent = (n: number) =>
  `${n > 0 ? '+' : ''}${n.toFixed(1)}%`

export const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })

export const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

export const fmtShortDay = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { weekday: 'short' })
