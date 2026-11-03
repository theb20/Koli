import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { PageMeta } from '../components/seo/PageMeta'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import {
  fetchProduct, fetchProducts, fetchReviews,
  mapApiProduct, toggleWishlist,
} from '../lib/api'
import { mapReview, type Product } from '../components/product/types'
import { Breadcrumb } from '../components/product/Breadcrumb'
import { ProductHeader } from '../components/product/ProductHeader'
import { MediaGallery } from '../components/product/MediaGallery'
import { BuyBox } from '../components/product/BuyBox'
import { ProductCarousel } from '../components/product/ProductCarousel'
import { SectionTabs, type SectionTab } from '../components/product/SectionTabs'
import { RichDescription } from '../components/product/RichDescription'
import { ImportantInfo } from '../components/product/ImportantInfo'
import { SpecsTable } from '../components/product/SpecsTable'
import { ReviewSummary } from '../components/product/ReviewSummary'
import { ReviewItem } from '../components/product/ReviewItem'
import { ReviewForm } from '../components/product/ReviewForm'
import { QnA } from '../components/product/QnA'
import { StickyBuyBar } from '../components/product/StickyBuyBar'
import { FloatingActions } from '../components/product/FloatingActions'

const SECTION_TABS: SectionTab[] = [
  { id: 'description', label: 'Description du produit' },
  { id: 'informations', label: 'Informations importantes' },
  { id: 'specifications', label: 'Spécifications' },
  { id: 'avis', label: 'Avis' },
]

export default function ProductPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { token, isAuthenticated } = useAuth()
  const { addItem } = useCart()

  /* ── Data fetching ── */
  const { data: productData, isLoading, isError } = useQuery({
    queryKey: ['product', id],
    queryFn:  () => fetchProduct(id!, token),
    enabled:  !!id,
  })

  const product    = productData?.data?.product ? mapApiProduct(productData.data.product) : null
  const inWishlist = productData?.data?.inWishlist ?? false

  const { data: reviewsData } = useQuery({
    queryKey: ['reviews', id ? Number(id) : 0],
    queryFn:  () => fetchReviews(id!),
    enabled:  !!id,
  })

  const { data: relatedData } = useQuery({
    queryKey: ['products-related', product?.category],
    queryFn:  () => fetchProducts({ category: product?.category, limit: 8 }, token),
    enabled:  !!product?.category,
  })

  const { data: recommendedData } = useQuery({
    queryKey: ['products-recommended'],
    queryFn:  () => fetchProducts({ sort: 'popular', limit: 10 }, token),
  })

  const { data: storeData } = useQuery({
    queryKey: ['products-store', product?.store?.id],
    queryFn:  () => fetchProducts({ storeId: product!.store!.id, limit: 10 }, token),
    enabled:  !!product?.store?.id,
  })

  const reviews = (reviewsData?.data.reviews ?? []).map(mapReview)
  const similar = (productData?.data?.similar ?? []).map(mapApiProduct).filter(p => p.id !== product?.id)
  const related: Product[] = similar.length
    ? similar
    : (relatedData?.data.products ?? []).map(mapApiProduct).filter(p => p.id !== product?.id)
  const recommended: Product[] = (recommendedData?.data.products ?? [])
    .map(mapApiProduct)
    .filter(p => p.id !== product?.id)
  const fromStore: Product[] = (storeData?.data.products ?? [])
    .map(mapApiProduct)
    .filter(p => p.id !== product?.id)

  /* ── Local state ── */
  const [qty, setQty]             = useState(1)
  const [withAssistance, setWithAssistance] = useState(false)
  const [wished, setWished]       = useState(inWishlist)
  const [addedCart, setAddedCart] = useState(false)
  const [color, setColor]         = useState(0)
  const [variantId, setVariantId] = useState<number | null>(null)
  const [reviewFilter, setReviewFilter] = useState<number | null>(null)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [stickyVisible, setStickyVisible] = useState(false)
  const reviewRef  = useRef<HTMLDivElement>(null)
  const heroEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setWished(inWishlist) }, [inWishlist])

  // Pré-sélectionne la première variante disponible — achat/panier doivent
  // toujours viser une variante précise dès qu'il y en a (prix/stock réels).
  useEffect(() => {
    if (!product?.variants || product.variants.length === 0) return
    setVariantId(v => v ?? product.variants!.find(x => x.stock > 0)?.id ?? product.variants![0]!.id)
  }, [product?.variants])

  useEffect(() => {
    const el = heroEndRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setStickyVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { threshold: 0 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [product?.id])

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-border" />
      </div>
    )
  }

  if (isError || !product) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-6xl">😕</p>
        <p className="text-xl text-ink">Produit introuvable</p>
        <p className="text-muted text-sm">Ce produit n'existe pas ou a été retiré.</p>
        <button onClick={() => navigate('/catalogue')}
          className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ink text-white text-sm font-semibold hover:bg-ink/90 transition">
          <ArrowLeft size={15} /> Retour au catalogue
        </button>
      </div>
    )
  }

  const handleWish = async () => {
    if (!isAuthenticated || !token) return
    const next = !wished
    setWished(next)
    try {
      await toggleWishlist(product.id, token, !next)
    } catch {
      setWished(!next)
    }
  }

  const selectedVariant = product.variants?.find(v => v.id === variantId)

  const cartPayload = () => ({
    productId: product.id,
    variantId: selectedVariant?.id,
    variantName: selectedVariant?.name,
    name: product.name,
    brand: product.brand,
    price: selectedVariant?.price ?? product.price,
    oldPrice: selectedVariant ? undefined : product.oldPrice,
    image: product.thumbnails[0],
    color: product.colors?.[color],
    stock: (selectedVariant ? selectedVariant.stock : product.stock) ?? undefined,
    assistance: withAssistance && product.assistancePrice != null,
    assistancePrice: product.assistancePrice,
  })

  const handleAddCart = () => {
    addItem(cartPayload(), qty)
    setAddedCart(true)
    setTimeout(() => setAddedCart(false), 2200)
  }

  const handleBuyNow = () => {
    addItem(cartPayload(), qty)
    navigate('/panier')
  }

  const handleQuickAdd = (p: Product) => {
    addItem({
      productId: p.id, name: p.name, brand: p.brand, price: p.price,
      oldPrice: p.oldPrice, image: p.thumbnails[0], stock: p.stock ?? undefined,
    }, 1)
  }

  const scrollToReviews = () => {
    reviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const filteredReviews = reviewFilter ? reviews.filter(r => r.rating === reviewFilter) : reviews
  const variantLabel = selectedVariant?.name ?? product.colors?.[color]

  return (
    <>
      <PageMeta
        title={product.name}
        description={product.description?.slice(0, 155)}
        image={product.images[0]}
        path={`/catalogue/${product.id}`}
        type="product"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: product.name,
            image: product.images.filter(Boolean),
            description: product.description?.slice(0, 500) || product.name,
            brand: { '@type': 'Brand', name: product.brand },
            ...(product.reviews > 0 ? {
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: product.rating,
                reviewCount: product.reviews,
              },
            } : {}),
            offers: {
              '@type': 'Offer',
              url: `https://skignas.com/catalogue/${product.id}`,
              priceCurrency: 'XOF',
              price: product.price,
              availability: product.stock > 0
                ? 'https://schema.org/InStock'
                : 'https://schema.org/OutOfStock',
            },
          },
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://skignas.com/' },
              { '@type': 'ListItem', position: 2, name: 'Catalogue', item: 'https://skignas.com/catalogue' },
              { '@type': 'ListItem', position: 3, name: product.name, item: `https://skignas.com/catalogue/${product.id}` },
            ],
          },
        ]}
      />

      <FloatingActions onReviewsClick={scrollToReviews} />

      <div className="bg-surface min-h-screen">
        <div className="max-w-[1230px] mx-auto px-4 sm:px-6 lg:px-12">

          {/* ── Section 1 : fil d'Ariane + partage ── */}
          <div className="pt-6 pb-4">
            <Breadcrumb
              items={[
                { label: 'Accueil', to: '/' },
                { label: 'Catalogue', to: '/catalogue' },
                { label: product.category, to: `/catalogue?cat=${product.category}` },
                { label: product.name },
              ]}
              shareUrl={window.location.href}
              shareTitle={product.name}
            />
          </div>

          <div className="h-px bg-border mb-6" />

          {/* ── Section 2 : en-tête produit ── */}
          <ProductHeader product={product} onReviewsClick={scrollToReviews} />

          {/* ── Section 3 : galerie + buy box ── */}
          <div className="grid lg:grid-cols-2 gap-8 xl:gap-14 mt-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <MediaGallery
                images={product.images}
                name={product.name}
                wished={wished}
                onToggleWish={handleWish}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
            >
              <BuyBox
                product={product}
                qty={qty}
                setQty={setQty}
                color={color}
                setColor={setColor}
                variantId={variantId}
                setVariantId={setVariantId}
                withAssistance={withAssistance}
                setWithAssistance={setWithAssistance}
                addedCart={addedCart}
                onAddCart={handleAddCart}
                onBuyNow={handleBuyNow}
              />
            </motion.div>
          </div>
          <div ref={heroEndRef} />
        </div>

        {/* ── Section 4 : fréquemment achetés ensemble ── */}
        {related.length > 0 && (
          <div className="border-t border-border mt-12">
            <div className="max-w-[1230px] mx-auto px-4 sm:px-6 lg:px-12 py-12">
              <ProductCarousel
                title="Fréquemment achetés ensemble"
                products={related}
                onQuickAdd={handleQuickAdd}
                seeAllTo={`/catalogue?cat=${product.category}`}
              />
            </div>
          </div>
        )}

        {/* ── Section 5 : contenu produit ── */}
        <div className="border-t border-border" ref={reviewRef}>
          <div className="max-w-[1230px] mx-auto px-4 sm:px-6 lg:px-12">
            <SectionTabs tabs={SECTION_TABS} />

            <div id="description" className="py-10 border-b border-border">
              <RichDescription description={product.description} blocks={product.descriptionBlocks} />
            </div>

            <div id="informations" className="py-10 border-b border-border">
              <ImportantInfo />
            </div>

            <div id="specifications" className="py-10 border-b border-border">
              <SpecsTable specs={product.specs ?? []} />
            </div>

            <div id="avis" className="py-10">
              <div className="max-w-3xl">
                <h2 className="text-2xl font-bold text-ink mb-5">Avis ({product.reviews.toLocaleString('fr-FR')})</h2>

                <ReviewSummary reviews={reviews} activeFilter={reviewFilter} onFilter={setReviewFilter} />

                <div className="mb-8">
                  <button
                    onClick={() => setShowReviewForm(f => !f)}
                    className="text-sm font-semibold text-ink underline underline-offset-2"
                  >
                    Laisser un avis
                  </button>
                  {showReviewForm && (
                    <div className="mt-5 p-6 rounded-xl border border-border bg-surface">
                      <ReviewForm productId={product.id} onSubmit={() => setShowReviewForm(false)} />
                    </div>
                  )}
                </div>

                {filteredReviews.length === 0 ? (
                  <div className="text-center py-12 text-muted">
                    <p className="text-sm">
                      {reviewFilter ? 'Aucun avis avec cette note.' : "Aucun avis pour l'instant. Soyez le premier !"}
                    </p>
                  </div>
                ) : (
                  <div>
                    {filteredReviews.map(r => <ReviewItem key={r.id} review={r} />)}
                  </div>
                )}
              </div>

              <div className="max-w-3xl mt-10">
                <QnA />
              </div>
            </div>
          </div>
        </div>

        {/* ── Choix du magasin : autres produits du même vendeur ── */}
        {fromStore.length > 0 && (
          <div className="border-t border-border">
            <div className="max-w-[1230px] mx-auto px-4 sm:px-6 lg:px-12 py-12">
              <ProductCarousel
                title={`Choix de la boutique ${product.store?.name ?? ''}`}
                products={fromStore}
                onQuickAdd={handleQuickAdd}
              />
            </div>
          </div>
        )}

        {/* ── Section 6 : recommandé pour vous ── */}
        {recommended.length > 0 && (
          <div className="border-t border-border">
            <div className="max-w-[1230px] mx-auto px-4 sm:px-6 lg:px-12 py-12">
              <ProductCarousel
                title="Recommandé pour vous"
                products={recommended}
                onQuickAdd={handleQuickAdd}
                seeAllTo="/catalogue"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Section 7 : barre d'achat sticky ── */}
      <StickyBuyBar
        product={product}
        visible={stickyVisible}
        variantLabel={variantLabel}
        price={selectedVariant?.price ?? product.price}
        stock={(selectedVariant ? selectedVariant.stock : product.stock) ?? null}
        onAddCart={handleAddCart}
        onBuyNow={handleBuyNow}
      />
    </>
  )
}
