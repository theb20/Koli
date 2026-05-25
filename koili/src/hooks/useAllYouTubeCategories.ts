import { useState, useEffect } from 'react'
import { type YTVideo } from './useYouTubeSearch'

type CategoryQuery = { label: string; query: string; color: string }

export function useAllYouTubeCategories(
  categories: CategoryQuery[],
  maxPerCategory = 3,
) {
  const [allVideos, setAllVideos] = useState<(YTVideo & { category: string })[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => {
    const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY
    if (!apiKey || apiKey === 'COLLE_TA_CLE_ICI') {
      setError('Clé API YouTube manquante — ajoute VITE_YOUTUBE_API_KEY dans .env')
      setLoading(false)
      return
    }

    const controller = new AbortController()

    async function fetchOne(cat: CategoryQuery) {
      const url = new URL('https://www.googleapis.com/youtube/v3/search')
      url.searchParams.set('part', 'snippet')
      url.searchParams.set('type', 'video')
      url.searchParams.set('q', cat.query)
      url.searchParams.set('maxResults', String(maxPerCategory))
      url.searchParams.set('videoEmbeddable', 'true')
      url.searchParams.set('videoDimension', 'any')
      url.searchParams.set('key', apiKey)

      const res = await fetch(url.toString(), { signal: controller.signal })
      if (!res.ok) throw new Error(`YouTube API ${res.status}`)
      const data = await res.json()

      return (data.items ?? []).map((item: any) => ({
        id:        item.id.videoId,
        title:     item.snippet.title,
        thumbnail: `https://img.youtube.com/vi/${item.id.videoId}/maxresdefault.jpg`,
        channel:   item.snippet.channelTitle,
        category:  cat.label,
      }))
    }

    async function fetchAll() {
      setLoading(true)
      setError(null)
      try {
        const results = await Promise.allSettled(categories.map(fetchOne))

        const merged: (YTVideo & { category: string })[] = []
        results.forEach(r => {
          if (r.status === 'fulfilled') merged.push(...r.value)
        })

        // Mélange les vidéos pour varier les catégories
        const shuffled = merged.sort(() => Math.random() - 0.5)
        setAllVideos(shuffled)
      } catch (e: any) {
        if (e.name !== 'AbortError') setError(e.message)
      } finally {
        setLoading(false)
      }
    }

    fetchAll()
    return () => controller.abort()
  }, []) // une seule fois au mount

  return { allVideos, loading, error }
}
