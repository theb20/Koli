import { describe, it, expect } from 'vitest'
import { parseDraft } from './productResearch'

describe('parseDraft', () => {
  const slugs = ['telephones', 'audio']
  it('extrait le JSON entouré de texte et valide la catégorie', () => {
    const d = parseDraft('Voici:\n{"name":"iPhone 15","brand":"Apple","category":"telephones","description":"Bien.","specs":[{"label":"Stockage","value":"128 Go"},{"label":"","value":"x"}]}', slugs)
    expect(d).toEqual({ name: 'iPhone 15', brand: 'Apple', category: 'telephones', description: 'Bien.', specs: [{ label: 'Stockage', value: '128 Go' }] })
  })
  it('vide la catégorie inconnue', () => {
    expect(parseDraft('{"name":"X","category":"inconnue"}', slugs)?.category).toBe('')
  })
  it('renvoie null si invalide', () => {
    expect(parseDraft('pas du json', slugs)).toBeNull()
    expect(parseDraft('{"brand":"A"}', slugs)).toBeNull()
  })
})
