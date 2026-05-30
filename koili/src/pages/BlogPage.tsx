import { useState, useRef } from 'react'
import { motion, useInView, AnimatePresence } from 'motion/react'
import { Link } from 'react-router-dom'
import {
  Search, ArrowRight, Clock, Eye, Heart, Tag,
  BookOpen, TrendingUp, Zap, ChevronRight,
  Share2, Bookmark, User, Calendar, X,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { fetchBlogPosts, type ApiBlogPost } from '../lib/api'
import { PageMeta } from '../components/seo/PageMeta'

const BLUE = '#0421ff'

/* ─── Data ─────────────────────────────────────────────────── */

const CATEGORIES = [
  { id: 'all',       label: 'Tous',             count: 24 },
  { id: 'tech',      label: 'High-Tech',         count: 8  },
  { id: 'style',     label: 'Mode & Style',      count: 5  },
  { id: 'lifestyle', label: 'Lifestyle',          count: 6  },
  { id: 'guide',     label: 'Guides d\'achat',   count: 3  },
  { id: 'news',      label: 'Actualités',         count: 2  },
]

type Article = {
  id: number
  slug: string
  cat: string
  title: string
  excerpt: string
  img: string
  author: string
  authorImg: string
  date: string
  readTime: number
  views: number
  likes: number
  tags: string[]
  featured?: boolean
}

const ARTICLES: Article[] = [
  {
    id: 1, slug: 'meilleures-montres-connectees-2026', cat: 'tech', featured: true,
    title: 'Les 10 meilleures montres connectées de 2026 — comparatif complet',
    excerpt: 'De la Samsung Galaxy Watch Ultra à l\'Apple Watch Series 10, nous avons testé pendant 3 semaines les montres connectées les plus vendues. Voici notre verdict sans complaisance.',
    img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=800',
    author: 'Patrick E.', authorImg: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=100',
    date: '24 mai 2026', readTime: 12, views: 4820, likes: 247,
    tags: ['Montres', 'High-Tech', 'Comparatif'],
  },
  {
    id: 2, slug: 'guide-ecouteurs-sans-fil', cat: 'tech',
    title: 'Guide complet : choisir ses écouteurs sans fil en 2026',
    excerpt: 'ANC, autonomie, qualité audio, confort... Tout ce qu\'il faut savoir avant d\'acheter vos prochains écouteurs True Wireless.',
    img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=800',
    author: 'Alain M.', authorImg: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100',
    date: '20 mai 2026', readTime: 8, views: 3140, likes: 189,
    tags: ['Écouteurs', 'Audio', 'Guide'],
  },
  {
    id: 3, slug: 'tendances-mode-afrique-2026', cat: 'style',
    title: 'Les tendances mode africaine qui dominent 2026',
    excerpt: 'Du wax au streetwear en passant par la mode contemporaine camerounaise, découvrez les styles qui font fureur cette saison.',
    img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=800',
    author: 'Solange T.', authorImg: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=100',
    date: '18 mai 2026', readTime: 6, views: 2890, likes: 312,
    tags: ['Mode', 'Afrique', 'Tendances'],
  },
  {
    id: 4, slug: 'organisation-maison-minimalisme', cat: 'lifestyle',
    title: 'Minimalisme à la maison : 15 objets indispensables pour une vie organisée',
    excerpt: 'Le minimalisme n\'est pas une privation, c\'est un choix. Voici les 15 produits qui transformeront votre espace de vie en sanctuaire d\'organisation.',
    img: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?q=80&w=800',
    author: 'Christelle N.', authorImg: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=100',
    date: '15 mai 2026', readTime: 7, views: 2150, likes: 178,
    tags: ['Maison', 'Lifestyle', 'Organisation'],
  },
  {
    id: 5, slug: 'gaming-setup-budget', cat: 'tech',
    title: 'Monter son gaming setup pour moins de 300 000 FCFA',
    excerpt: 'Console, manette, écran, chaise gaming... Voici comment créer un setup gamer performant sans exploser votre budget.',
    img: 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?q=80&w=800',
    author: 'Alain M.', authorImg: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100',
    date: '12 mai 2026', readTime: 10, views: 5600, likes: 423,
    tags: ['Gaming', 'Budget', 'Setup'],
  },
  {
    id: 6, slug: 'soins-peau-naturels', cat: 'lifestyle',
    title: 'Routine beauté naturelle : les produits qui changent tout',
    excerpt: 'Huile de karité, beurre de cacao, aloe vera... Les secrets de beauté africains remis au goût du jour avec des produits soigneusement sélectionnés.',
    img: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=800',
    author: 'Solange T.', authorImg: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=100',
    date: '10 mai 2026', readTime: 5, views: 3750, likes: 298,
    tags: ['Beauté', 'Soins', 'Naturel'],
  },
  {
    id: 7, slug: 'sport-maison-equipement', cat: 'guide',
    title: 'Équiper sa salle de sport à domicile : le guide complet',
    excerpt: 'Haltères, tapis de yoga, vélo d\'appartement ou bandes élastiques ? Tout dépend de vos objectifs et de votre espace. On vous aide à choisir.',
    img: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=800',
    author: 'Patrick E.', authorImg: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=100',
    date: '7 mai 2026', readTime: 9, views: 4100, likes: 351,
    tags: ['Sport', 'Fitness', 'Guide'],
  },
  {
    id: 8, slug: 'koli-nouveautes-mai-2026', cat: 'news',
    title: 'Koli : les 30 nouveaux produits de mai 2026',
    excerpt: 'Chaque mois, notre équipe sélectionne les meilleurs produits pour enrichir notre catalogue. Voici les 30 nouvelles pépites disponibles ce mois-ci.',
    img: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=800',
    author: 'Christelle N.', authorImg: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=100',
    date: '1 mai 2026', readTime: 4, views: 6800, likes: 502,
    tags: ['Koli', 'Nouveautés', 'Catalogue'],
  },
  {
    id: 9, slug: 'smartphone-guide-achat-2026', cat: 'guide',
    title: 'Quel smartphone acheter en 2026 ? Notre guide par budget',
    excerpt: 'De 50 000 à 500 000 FCFA, voici les meilleurs smartphones pour chaque budget. Comparatif objectif, sans langue de bois.',
    img: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=800',
    author: 'Alain M.', authorImg: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100',
    date: '28 avr. 2026', readTime: 11, views: 7200, likes: 589,
    tags: ['Smartphone', 'Comparatif', 'Budget'],
  },
]

const POPULAR_TAGS = ['High-Tech', 'Mode', 'Comparatif', 'Guide', 'Budget', 'Gaming', 'Beauté', 'Lifestyle', 'Nouveautés', 'Fitness']

/* ─── Helpers ──────────────────────────────────────────────── */
function FadeIn({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref    = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

function fmtViews(n: number) {
  return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n)
}

/* ─── Cards ─────────────────────────────────────────────────── */
function FeaturedCard({ article }: { article: Article }) {
  const [liked, setLiked] = useState(false)
  const [saved, setSaved] = useState(false)

  return (
    <div className="group relative overflow-hidden rounded-3xl bg-gray-950" style={{ minHeight: 480 }}>
      <img
        src={article.img}
        alt={article.title}
        className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-40 group-hover:scale-105 transition-all duration-700"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

      {/* Content */}
      <div className="relative h-full flex flex-col justify-end p-8 lg:p-12">
        {/* Badges */}
        <div className="flex items-center gap-3 mb-5">
          <span className="px-3 py-1 rounded-full text-xs font-bold text-white" style={{ background: BLUE }}>
            À LA UNE
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-semibold text-white/70 bg-white/10 backdrop-blur-sm">
            {CATEGORIES.find(c => c.id === article.cat)?.label ?? article.cat}
          </span>
        </div>

        <h2 className="text-2xl lg:text-4xl font-black text-white leading-tight mb-4 max-w-2xl group-hover:text-blue-200 transition-colors">
          {article.title}
        </h2>
        <p className="text-white/60 max-w-xl mb-6 line-clamp-2 text-sm lg:text-base">{article.excerpt}</p>

        {/* Meta */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img src={article.authorImg} alt={article.author} className="w-9 h-9 rounded-full object-cover border-2 border-white/30" />
            <div>
              <p className="text-white text-sm font-semibold">{article.author}</p>
              <div className="flex items-center gap-3 text-white/50 text-xs">
                <span className="flex items-center gap-1"><Calendar size={11} /> {article.date}</span>
                <span className="flex items-center gap-1"><Clock size={11} /> {article.readTime} min</span>
                <span className="flex items-center gap-1"><Eye size={11} /> {fmtViews(article.views)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setLiked(v => !v)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${liked ? 'bg-rose-500 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>
              <Heart size={12} className={liked ? 'fill-white' : ''} /> {article.likes + (liked ? 1 : 0)}
            </button>
            <button onClick={() => setSaved(v => !v)} className={`p-2 rounded-full transition-all ${saved ? 'bg-white text-gray-900' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>
              <Bookmark size={14} className={saved ? 'fill-gray-900' : ''} />
            </button>
            <Link to={`/blog/${article.slug}`}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold text-gray-900 bg-white hover:bg-gray-100 transition-colors">
              Lire <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function ArticleCard({ article, delay = 0 }: { article: Article; delay?: number }) {
  const [liked, setLiked] = useState(false)
  const [saved, setSaved] = useState(false)

  return (
    <FadeIn delay={delay} className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
      {/* Image */}
      <div className="relative overflow-hidden aspect-video">
        <img src={article.img} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        {/* Overlay actions */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-end justify-end p-3 opacity-0 group-hover:opacity-100">
          <button onClick={(e) => { e.preventDefault(); setSaved(v => !v) }}
            className={`p-2 rounded-full backdrop-blur-sm transition-all ${saved ? 'bg-white text-gray-900' : 'bg-black/40 text-white'}`}>
            <Bookmark size={14} className={saved ? 'fill-gray-900' : ''} />
          </button>
        </div>
        {/* Category badge */}
        <div className="absolute top-3 left-3">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold text-white backdrop-blur-sm" style={{ background: `${BLUE}cc` }}>
            {CATEGORIES.find(c => c.id === article.cat)?.label ?? article.cat}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        {/* Tags */}
        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          {article.tags.slice(0, 2).map(tag => (
            <span key={tag} className="text-[10px] font-semibold text-gray-400 bg-gray-50 px-2 py-0.5 rounded">{tag}</span>
          ))}
        </div>

        <h3 className="font-bold text-gray-900 leading-snug mb-3 text-sm group-hover:text-blue-600 transition-colors flex-1 line-clamp-3">
          {article.title}
        </h3>
        <p className="text-xs text-gray-400 leading-relaxed mb-5 line-clamp-2">{article.excerpt}</p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-auto">
          <div className="flex items-center gap-2.5">
            <img src={article.authorImg} alt={article.author} className="w-7 h-7 rounded-full object-cover" />
            <div>
              <p className="text-xs font-semibold text-gray-700">{article.author}</p>
              <div className="flex items-center gap-2 text-gray-400 text-[10px]">
                <span className="flex items-center gap-0.5"><Clock size={9} /> {article.readTime} min</span>
                <span className="flex items-center gap-0.5"><Eye size={9} /> {fmtViews(article.views)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setLiked(v => !v)}
              className={`flex items-center gap-1 text-[11px] font-semibold transition-colors ${liked ? 'text-rose-500' : 'text-gray-400 hover:text-rose-400'}`}>
              <Heart size={12} className={liked ? 'fill-rose-500' : ''} />
              {article.likes + (liked ? 1 : 0)}
            </button>
            <Link to={`/blog/${article.slug}`}
              className="text-[11px] font-bold flex items-center gap-1 transition-colors hover:opacity-80"
              style={{ color: BLUE }}>
              Lire <ChevronRight size={12} />
            </Link>
          </div>
        </div>
      </div>
    </FadeIn>
  )
}

/* ─── Sidebar ───────────────────────────────────────────────── */
function Sidebar({ onTagClick, articles }: { onTagClick: (tag: string) => void; articles: Article[] }) {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  const popular = [...articles].sort((a, b) => b.views - a.views).slice(0, 4)

  return (
    <aside className="space-y-6">

      {/* Newsletter */}
      <div className="p-6 rounded-2xl text-white relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${BLUE}, #0621cc)` }}>
        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10" />
        <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-white/5" />
        <div className="relative">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-4">
            <BookOpen size={18} />
          </div>
          <h3 className="font-black text-lg mb-2 leading-tight">La newsletter Koli</h3>
          <p className="text-white/70 text-xs mb-5 leading-relaxed">
            Guides exclusifs, bons plans et nouveautés produits chaque semaine.
          </p>
          <AnimatePresence mode="wait">
            {subscribed ? (
              <motion.p key="done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="text-sm font-semibold">
                ✓ Vous êtes abonné(e) !
              </motion.p>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <input
                  value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  type="email"
                  className="w-full bg-white/20 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/50 outline-none focus:bg-white/30 transition-colors mb-3"
                />
                <button
                  onClick={() => { if (email.includes('@')) setSubscribed(true) }}
                  className="w-full py-2.5 rounded-xl text-sm font-bold bg-white text-gray-900 hover:bg-gray-100 transition-colors"
                >
                  S'abonner gratuitement
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Popular articles */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp size={16} style={{ color: BLUE }} />
          <h3 className="font-bold text-gray-900 text-sm">Articles populaires</h3>
        </div>
        <div className="space-y-4">
          {popular.map((art, i) => (
            <Link key={art.id} to={`/blog/${art.slug}`} className="flex items-start gap-3 group">
              <span className="text-2xl font-black tabular-nums leading-none mt-0.5" style={{ color: i === 0 ? BLUE : '#d1d5db' }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 leading-snug group-hover:text-blue-600 transition-colors line-clamp-2">
                  {art.title}
                </p>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
                  <span className="flex items-center gap-0.5"><Eye size={9} /> {fmtViews(art.views)}</span>
                  <span className="flex items-center gap-0.5"><Clock size={9} /> {art.readTime} min</span>
                </div>
              </div>
              <img src={art.img} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
            </Link>
          ))}
        </div>
      </div>

      {/* Popular tags */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Tag size={16} style={{ color: BLUE }} />
          <h3 className="font-bold text-gray-900 text-sm">Tags populaires</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {POPULAR_TAGS.map(tag => (
            <button
              key={tag}
              onClick={() => onTagClick(tag)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-50 text-gray-600 hover:bg-blue-50 hover:text-blue-700 border border-gray-100 hover:border-blue-200 transition-all"
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>

      {/* CTA */}
      <Link to="/catalogue" className="block p-6 rounded-2xl bg-gray-950 text-white group hover:bg-gray-900 transition-colors relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, #fff 0%, transparent 60%)' }} />
        <div className="relative">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mb-4">
            <Zap size={18} className="fill-white text-white" />
          </div>
          <h3 className="font-black text-base mb-2">Ventes Flash</h3>
          <p className="text-white/50 text-xs mb-4">Jusqu'à -50% sur une sélection de produits premium. Offres limitées.</p>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold" style={{ color: BLUE }}>
            Voir les offres <ArrowRight size={12} />
          </span>
        </div>
      </Link>
    </aside>
  )
}

/* ─── Normalise un article venant de l'API vers le type Article ── */
function apiBlogToArticle(post: ApiBlogPost): Article {
  let tags: string[] = []
  try { tags = JSON.parse(post.tags) } catch { tags = [] }

  const date = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Non daté'

  return {
    id:        post.id + 100_000,   // évite collision avec les IDs statiques (1-99)
    slug:      post.slug,
    cat:       post.category,
    title:     post.title,
    excerpt:   post.excerpt,
    img:       post.coverImage,
    author:    post.author,
    authorImg: post.authorImage
      ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author)}&background=0421ff&color=fff&size=100`,
    date,
    readTime:  post.readTime,
    views:     post.views,
    likes:     post.likes,
    tags,
  }
}

/* ─── Page ─────────────────────────────────────────────────── */
export function BlogPage() {
  const [activeCat, setActiveCat] = useState<string>('all')
  const [searchVal, setSearchVal] = useState('')
  const [activeTag, setActiveTag]  = useState<string | null>(null)

  // Récupère les articles du backoffice et les fusionne avec les articles statiques
  const { data: blogData } = useQuery({
    queryKey: ['blog-posts'],
    queryFn:  () => fetchBlogPosts(),
    staleTime: 60_000,
  })

  const apiArticles: Article[] = (blogData?.data?.posts ?? []).map(apiBlogToArticle)

  // Articles API en premier, puis articles statiques (les statiques restent visibles)
  const allArticles = [...apiArticles, ...ARTICLES]

  const featured = allArticles.find(a => a.featured) ?? allArticles[0]!
  const rest     = allArticles.filter(a => a !== featured)

  const filtered = rest.filter(a => {
    const matchCat  = activeCat === 'all' || a.cat === activeCat
    const matchTag  = !activeTag || a.tags.some(t => t.toLowerCase().includes(activeTag.toLowerCase()))
    const matchSearch = !searchVal || a.title.toLowerCase().includes(searchVal.toLowerCase()) || a.excerpt.toLowerCase().includes(searchVal.toLowerCase())
    return matchCat && matchTag && matchSearch
  })

  const handleTagClick = (tag: string) => {
    setActiveTag(prev => prev === tag ? null : tag)
    setActiveCat('all')
  }

  return (
    <div className="bg-white">
      <PageMeta
        title="Blog Koli — Guides, Tendances & Actualités"
        description="Guides d'achat, tendances produits, actualités tech et lifestyle. Le blog Koli pour faire les meilleurs choix."
        path="/blog"
        image="/wall/og-blog.jpg"
      />

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative bg-gray-950 pt-8 pb-16 overflow-hidden">
        {/* BG */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '50px 50px' }} />
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10 blur-3xl" style={{ background: BLUE }} />

        <div className="relative max-w-7xl mx-auto px-4 lg:px-8 pt-8">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-white/60 text-xs font-semibold mb-6 backdrop-blur-sm"
          >
            <BookOpen size={12} style={{ color: BLUE }} />
            Magazine Koli · {allArticles.length} articles publiés
          </motion.div>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
            <div>
              <motion.h1
                initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
                className="text-5xl lg:text-7xl font-black text-white leading-tight tracking-tight mb-4"
              >
                Le blog<br />
                <span style={{ color: BLUE }}>Koli</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
                className="text-white/50 max-w-lg leading-relaxed"
              >
                Guides d'achat experts, tendances produits, actualités tech et lifestyle.
                Tout ce qu'il faut savoir pour faire les meilleurs choix.
              </motion.p>
            </div>

            {/* Search */}
            <motion.div
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.25 }}
              className="relative lg:w-80"
            >
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                value={searchVal}
                onChange={e => setSearchVal(e.target.value)}
                placeholder="Rechercher un article..."
                className="w-full pl-11 pr-10 py-3.5 rounded-2xl bg-white/8 border border-white/10 text-white placeholder:text-white/40 text-sm outline-none focus:bg-white/12 focus:border-white/25 transition-all"
              />
              {searchVal && (
                <button onClick={() => setSearchVal('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                  <X size={14} />
                </button>
              )}
            </motion.div>
          </div>

          {/* Category filters */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
            className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide"
          >
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => { setActiveCat(cat.id); setActiveTag(null) }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                  activeCat === cat.id
                    ? 'text-white'
                    : 'text-white/50 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white/80'
                }`}
                style={activeCat === cat.id ? { background: BLUE } : {}}
              >
                {cat.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${activeCat === cat.id ? 'bg-white/20 text-white' : 'bg-white/10 text-white/40'}`}>
                  {cat.count}
                </span>
              </button>
            ))}
          </motion.div>

          {/* Active tag filter */}
          <AnimatePresence>
            {activeTag && (
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="flex items-center gap-2 mt-4"
              >
                <span className="text-white/40 text-xs">Tag actif :</span>
                <button
                  onClick={() => setActiveTag(null)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border border-white/20 bg-white/10 text-white"
                >
                  #{activeTag} <X size={11} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* ── MAIN ─────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-12">

        {/* Featured article — only show when no filter active */}
        {activeCat === 'all' && !searchVal && !activeTag && (
          <FadeIn className="mb-12">
            <FeaturedCard article={featured} />
          </FadeIn>
        )}

        {/* Grid + Sidebar */}
        <div className="grid lg:grid-cols-[1fr_320px] gap-10">

          {/* Articles grid */}
          <div>
            {/* Results header */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-gray-500">
                <span className="font-bold text-gray-900">{filtered.length}</span> article{filtered.length !== 1 ? 's' : ''} trouvé{filtered.length !== 1 ? 's' : ''}
                {activeCat !== 'all' && <span className="ml-1">dans <span className="font-semibold text-gray-700">{CATEGORIES.find(c => c.id === activeCat)?.label}</span></span>}
                {activeTag && <span className="ml-1">· tag <span className="font-semibold text-gray-700">#{activeTag}</span></span>}
              </p>
              <div className="flex items-center gap-1">
                <button className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
                  <Share2 size={14} />
                </button>
                <button className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
                  <User size={14} />
                </button>
              </div>
            </div>

            {filtered.length > 0 ? (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {filtered.map((article, i) => (
                  <ArticleCard key={article.id} article={article} delay={i * 0.06} />
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-24 text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-5">
                  <Search size={24} className="text-gray-300" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Aucun article trouvé</h3>
                <p className="text-sm text-gray-400 mb-5">Essayez une autre catégorie ou un autre terme de recherche.</p>
                <button
                  onClick={() => { setActiveCat('all'); setSearchVal(''); setActiveTag(null) }}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: BLUE }}
                >
                  Voir tous les articles
                </button>
              </motion.div>
            )}

            {/* Pagination placeholder */}
            {filtered.length > 0 && (
              <FadeIn delay={0.4} className="flex justify-center gap-2 mt-12">
                {[1, 2, 3, '…', 6].map((p, i) => (
                  <button
                    key={i}
                    className={`w-10 h-10 rounded-xl text-sm font-semibold transition-all ${p === 1 ? 'text-white' : 'text-gray-500 bg-gray-50 hover:bg-gray-100'}`}
                    style={p === 1 ? { background: BLUE } : {}}
                  >
                    {p}
                  </button>
                ))}
              </FadeIn>
            )}
          </div>

          {/* Sidebar */}
          <FadeIn delay={0.2}>
            <div className="sticky top-28">
              <Sidebar onTagClick={handleTagClick} articles={allArticles} />
            </div>
          </FadeIn>
        </div>
      </div>

      {/* ── TOPICS STRIP ─────────────────────────────────────── */}
      <section className="border-t border-gray-100 bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <FadeIn className="text-center mb-10">
            <h2 className="text-2xl font-black text-gray-900">Explorez par thème</h2>
          </FadeIn>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { icon: '📱', label: 'High-Tech', color: '#dbeafe', textColor: '#1d4ed8' },
              { icon: '👗', label: 'Mode',       color: '#fce7f3', textColor: '#be185d' },
              { icon: '🏠', label: 'Maison',     color: '#d1fae5', textColor: '#065f46' },
              { icon: '💪', label: 'Sport',      color: '#ffedd5', textColor: '#c2410c' },
              { icon: '✨', label: 'Beauté',     color: '#f3e8ff', textColor: '#7c3aed' },
              { icon: '🎮', label: 'Gaming',     color: '#f0fdf4', textColor: '#15803d' },
            ].map((topic, i) => (
              <FadeIn key={topic.label} delay={i * 0.06}>
                <button
                  onClick={() => { setActiveCat('all'); setSearchVal(topic.label); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                  className="w-full p-5 rounded-2xl border border-gray-100 bg-white hover:shadow-md hover:-translate-y-0.5 transition-all text-center group"
                >
                  <span className="text-3xl block mb-3">{topic.icon}</span>
                  <span className="text-sm font-bold text-gray-700 group-hover:text-gray-900">{topic.label}</span>
                </button>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="py-20 bg-gray-950 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '60px 60px' }} />
        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <FadeIn>
            <h2 className="text-4xl font-black text-white mb-5">
              Prêt à trouver<br />
              <span style={{ color: BLUE }}>le produit parfait ?</span>
            </h2>
            <p className="text-white/50 mb-8 max-w-xl mx-auto">
              Nos guides sont là pour vous aider à choisir. Maintenant, passez à l'action.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/catalogue"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-sm font-bold text-white hover:opacity-90 transition-opacity"
                style={{ background: BLUE }}>
                Voir le catalogue <ArrowRight size={15} />
              </Link>
              <Link to="/magasin"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-sm font-bold text-white border border-white/20 hover:bg-white/10 transition-colors">
                Explorer le magasin
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>
    </div>
  )
}
