import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion } from 'motion/react'
import {
  ArrowLeft, Clock, Eye, Heart, Bookmark, Share2,
  User, Calendar, Tag, ChevronRight, BookOpen,
  ExternalLink, Link2, Check,
} from 'lucide-react'
import { fetchBlogPost } from '../lib/api'
import { PageMeta } from '../components/seo/PageMeta'

/* ── Types article statique (fallback) ─────────────────────── */
type StaticArticle = {
  id: number; slug: string; cat: string; title: string
  excerpt: string; img: string; author: string; authorImg: string
  date: string; readTime: number; views: number; likes: number
  tags: string[]; featured?: boolean
}

const STATIC_ARTICLES: StaticArticle[] = [
  { id: 1, slug: 'meilleures-montres-connectees-2026', cat: 'tech', featured: true, title: 'Les 10 meilleures montres connectées de 2026 — comparatif complet', excerpt: 'De la Samsung Galaxy Watch Ultra à l\'Apple Watch Series 10, nous avons testé pendant 3 semaines les montres connectées les plus vendues. Voici notre verdict sans complaisance.', img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1200', author: 'Patrick E.', authorImg: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=100', date: '24 mai 2026', readTime: 12, views: 4820, likes: 247, tags: ['Montres', 'High-Tech', 'Comparatif'] },
  { id: 2, slug: 'guide-ecouteurs-sans-fil', cat: 'tech', title: 'Guide complet : choisir ses écouteurs sans fil en 2026', excerpt: 'ANC, autonomie, qualité audio, confort... Tout ce qu\'il faut savoir avant d\'acheter vos prochains écouteurs True Wireless.', img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1200', author: 'Alain M.', authorImg: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100', date: '20 mai 2026', readTime: 8, views: 3140, likes: 189, tags: ['Écouteurs', 'Audio', 'Guide'] },
  { id: 3, slug: 'tendances-mode-afrique-2026', cat: 'style', title: 'Les tendances mode africaine qui dominent 2026', excerpt: 'Du wax au streetwear en passant par la mode contemporaine camerounaise, découvrez les styles qui font fureur cette saison.', img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=1200', author: 'Solange T.', authorImg: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=100', date: '18 mai 2026', readTime: 6, views: 2890, likes: 312, tags: ['Mode', 'Afrique', 'Tendances'] },
  { id: 4, slug: 'organisation-maison-minimalisme', cat: 'lifestyle', title: 'Minimalisme à la maison : 15 objets indispensables pour une vie organisée', excerpt: 'Le minimalisme n\'est pas une privation, c\'est un choix. Voici les 15 produits qui transformeront votre espace de vie en sanctuaire d\'organisation.', img: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?q=80&w=1200', author: 'Christelle N.', authorImg: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=100', date: '15 mai 2026', readTime: 7, views: 2150, likes: 178, tags: ['Maison', 'Lifestyle', 'Organisation'] },
  { id: 5, slug: 'gaming-setup-budget', cat: 'tech', title: 'Monter son gaming setup pour moins de 300 000 FCFA', excerpt: 'Console, manette, écran, chaise gaming... Voici comment créer un setup gamer performant sans exploser votre budget.', img: 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?q=80&w=1200', author: 'Alain M.', authorImg: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100', date: '12 mai 2026', readTime: 10, views: 5600, likes: 423, tags: ['Gaming', 'Budget', 'Setup'] },
  { id: 6, slug: 'soins-peau-naturels', cat: 'lifestyle', title: 'Routine beauté naturelle : les produits qui changent tout', excerpt: 'Huile de karité, beurre de cacao, aloe vera... Les secrets de beauté africains remis au goût du jour avec des produits soigneusement sélectionnés.', img: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=1200', author: 'Solange T.', authorImg: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=100', date: '10 mai 2026', readTime: 5, views: 3750, likes: 298, tags: ['Beauté', 'Soins', 'Naturel'] },
  { id: 7, slug: 'sport-maison-equipement', cat: 'guide', title: 'Équiper sa salle de sport à domicile : le guide complet', excerpt: 'Haltères, tapis de yoga, vélo d\'appartement ou bandes élastiques ? Tout dépend de vos objectifs et de votre espace. On vous aide à choisir.', img: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1200', author: 'Patrick E.', authorImg: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=100', date: '7 mai 2026', readTime: 9, views: 4100, likes: 351, tags: ['Sport', 'Fitness', 'Guide'] },
  { id: 8, slug: 'koli-nouveautes-mai-2026', cat: 'news', title: 'Koli : les 30 nouveaux produits de mai 2026', excerpt: 'Chaque mois, notre équipe sélectionne les meilleurs produits pour enrichir notre catalogue. Voici les 30 nouvelles pépites disponibles ce mois-ci.', img: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=1200', author: 'Christelle N.', authorImg: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=100', date: '1 mai 2026', readTime: 4, views: 6800, likes: 502, tags: ['Koli', 'Nouveautés', 'Catalogue'] },
  { id: 9, slug: 'smartphone-guide-achat-2026', cat: 'guide', title: 'Quel smartphone acheter en 2026 ? Notre guide par budget', excerpt: 'De 50 000 à 500 000 FCFA, voici les meilleurs smartphones pour chaque budget. Comparatif objectif, sans langue de bois.', img: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=1200', author: 'Alain M.', authorImg: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100', date: '28 avr. 2026', readTime: 11, views: 7200, likes: 589, tags: ['Smartphone', 'Comparatif', 'Budget'] },
]

/* ── Helpers ─────────────────────────────────────────────────── */
function fmtViews(n: number) {
  return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n)
}

function fmtDate(d: string | null | undefined) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

/* ── Render simple du corps markdown/HTML ────────────────────── */
function ArticleBody({ html }: { html: string }) {
  return (
    <div
      className="prose prose-gray prose-sm sm:prose-base max-w-none
        prose-headings:font-bold prose-headings:text-gray-900
        prose-p:text-gray-600 prose-p:leading-relaxed
        prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
        prose-img:rounded-2xl prose-img:shadow-md
        prose-blockquote:border-l-4 prose-blockquote:border-blue-400 prose-blockquote:bg-blue-50 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-xl
        prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-blue-700
        prose-strong:text-gray-900"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

/* ═══════════════════════════════════════════════════════════════
   PAGE PRINCIPALE
═══════════════════════════════════════════════════════════════ */
export default function BlogDetailPage() {
  const { slug }    = useParams<{ slug: string }>()
  const navigate    = useNavigate()
  const [liked,     setLiked]  = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [saved,     setSaved]  = useState(false)
  const [copied,    setCopied] = useState(false)

  /* ── Fetch API ─────────────────────────────────────────────── */
  const { data, isLoading, isError } = useQuery({
    queryKey: ['blog-post', slug],
    queryFn:  () => fetchBlogPost(slug!),
    enabled:  !!slug,
    retry: false,
  })

  /* ── Like mutation ─────────────────────────────────────────── */
  const likeMutation = useMutation({
    mutationFn: async () => {
      await fetch(`${import.meta.env.VITE_API_URL ?? 'http://localhost:4000'}/api/blog/${slug}/like`, { method: 'POST' })
    },
  })

  /* ── Résolution de l'article ────────────────────────────────── */
  const apiPost    = data?.data?.post
  const apiRelated = data?.data?.related ?? []

  // Fallback statique si pas en API
  const staticFallback = STATIC_ARTICLES.find(a => a.slug === slug)

  // Construire l'objet article unifié
  const article = apiPost ? {
    title:     apiPost.title,
    excerpt:   apiPost.excerpt,
    body:      apiPost.body,
    img:       apiPost.coverImage,
    author:    apiPost.author,
    authorImg: apiPost.authorImage ?? '',
    date:      fmtDate(apiPost.publishedAt),
    readTime:  apiPost.readTime,
    views:     apiPost.views,
    likes:     apiPost.likes,
    tags:      (() => { try { return JSON.parse(apiPost.tags) as string[] } catch { return [apiPost.category] } })(),
    category:  apiPost.category,
    slug:      apiPost.slug,
  } : staticFallback ? {
    title:     staticFallback.title,
    excerpt:   staticFallback.excerpt,
    body:      null as string | null,   // pas de corps pour les articles statiques
    img:       staticFallback.img,
    author:    staticFallback.author,
    authorImg: staticFallback.authorImg,
    date:      staticFallback.date,
    readTime:  staticFallback.readTime,
    views:     staticFallback.views,
    likes:     staticFallback.likes,
    tags:      staticFallback.tags,
    category:  staticFallback.cat,
    slug:      staticFallback.slug,
  } : null

  // Articles liés (API ou fallback statique même catégorie)
  const related: { slug: string; title: string; coverImage: string; readTime: number; publishedAt: string | null }[] =
    apiPost
      ? apiRelated
      : STATIC_ARTICLES
          .filter(a => a.slug !== slug && a.cat === (staticFallback?.cat ?? ''))
          .slice(0, 3)
          .map(a => ({ slug: a.slug, title: a.title, coverImage: a.img, readTime: a.readTime, publishedAt: null }))

  // Initialiser likeCount depuis l'article
  if (article && likeCount === 0 && article.likes > 0) {
    setLikeCount(article.likes)
  }

  const handleLike = () => {
    if (liked) return
    setLiked(true)
    setLikeCount(c => c + 1)
    likeMutation.mutate()
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  /* ── Loading ─────────────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 space-y-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-32" />
        <div className="h-10 bg-gray-200 rounded w-full" />
        <div className="h-6 bg-gray-200 rounded w-2/3" />
        <div className="h-72 bg-gray-200 rounded-2xl" />
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-4 bg-gray-200 rounded" />)}
        </div>
      </div>
    )
  }

  /* ── Not found ───────────────────────────────────────────────── */
  if ((isError && !staticFallback) || !article) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <BookOpen size={56} className="text-gray-200 mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Article introuvable</h1>
        <p className="text-gray-500 mb-8">Cet article n'existe pas ou a été supprimé.</p>
        <Link to="/blog"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-gray-900 text-white font-semibold text-sm hover:bg-gray-800 transition-colors">
          <ArrowLeft size={15} /> Retour au blog
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50">

      <PageMeta
        title={article.title}
        description={article.excerpt?.slice(0, 155)}
        image={article.img}
        path={`/blog/${article.slug}`}
        type="article"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: article.title,
            description: article.excerpt,
            image: article.img,
            author: { '@type': 'Person', name: article.author },
            publisher: {
              '@type': 'Organization',
              name: 'Skignas',
              logo: { '@type': 'ImageObject', url: 'https://skignas.com/imgs_dropship/favicon.svg' },
            },
            ...(apiPost?.publishedAt ? { datePublished: apiPost.publishedAt } : {}),
            mainEntityOfPage: { '@type': 'WebPage', '@id': `https://skignas.com/blog/${article.slug}` },
          },
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://skignas.com/' },
              { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://skignas.com/blog' },
              { '@type': 'ListItem', position: 3, name: article.title, item: `https://skignas.com/blog/${article.slug}` },
            ],
          },
        ]}
      />

      {/* ── Hero image ──────────────────────────────────────────── */}
      <div className="relative w-full aspect-[16/7] bg-gray-900 overflow-hidden">
        <img
          src={article.img}
          alt={article.title}
          className="absolute inset-0 w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 via-gray-950/20 to-transparent" />

        {/* Breadcrumb */}
        <div className="absolute top-5 left-1/2 -translate-x-1/2 w-full max-w-3xl px-4">
          <div className="flex items-center gap-2 text-xs text-white/70">
            <Link to="/" className="hover:text-white transition-colors">Accueil</Link>
            <ChevronRight size={11} />
            <Link to="/blog" className="hover:text-white transition-colors">Blog</Link>
            <ChevronRight size={11} />
            <span className="text-white/90 line-clamp-1">{article.title}</span>
          </div>
        </div>

        {/* Retour */}
        <button onClick={() => navigate('/blog')}
          className="absolute top-5 right-4 sm:right-8 flex items-center gap-1.5 text-white/80 hover:text-white text-xs font-medium bg-white/10 hover:bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full transition-all">
          <ArrowLeft size={12} /> Blog
        </button>

        {/* Titre sur l'image */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-3xl px-4 pb-8">
          <span className="inline-block text-[10px] font-bold tracking-widest uppercase text-blue-400 mb-3">
            {article.category}
          </span>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white leading-tight">
            {article.title}
          </h1>
        </div>
      </div>

      {/* ── Corps principal ─────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">

        {/* Méta + actions */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-gray-200">

          {/* Auteur + date */}
          <div className="flex items-center gap-3">
            {article.authorImg
              ? <img src={article.authorImg} alt={article.author} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow" />
              : <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {article.author[0]}
                </div>
            }
            <div>
              <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                <User size={11} className="text-gray-400" /> {article.author}
              </p>
              <p className="text-xs text-gray-400 flex items-center gap-2 mt-0.5">
                <Calendar size={10} /> {article.date}
                <span className="text-gray-300">·</span>
                <Clock size={10} /> {article.readTime} min
                <span className="text-gray-300">·</span>
                <Eye size={10} /> {fmtViews(article.views)}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button onClick={handleLike}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold border transition-all ${
                liked ? 'bg-red-50 border-red-200 text-red-500' : 'bg-white border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-400'
              }`}>
              <Heart size={13} className={liked ? 'fill-red-400 text-red-400' : ''} />
              {likeCount > 0 ? likeCount : ''}
            </button>
            <button onClick={() => setSaved(s => !s)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold border transition-all ${
                saved ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200 text-gray-500 hover:border-blue-200 hover:text-blue-500'
              }`}>
              <Bookmark size={13} className={saved ? 'fill-blue-500 text-blue-500' : ''} />
            </button>
            <button onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold border bg-white border-gray-200 text-gray-500 hover:border-gray-300 transition-all">
              {copied ? <><Check size={13} className="text-emerald-500" /> Copié</> : <><Link2 size={13} /> Partager</>}
            </button>
          </div>
        </motion.div>

        {/* Excerpt mis en valeur */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }}
          className="my-6 px-5 py-4 bg-blue-50 border-l-4 border-blue-400 rounded-r-2xl">
          <p className="text-blue-800 text-sm leading-relaxed font-medium italic">{article.excerpt}</p>
        </motion.div>

        {/* Corps de l'article */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.4 }}>
          {article.body ? (
            <ArticleBody html={article.body} />
          ) : (
            /* Article statique — affiche l'extrait expandé + CTA */
            <div className="space-y-5 text-gray-600">
              <p className="text-base leading-relaxed">{article.excerpt}</p>
              <p className="text-base leading-relaxed">
                Cet article de fond a été rédigé par notre équipe éditoriale. Il couvre en détail les aspects essentiels
                du sujet, avec des recommandations concrètes adaptées au marché africain. Les produits mentionnés sont
                disponibles sur Koli avec livraison rapide partout au Cameroun.
              </p>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-100">
                <p className="font-bold text-gray-900 mb-2">🛍️ Retrouvez ces produits sur Koli</p>
                <p className="text-sm text-gray-600 mb-4">
                  Tous les produits évoqués dans cet article sont disponibles dans notre catalogue, sélectionnés pour
                  leur qualité et leur rapport qualité/prix.
                </p>
                <Link to="/catalogue"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors">
                  Voir le catalogue <ChevronRight size={14} />
                </Link>
              </div>
            </div>
          )}
        </motion.div>

        {/* Tags */}
        {article.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-gray-200">
            <Tag size={13} className="text-gray-400 mt-0.5 shrink-0" />
            {article.tags.map(tag => (
              <Link key={tag} to={`/blog?tag=${encodeURIComponent(tag)}`}
                className="px-3 py-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium transition-colors">
                {tag}
              </Link>
            ))}
          </div>
        )}

        {/* Partage social */}
        <div className="mt-8 flex items-center gap-3 flex-wrap">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Partager</p>
          <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(window.location.href)}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-black text-white text-xs font-semibold hover:bg-gray-800 transition-colors">
            <ExternalLink size={12} /> X / Twitter
          </a>
          <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors">
            <ExternalLink size={12} /> Facebook
          </a>
          <button onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-gray-200 transition-colors">
            {copied ? <Check size={12} className="text-emerald-500" /> : <Share2 size={12} />}
            {copied ? 'Copié !' : 'Copier le lien'}
          </button>
        </div>
      </div>

      {/* ── Articles liés ───────────────────────────────────────── */}
      {related.length > 0 && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 border-t border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
            <BookOpen size={17} className="text-blue-500" /> Articles similaires
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {related.map(rel => (
              <Link key={rel.slug} to={`/blog/${rel.slug}`}
                className="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <div className="aspect-video overflow-hidden bg-gray-100">
                  <img
                    src={rel.coverImage}
                    alt={rel.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold text-gray-800 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
                    {rel.title}
                  </p>
                  <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                    <Clock size={10} /> {rel.readTime} min
                    {rel.publishedAt && <><span className="text-gray-300 mx-1">·</span>{fmtDate(rel.publishedAt)}</>}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── CTA retour ──────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-16 text-center">
        <Link to="/blog"
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors">
          <ArrowLeft size={14} /> Retour à tous les articles
        </Link>
      </div>
    </div>
  )
}
