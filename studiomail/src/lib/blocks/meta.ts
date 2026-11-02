import {
  Heading, Type, Minus, MoveVertical, Image, MousePointerClick,
  Share2, PanelBottom, Images, Code2, Columns3, type LucideIcon,
} from 'lucide-react'
import type { BlockType } from '@/types/document'

export const BLOCK_META: Record<BlockType, { label: string; icon: LucideIcon; group: 'Contenu' | 'Mise en page' | 'Marque' | 'Avancé' }> = {
  heading:  { label: 'Titre',           icon: Heading,             group: 'Contenu' },
  paragraph:{ label: 'Paragraphe',      icon: Type,                group: 'Contenu' },
  image:    { label: 'Image',           icon: Image,               group: 'Contenu' },
  button:   { label: 'Bouton',          icon: MousePointerClick,   group: 'Contenu' },
  divider:  { label: 'Séparateur',      icon: Minus,               group: 'Mise en page' },
  spacer:   { label: 'Espacement',      icon: MoveVertical,        group: 'Mise en page' },
  columns:  { label: 'Colonnes',        icon: Columns3,            group: 'Mise en page' },
  logo:     { label: 'Logo',            icon: Images,              group: 'Marque' },
  social:   { label: 'Réseaux sociaux', icon: Share2,              group: 'Marque' },
  footer:   { label: 'Pied de page',    icon: PanelBottom,         group: 'Marque' },
  html:     { label: 'HTML personnalisé', icon: Code2,             group: 'Avancé' },
}

export const BLOCK_GROUPS = ['Contenu', 'Mise en page', 'Marque', 'Avancé'] as const
export const LEAF_BLOCK_TYPES: BlockType[] = ['heading', 'paragraph', 'image', 'button', 'divider', 'spacer', 'logo', 'social', 'footer', 'html']
export const ALL_BLOCK_TYPES: BlockType[] = [...LEAF_BLOCK_TYPES, 'columns']
