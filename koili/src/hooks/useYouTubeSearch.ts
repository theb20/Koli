import { useState, useEffect } from 'react'

/* ─────────────────────────────────────────
   TYPES
───────────────────────────────────────── */
export type YTVideo = {
  id: string
  title: string
  thumbnail: string
  channel: string
  duration?: string   // non fourni par search, optionnel
}

type Status = 'idle' | 'loading' | 'success' | 'error'

/* ─────────────────────────────────────────
   HOOK
───────────────────────────────────────── */
export function useYouTubeSearch(query: string, maxResults = 4) {
  const [videos, setVideos] = useState<YTVideo[]>([])
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!query) return

    const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY
    if (!apiKey || apiKey === 'COLLE_TA_CLE_ICI') {
      setError('Clé API YouTube manquante — ajoute VITE_YOUTUBE_API_KEY dans .env')
      setStatus('error')
      return
    }

    const controller = new AbortController()

    async function fetchVideos() {
      setStatus('loading')
      setError(null)
      try {
        const url = new URL('https://www.googleapis.com/youtube/v3/search')
        url.searchParams.set('part', 'snippet')
        url.searchParams.set('type', 'video')
        url.searchParams.set('q', query)
        url.searchParams.set('maxResults', String(maxResults))
        url.searchParams.set('videoEmbeddable', 'true')
        url.searchParams.set('relevanceLanguage', 'fr')
        url.searchParams.set('key', apiKey)

        const res = await fetch(url.toString(), { signal: controller.signal })
        if (!res.ok) throw new Error(`YouTube API error: ${res.status}`)

        const data = await res.json()

        const mapped: YTVideo[] = (data.items ?? []).map((item: any) => ({
          id:        item.id.videoId,
          title:     item.snippet.title,
          // maxresdefault = 1280×720 (meilleure qualité dispo via thumbnail URL)
          thumbnail: `https://img.youtube.com/vi/${item.id.videoId}/maxresdefault.jpg`,
          channel:   item.snippet.channelTitle,
        }))

        setVideos(mapped)
        setStatus('success')
      } catch (e: any) {
        if (e.name === 'AbortError') return
        setError(e.message ?? 'Erreur inconnue')
        setStatus('error')
      }
    }

    fetchVideos()
    return () => controller.abort()
  }, [query, maxResults])

  return { videos, status, error }
}
