import type { TemplateName } from '../types'

export const TEMPLATES: { value: TemplateName; label: string; description: string }[] = [
  { value: 'classic', label: 'Classic', description: 'Simple et professionnel' },
  { value: 'modern', label: 'Modern', description: 'Design moderne avec couleur principale' },
  { value: 'minimal', label: 'Minimal', description: 'Très épuré' },
  { value: 'corporate', label: 'Corporate', description: 'Style entreprise' },
  { value: 'elegant', label: 'Elegant', description: 'Design premium' },
]

export const TEMPLATE_FONT: Record<TemplateName, string> = {
  classic: "Georgia, 'Times New Roman', serif",
  modern: "'Inter', Helvetica, Arial, sans-serif",
  minimal: "'Inter', Helvetica, Arial, sans-serif",
  corporate: "Georgia, 'Times New Roman', serif",
  elegant: "Georgia, 'Times New Roman', serif",
}

export const TEMPLATE_WEIGHT: Record<TemplateName, number> = {
  classic: 700,
  modern: 800,
  minimal: 500,
  corporate: 700,
  elegant: 600,
}
