import { describe, it, expect, vi, afterEach } from 'vitest'
import { getAge, MIN_AGE } from './age'

describe('getAge', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('calcule un âge simple pour un anniversaire déjà passé cette année', () => {
    vi.setSystemTime(new Date('2026-08-15'))
    expect(getAge(new Date('2000-01-01'))).toBe(26)
  })

  it('ne compte pas l\'année en cours si l\'anniversaire n\'est pas encore passé', () => {
    vi.setSystemTime(new Date('2026-08-15'))
    expect(getAge(new Date('2000-12-31'))).toBe(25)
  })

  it('compte l\'année en cours le jour exact de l\'anniversaire', () => {
    vi.setSystemTime(new Date('2026-08-15'))
    expect(getAge(new Date('2008-08-15'))).toBe(18)
  })

  it('gère le mois d\'anniversaire déjà passé mais jour pas encore atteint', () => {
    vi.setSystemTime(new Date('2026-08-15'))
    expect(getAge(new Date('2000-08-20'))).toBe(25)
  })
})

describe('MIN_AGE', () => {
  it('vaut 18 — condition légale d\'inscription (registerSchema.refine)', () => {
    expect(MIN_AGE).toBe(18)
  })
})
