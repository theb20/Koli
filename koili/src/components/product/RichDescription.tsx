import type { DescriptionBlock } from '../../lib/api'

/**
 * Extrait l'id d'intégration d'un lien YouTube/Vimeo déjà validé côté
 * backend (hôte vérifié avant stockage — voir descriptionBlockSchema). Les
 * formes acceptées : youtube.com/watch?v=ID, youtu.be/ID, vimeo.com/ID.
 * Retourne null si l'URL ne correspond à aucune forme connue plutôt que de
 * risquer un embed cassé ou un id mal extrait.
 */
function embedUrl(block: Extract<DescriptionBlock, { type: 'video' }>): string | null {
  try {
    const u = new URL(block.url)
    if (block.provider === 'youtube') {
      const id = u.hostname.includes('youtu.be') ? u.pathname.slice(1) : u.searchParams.get('v')
      return id ? `https://www.youtube.com/embed/${id}` : null
    }
    if (block.provider === 'vimeo') {
      const id = u.pathname.split('/').filter(Boolean).pop()
      return id ? `https://player.vimeo.com/video/${id}` : null
    }
    return null
  } catch {
    return null
  }
}

function Block({ block }: { block: DescriptionBlock }) {
  if (block.type === 'text') {
    return <p className="text-base text-muted leading-relaxed whitespace-pre-line">{block.text}</p>
  }

  if (block.type === 'image') {
    return (
      <img
        src={block.url}
        alt={block.alt ?? ''}
        loading="lazy"
        className="w-full max-w-[1000px] rounded-xl"
      />
    )
  }

  // video
  if (block.provider === 'upload') {
    return (
      <video
        controls
        poster={block.poster}
        className="w-full max-w-[1000px] rounded-xl bg-base"
      >
        <source src={block.url} />
      </video>
    )
  }

  const src = embedUrl(block)
  if (!src) return null
  return (
    <div className="w-full max-w-[1000px] rounded-xl overflow-hidden bg-base" style={{ aspectRatio: '16/9' }}>
      <iframe
        src={src}
        title="Vidéo du produit"
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  )
}

export function RichDescription({ description, blocks }: {
  description?: string | null
  blocks?: DescriptionBlock[]
}) {
  const hasBlocks = blocks && blocks.length > 0

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-bold text-ink mb-4">Description du produit</h2>

      {!hasBlocks && (
        <p className="text-base text-muted leading-relaxed whitespace-pre-line">
          {description || 'Aucune description disponible pour ce produit.'}
        </p>
      )}

      {hasBlocks && (
        <div className="space-y-5">
          {blocks!.map((block, i) => <Block key={i} block={block} />)}
        </div>
      )}
    </div>
  )
}
