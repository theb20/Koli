import { describe, it, expect } from 'vitest'
import { formatFCFA, formatNumber, formatDate, formatDelta, percentChange, formatCompactFCFA } from './format'

const NBSP = '\u00A0'

describe('formatFCFA', () => {
  it('sépare les milliers par une espace insécable, sans décimales', () => {
    expect(formatFCFA(1250000)).toBe(`1${NBSP}250${NBSP}000${NBSP}F${NBSP}CFA`)
    expect(formatFCFA(24747010.6)).toBe(`24${NBSP}747${NBSP}011${NBSP}F${NBSP}CFA`)
    expect(formatFCFA(0)).toBe(`0${NBSP}F${NBSP}CFA`)
  })
  it('gère les montants négatifs', () => {
    expect(formatNumber(-5000)).toMatch(/5\u00A0000$/)
  })
})

describe('formatCompactFCFA', () => {
  it('abrège pour les étiquettes de graphique', () => {
    expect(formatCompactFCFA(150000)).toBe('150k')
    expect(formatCompactFCFA(2_400_000)).toBe(`2,4${NBSP}M`)
    expect(formatCompactFCFA(800)).toBe('800')
  })
})

describe('formatDate', () => {
  const d = new Date('2026-09-26T23:30:00Z') // 23:30 à Abidjan (UTC+0)
  it('formate en français au fuseau d\'Abidjan', () => {
    expect(formatDate(d, 'short')).toBe('26/09/2026')
    expect(formatDate(d, 'medium')).toBe(`26${NBSP}sept.${NBSP}2026`)
    expect(formatDate(d, 'time')).toBe('23:30')
  })
  it('renvoie un tiret pour une date invalide', () => {
    expect(formatDate('pas une date')).toBe('—')
  })
})

describe('formatDelta / percentChange', () => {
  it('signe et décimales', () => {
    expect(formatDelta(0.0234)).toBe(`+0,02${NBSP}%`)
    expect(formatDelta(12)).toBe(`+12${NBSP}%`)
    expect(formatDelta(-12)).toBe(`−12${NBSP}%`)
    expect(formatDelta(0)).toBe(`0${NBSP}%`)
  })
  it('pas de variation inventée quand la période précédente est vide', () => {
    expect(percentChange(10, 0)).toBeNull()
    expect(percentChange(120, 100)).toBe(20)
  })
})
