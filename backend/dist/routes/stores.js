"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.requireAdmin);
/* ── Schemas ─────────────────────────────────────────────────── */
const storeSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100),
    logo: zod_1.z.string().url().optional().or(zod_1.z.literal('')),
    description: zod_1.z.string().optional(),
    address: zod_1.z.string().optional(),
    phone: zod_1.z.string().optional(),
    email: zod_1.z.string().email().optional().or(zod_1.z.literal('')),
    website: zod_1.z.string().url().optional().or(zod_1.z.literal('')),
    isActive: zod_1.z.boolean().optional(),
});
const importProductSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    brand: zod_1.z.string().default('Sans marque'),
    category: zod_1.z.string().min(1, 'Catégorie requise'),
    price: zod_1.z.coerce.number().int().nonnegative().default(0),
    oldPrice: zod_1.z.coerce.number().int().nonnegative().optional(),
    description: zod_1.z.string().optional(),
    stock: zod_1.z.coerce.number().int().nonnegative().default(100),
    badge: zod_1.z.enum(['hot', 'new', 'sale', 'top']).optional(),
    images: zod_1.z.array(zod_1.z.string().url()).optional(),
    specs: zod_1.z.array(zod_1.z.object({ label: zod_1.z.string(), value: zod_1.z.string() })).optional(),
});
/* ─────────────────────────────────────────────────────────────
   GET /api/stores/admin/all
───────────────────────────────────────────────────────────── */
router.get('/admin/all', async (_req, res) => {
    try {
        const stores = await prisma_1.prisma.store.findMany({
            include: { _count: { select: { products: true } } },
            orderBy: { createdAt: 'desc' },
        });
        return res.json({ success: true, data: { stores } });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ─────────────────────────────────────────────────────────────
   GET /api/stores/:id
───────────────────────────────────────────────────────────── */
router.get('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const store = await prisma_1.prisma.store.findUnique({
            where: { id },
            include: { _count: { select: { products: true } } },
        });
        if (!store)
            return res.status(404).json({ success: false, message: 'Magasin introuvable' });
        return res.json({ success: true, data: { store } });
    }
    catch {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ─────────────────────────────────────────────────────────────
   POST /api/stores — Créer un magasin
───────────────────────────────────────────────────────────── */
router.post('/', async (req, res) => {
    try {
        const data = storeSchema.parse(req.body);
        const store = await prisma_1.prisma.store.create({
            data: {
                ...data,
                logo: data.logo || undefined,
                email: data.email || undefined,
                website: data.website || undefined,
            },
        });
        return res.status(201).json({ success: true, data: { store } });
    }
    catch (err) {
        return res.status(400).json({ success: false, message: 'Données invalides', detail: String(err) });
    }
});
/* ─────────────────────────────────────────────────────────────
   PUT /api/stores/:id — Modifier un magasin
───────────────────────────────────────────────────────────── */
router.put('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const data = storeSchema.partial().parse(req.body);
        const store = await prisma_1.prisma.store.update({
            where: { id },
            data: {
                ...data,
                logo: data.logo === '' ? null : data.logo,
                email: data.email === '' ? null : data.email,
                website: data.website === '' ? null : data.website,
            },
        });
        return res.json({ success: true, data: { store } });
    }
    catch {
        return res.status(400).json({ success: false, message: 'Erreur mise à jour' });
    }
});
/* ─────────────────────────────────────────────────────────────
   DELETE /api/stores/:id
───────────────────────────────────────────────────────────── */
router.delete('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        // Detach products before deleting (set storeId to null)
        await prisma_1.prisma.product.updateMany({ where: { storeId: id }, data: { storeId: null } });
        await prisma_1.prisma.store.delete({ where: { id } });
        return res.json({ success: true });
    }
    catch {
        return res.status(400).json({ success: false, message: 'Erreur suppression' });
    }
});
/* ─────────────────────────────────────────────────────────────
   GET /api/stores/:id/products
───────────────────────────────────────────────────────────── */
router.get('/:id/products', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const [products, total] = await Promise.all([
            prisma_1.prisma.product.findMany({
                where: { storeId: id },
                include: { images: { take: 1, orderBy: { position: 'asc' } } },
                skip, take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma_1.prisma.product.count({ where: { storeId: id } }),
        ]);
        return res.json({
            success: true,
            data: { products, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } },
        });
    }
    catch {
        return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ─────────────────────────────────────────────────────────────
   POST /api/stores/:id/import — Import JSON de produits
───────────────────────────────────────────────────────────── */
router.post('/:id/import', async (req, res) => {
    try {
        const storeId = parseInt(req.params.id);
        const store = await prisma_1.prisma.store.findUnique({ where: { id: storeId } });
        if (!store)
            return res.status(404).json({ success: false, message: 'Magasin introuvable' });
        const items = zod_1.z.array(importProductSchema).parse(req.body.products);
        const categories = await prisma_1.prisma.category.findMany({ select: { id: true, slug: true } });
        const categoryIdBySlug = new Map(categories.map(c => [c.slug, c.id]));
        let created = 0;
        const skipped = [];
        for (const item of items) {
            const categoryId = categoryIdBySlug.get(item.category);
            if (!categoryId) {
                skipped.push(`${item.name} (catégorie "${item.category}" introuvable)`);
                continue;
            }
            const { images, specs, ...rest } = item;
            await prisma_1.prisma.product.create({
                data: {
                    ...rest,
                    categoryId,
                    storeId,
                    isActive: true,
                    images: images?.length
                        ? { create: images.map((url, i) => ({ url, position: i })) }
                        : undefined,
                    specs: specs?.length
                        ? { create: specs.map((s, i) => ({ ...s, position: i })) }
                        : undefined,
                },
            });
            created++;
        }
        await prisma_1.prisma.store.update({
            where: { id: storeId },
            data: { lastImportAt: new Date() },
        });
        return res.json({
            success: true,
            data: {
                created,
                skipped,
                message: skipped.length
                    ? `${created} produit(s) importé(s), ${skipped.length} ignoré(s)`
                    : `${created} produit(s) importé(s)`,
            },
        });
    }
    catch (err) {
        console.error(err);
        return res.status(400).json({ success: false, message: 'Données invalides', detail: String(err) });
    }
});
/* ─────────────────────────────────────────────────────────────
   HELPERS — generic text / price extraction
───────────────────────────────────────────────────────────── */
/** Strip all HTML tags from a string */
function stripTags(s) {
    return s.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim();
}
/** Parse a price string like "129,99 €" or "129.99" → float */
function parsePrice(raw) {
    // Handle "1 299,99 €"  →  "1299.99"
    const cleaned = raw
        .replace(/[^\d,.\s]/g, '') // keep digits, comma, dot, space
        .replace(/\s/g, '') // drop spaces
        .replace(/,(\d{2})$/, '.$1') // trailing comma = decimal
        .replace(/,/g, ''); // remaining commas = thousands
    return parseFloat(cleaned) || 0;
}
/** Detect the retailer from the URL */
function detectRetailer(url) {
    if (/amazon\./i.test(url))
        return 'amazon';
    if (/jumia\./i.test(url))
        return 'jumia';
    if (/shein\.com/i.test(url))
        return 'shein';
    return 'generic';
}
/* ─────────────────────────────────────────────────────────────
   AMAZON image helpers
───────────────────────────────────────────────────────────── */
/** Decode HTML entities: &quot; → "  &amp; → &  &#34; → " */
function decodeEntities(s) {
    return s
        .replace(/&quot;/g, '"')
        .replace(/&#34;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&#38;/g, '&')
        .replace(/\\"/g, '"');
}
/** True if the URL looks like a real Amazon product image */
function isAmazonImg(url) {
    return /^https:\/\/(m\.media-amazon\.com|images-na\.ssl-images-amazon\.com|images-eu\.ssl-images-amazon\.com)\/images\/I\//i.test(url);
}
/** Upgrade image URL to highest available resolution (remove size constraints) */
function upgradeAmazonImg(url) {
    // Replace size suffix like ._AC_SL500_ or ._AC_SR38,50_ with ._AC_SL1500_
    return url
        .replace(/\._AC_S[XYL]\d+_(\.[a-z]+)$/i, '._AC_SL1500_$1')
        .replace(/\._AC_S[XYL]\d+\./i, '._AC_SL1500_.')
        .replace(/\._SX\d+_\./i, '._SL1500_.')
        .replace(/\._SY\d+_\./i, '._SL1500_.')
        .replace(/\._SR[\d,]+_\./i, '._SL1500_.');
}
function extractAmazonImages(html) {
    const seen = new Set();
    const images = [];
    function add(raw) {
        const url = upgradeAmazonImg(raw.trim());
        if (url && isAmazonImg(url) && !seen.has(url)) {
            seen.add(url);
            images.push(url);
        }
    }
    /* ── 1. colorImages JS variable — extract hiRes via regex (JSON parse often fails
       due to escaped quotes in URL keys inside the "main" sub-object)
       Pattern:  'colorImages' : { 'initial': [{"hiRes":"https://...","variant":"MAIN"},...]
    */
    const colorImagesSection = html.match(/'colorImages'\s*:\s*\{\s*'initial'\s*:\s*\[[\s\S]{20,50000}?\]/) ??
        html.match(/"colorImages"\s*:\s*\{\s*"initial"\s*:\s*\[[\s\S]{20,50000}?\]/);
    if (colorImagesSection) {
        const raw = colorImagesSection[0];
        // Try full JSON parse first (works when no escaped quotes in URL keys)
        const arrayMatch = raw.match(/\[[\s\S]+/);
        if (arrayMatch) {
            try {
                const items = JSON.parse(arrayMatch[0]);
                for (const item of items) {
                    if (!item.variant || item.variant === 'MAIN') {
                        const url = item.hiRes ?? (item.main ? Object.keys(item.main)[0] : undefined) ?? item.large;
                        if (url)
                            add(url);
                    }
                }
            }
            catch {
                // JSON parse failed — fall back to regex extraction within colorImages block
                // Extract all "hiRes":"URL" pairs from this section only
                for (const m of raw.matchAll(/"hiRes"\s*:\s*"(https:[^"\\]{10,})"/g))
                    add(m[1]);
            }
        }
    }
    /* ── 2. data-old-hires attribute ──
       <img id="landingImage" data-old-hires="https://...SL1500_.jpg">
    */
    for (const m of html.matchAll(/data-old-hires=["']([^"']{10,})["']/gi)) {
        add(m[1]);
    }
    /* ── 3. data-a-dynamic-image (often HTML-entity encoded JSON) ──
       data-a-dynamic-image="{&quot;https://...&quot;:[1500,1500],...}"
       data-a-dynamic-image='{"https://...":[1500,1500],...}'
    */
    for (const m of html.matchAll(/data-a-dynamic-image=(?:"([^"]{10,})"|'([^']{10,})')/gi)) {
        const raw = m[1] ?? m[2];
        try {
            const decoded = decodeEntities(raw);
            const map = JSON.parse(decoded);
            // Sort by pixel count descending (width × height)
            const sorted = Object.entries(map)
                .sort((a, b) => (b[1][0] * b[1][1] || 0) - (a[1][0] * a[1][1] || 0));
            for (const [url] of sorted.slice(0, 3))
                add(url);
        }
        catch { /* ignore */ }
    }
    /* ── 4. "hiRes":"URL" scattered in <script> blocks ── */
    for (const m of html.matchAll(/"hiRes"\s*:\s*"(https:[^"\\]{10,})"/g)) {
        add(m[1]);
        if (images.length >= 8)
            break;
    }
    /* ── 5. "large":"URL" as lower-res fallback ── */
    if (images.length < 2) {
        for (const m of html.matchAll(/"large"\s*:\s*"(https:[^"\\]{10,})"/g)) {
            add(m[1]);
            if (images.length >= 4)
                break;
        }
    }
    /* ── 6. imageGalleryData JSON ── */
    const galleryDataMatch = html.match(/"imageGalleryData"\s*:\s*(\[[\s\S]{20,8000}?\])/);
    if (galleryDataMatch) {
        try {
            const items = JSON.parse(galleryDataMatch[1]);
            for (const item of items)
                add(item.hiResUrl ?? item.mainUrl ?? '');
        }
        catch { /* ignore */ }
    }
    /* ── 7. src of #landingImage (ultimate fallback) ── */
    if (images.length === 0) {
        const src = html.match(/<img[^>]+id=["']landingImage["'][^>]*\bsrc=["']([^"']+)["']/i)?.[1] ??
            html.match(/<img[^>]*\bsrc=["']([^"']+)["'][^>]*id=["']landingImage["']/i)?.[1] ??
            '';
        if (src && !src.includes('transparent') && !src.endsWith('.gif'))
            add(src);
    }
    /* ── 8. Generic Amazon CDN pattern in raw HTML ── */
    if (images.length === 0) {
        for (const m of html.matchAll(/https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9%+\-_]+\.[a-z]{3,4}/g)) {
            const url = m[0];
            if (!url.includes('sprite') && !url.includes('nav-') && !url.includes('transparent'))
                add(url);
            if (images.length >= 4)
                break;
        }
    }
    return images.slice(0, 8);
}
/* ─────────────────────────────────────────────────────────────
   AMAZON-specific parser
   Covers: title, brand, price, images, description bullets
───────────────────────────────────────────────────────────── */
function parseAmazon(html) {
    /* ── Title ── */
    const title = html.match(/<span[^>]+id=["']productTitle["'][^>]*>([\s\S]*?)<\/span>/i)?.[1]?.replace(/\s+/g, ' ').trim()
        ?? html.match(/<h1[^>]+class=["'][^"']*a-size-large[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, '').trim()
        ?? '';
    if (!title)
        return [];
    /* ── Brand ── */
    // Raw byline text: "Visiter la boutique Samsung", "Visitez la boutique Apple", "Marque : Samsung"
    const bylineRaw = html.match(/<a[^>]+id=["']bylineInfo["'][^>]*>([\s\S]*?)<\/a>/i)?.[1]
        ?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() ?? '';
    const brand = 
    // "Marque : Samsung" in a table row (tech specs table)
    html.match(/(?:Marque|Marca|Brand)\s*[:\s]+<[^>]+>([^<]{1,60})</i)?.[1]?.trim()
        // byline: take everything after "boutique" / "tienda" / "store"
        ?? (bylineRaw
            ? bylineRaw.replace(/.*(?:boutique|tienda|store)\s+/i, '').trim()
            : undefined)
        // po-brand table row
        ?? html.match(/po-brand[\s\S]{0,300}?<span[^>]*>([^<]{1,60})<\/span>/i)?.[1]?.trim()
        // JSON brand field
        ?? html.match(/"brand"\s*:\s*"([^"]{1,60})"/i)?.[1]?.trim()
        ?? '';
    /* ── Price ── */
    const offscreens = [...html.matchAll(/<span[^>]+class=["'][^"']*a-offscreen[^"']*["'][^>]*>([^<]{1,30})<\/span>/gi)]
        .map(m => parsePrice(m[1]))
        .filter(p => p > 0);
    const whole = html.match(/<span[^>]+class=["'][^"']*a-price-whole[^"']*["'][^>]*>([^<,]+)/i)?.[1]?.replace(/\D/g, '') ?? '';
    const fraction = html.match(/<span[^>]+class=["'][^"']*a-price-fraction[^"']*["'][^>]*>([^<]+)/i)?.[1]?.replace(/\D/g, '') ?? '00';
    const priceParts = whole ? parseFloat(`${whole}.${fraction}`) : 0;
    const priceJson = parsePrice(html.match(/"priceAmount"\s*:\s*"?([0-9.,]+)"?/i)?.[1] ?? '');
    const price = offscreens[0] || priceParts || priceJson || 0;
    /* ── Images — full extraction ── */
    const images = extractAmazonImages(html);
    /* ── Description from feature-bullets ── */
    const bulletsSection = html.match(/<ul[^>]+id=["']feature-bullets["'][^>]*>([\s\S]*?)<\/ul>/i)?.[1] ?? '';
    const bullets = [...bulletsSection.matchAll(/<span[^>]+class=["'][^"']*a-list-item[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi)]
        .map(m => stripTags(m[1]).trim())
        .filter(b => b && !b.includes('Assurez-vous') && !b.includes('Cliquez') && b.length > 3)
        .slice(0, 6);
    const description = bullets.join(' • ');
    return [{
            name: title,
            brand: brand || 'Amazon',
            price,
            description,
            images,
            source: 'amazon-html',
        }];
}
/* ─────────────────────────────────────────────────────────────
   JUMIA-specific parser
───────────────────────────────────────────────────────────── */
function parseJumia(html) {
    const title = html.match(/<h1[^>]+class=["'][^"']*name["'][^>]*>([^<]+)</i)?.[1]?.trim()
        ?? html.match(/<h1[^>]*>([\s\S]{1,200}?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, '').trim()
        ?? '';
    if (!title)
        return [];
    const priceRaw = html.match(/<span[^>]+class=["'][^"']*price["'][^>]*>([^<]+)</i)?.[1] ?? '0';
    const price = parsePrice(priceRaw);
    const image = html.match(/<img[^>]+class=["'][^"']*image["'][^>]+src=["']([^"']+)["']/i)?.[1] ?? '';
    const brand = html.match(/["']brand["']\s*:\s*["']([^"']+)["']/i)?.[1]?.trim() ?? '';
    return [{ name: title, brand, price, images: image ? [image] : [], source: 'jumia-html' }];
}
/* ─────────────────────────────────────────────────────────────
   SHEIN-specific parser
   Handles Vue.js SSR pages — extracts from embedded window vars,
   ltwebstatic CDN images, and direct HTML fallbacks
───────────────────────────────────────────────────────────── */
function parseShein(html) {
    /* ── 1. Embedded JS window variables (most reliable) ── */
    // Shein injects product data as window.goodsDetailInfo or similar
    const windowPatterns = [
        /window\.goodsDetailInfo\s*=\s*(\{[\s\S]{50,200000}?\})\s*;?\s*(?:window\.|<\/script>)/,
        /window\.__GOODS_DETAIL__\s*=\s*(\{[\s\S]{50,200000}?\})\s*;?\s*(?:window\.|<\/script>)/,
        /"productInfo"\s*:\s*(\{[\s\S]{50,50000}?\})\s*,\s*"/,
    ];
    for (const pattern of windowPatterns) {
        const match = html.match(pattern);
        if (!match)
            continue;
        try {
            const data = JSON.parse(match[1]);
            const d = data.detail ?? data.goods_info ?? data;
            const title = (d.goods_name ?? '');
            if (!title)
                continue;
            const priceStr = (d.salePrice?.amountWithSymbol ?? d.salePrice?.amount
                ?? d.retailPrice?.amountWithSymbol ?? d.retailPrice?.amount ?? '0');
            const price = parsePrice(priceStr);
            // Images
            const imgs = [];
            const mainImg = d.goods_imgs?.main_image?.origin_image;
            if (mainImg)
                imgs.push(mainImg);
            if (d.goods_imgs?.detail_image) {
                for (const di of d.goods_imgs.detail_image) {
                    if (di.origin_image && !imgs.includes(di.origin_image))
                        imgs.push(di.origin_image);
                    if (imgs.length >= 8)
                        break;
                }
            }
            return [{ name: title, brand: 'SHEIN', price, images: imgs, source: 'shein-json' }];
        }
        catch { /* try next pattern */ }
    }
    /* ── 2. __NEXT_DATA__ JSON (if Shein migrated to Next.js) ── */
    const nextDataMatch = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]{50,500000}?)<\/script>/i);
    if (nextDataMatch) {
        try {
            const next = JSON.parse(nextDataMatch[1]);
            // Walk the tree to find goods_name
            const str = JSON.stringify(next);
            const titleMatch = str.match(/"goods_name"\s*:\s*"([^"]{5,300})"/)?.[1];
            if (titleMatch) {
                const priceMatch = str.match(/"amountWithSymbol"\s*:\s*"([^"]{1,30})"/);
                const price = parsePrice(priceMatch?.[1] ?? '0');
                const images = [];
                for (const m of str.matchAll(/"origin_image"\s*:\s*"(https:[^"]+)"/g)) {
                    if (!images.includes(m[1]))
                        images.push(m[1]);
                    if (images.length >= 8)
                        break;
                }
                return [{ name: titleMatch, brand: 'SHEIN', price, images, source: 'shein-next' }];
            }
        }
        catch { /* fall through */ }
    }
    /* ── 3. HTML fallback ── */
    const title = html.match(/<h1[^>]+class=["'][^"']*(?:product-intro__head-name|j-product-title|goods-name|product-name)[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, '').trim()
        ?? html.match(/<h1[^>]*>([\s\S]{5,300}?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, '').trim()
        ?? '';
    if (!title)
        return [];
    // Price — Shein uses classes like "original-price", "product-price-text", "sale-price"
    const priceRaw = html.match(/class=["'][^"']*(?:original-price|sale-price|product-price)[^"']*["'][^>]*>[\s\S]{0,60}?([\d][0-9.,\s]*)/i)?.[1]
        ?? html.match(/"salePrice"\s*:\s*\{[^}]*"amountWithSymbol"\s*:\s*"([^"]{1,20})"/i)?.[1]
        ?? html.match(/"amount"\s*:\s*"([^"]{1,20})"/i)?.[1]
        ?? '0';
    const price = parsePrice(priceRaw);
    // Images — collect all ltwebstatic CDN URLs, prefer large/origin over thumbnails
    const seen = new Set();
    const images = [];
    // First pass: grab origin-quality images (no _thumbnail_ or small suffixes)
    for (const m of html.matchAll(/https:\/\/img\.ltwebstatic\.com\/[^\s"'<>\\]{10,}/gi)) {
        const url = m[0].replace(/\\u002F/g, '/').replace(/["\s'<>\\]+$/, '');
        if (!seen.has(url) && !/(_thumbnail_|\d{2,3}x\d{2,3}[_.]|_xs_|_s_\.)/.test(url)) {
            seen.add(url);
            images.push(url);
        }
        if (images.length >= 8)
            break;
    }
    // Second pass: fallback to any ltwebstatic URLs if we got nothing
    if (images.length === 0) {
        for (const m of html.matchAll(/https:\/\/img\.ltwebstatic\.com\/[^\s"'<>\\]{10,}/gi)) {
            const url = m[0].replace(/\\u002F/g, '/').replace(/["\s'<>\\]+$/, '');
            if (!seen.has(url)) {
                seen.add(url);
                images.push(url);
            }
            if (images.length >= 4)
                break;
        }
    }
    // Brand — detect sub-brands like ROMWE, SHEIN Curve, etc.
    const brand = html.match(/"brand_name"\s*:\s*"([^"]{1,60})"/i)?.[1]?.trim()
        ?? html.match(/class=["'][^"']*brand[^"']*["'][^>]*>([^<]{1,60})</i)?.[1]?.trim()
        ?? 'SHEIN';
    // Description
    const desc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{10,500})["']/i)?.[1]?.trim()
        ?? '';
    return [{ name: title, brand, price, description: desc, images, source: 'shein-html' }];
}
/* ─────────────────────────────────────────────────────────────
   POST /api/stores/:id/scrape — Extraire les produits d'une URL
───────────────────────────────────────────────────────────── */
router.post('/:id/scrape', async (req, res) => {
    try {
        const { url } = zod_1.z.object({ url: zod_1.z.string().url() }).parse(req.body);
        const retailer = detectRetailer(url);
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept-Encoding': 'gzip, deflate, br',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Upgrade-Insecure-Requests': '1',
                'DNT': '1',
            },
            signal: AbortSignal.timeout(20000),
            redirect: 'follow',
        });
        if (!response.ok) {
            return res.status(400).json({
                success: false,
                message: `Impossible d'accéder à l'URL (HTTP ${response.status})`,
            });
        }
        const html = await response.text();
        const products = [];
        /* ── 1. Retailer-specific parsers (highest priority) ── */
        if (retailer === 'amazon') {
            products.push(...parseAmazon(html));
        }
        else if (retailer === 'jumia') {
            products.push(...parseJumia(html));
        }
        else if (retailer === 'shein') {
            products.push(...parseShein(html));
        }
        /* ── 2. JSON-LD structured data ── */
        if (products.length === 0) {
            const jsonLdMatches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
            for (const match of jsonLdMatches) {
                try {
                    const raw = JSON.parse(match[1]);
                    const items = Array.isArray(raw) ? raw : [raw];
                    for (const item of items) {
                        const type = item['@type'];
                        const types = Array.isArray(type) ? type : [type];
                        if (types.includes('Product')) {
                            const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
                            const price = parseFloat(String(offer?.price ?? '0').replace(/[^\d.]/g, '')) || 0;
                            const images = Array.isArray(item.image)
                                ? item.image.map((i) => (typeof i === 'string' ? i : i.url)).filter(Boolean)
                                : [item.image].filter(Boolean);
                            products.push({
                                name: item.name ?? '',
                                brand: item.brand?.name ?? item.brand ?? '',
                                description: item.description ?? '',
                                price,
                                images,
                                sku: item.sku ?? '',
                                source: 'json-ld',
                            });
                        }
                        if (types.includes('ItemList') && Array.isArray(item.itemListElement)) {
                            for (const el of item.itemListElement) {
                                const it = el.item ?? el;
                                const offer = Array.isArray(it.offers) ? it.offers[0] : it.offers;
                                const price = parseFloat(String(offer?.price ?? '0').replace(/[^\d.]/g, '')) || 0;
                                if (it['@type'] === 'Product')
                                    products.push({ name: it.name ?? '', brand: it.brand?.name ?? '', price, images: [it.image].filter(Boolean), source: 'json-ld-list' });
                            }
                        }
                    }
                }
                catch { /* skip malformed */ }
            }
        }
        /* ── 3. Open Graph / meta fallback ── */
        if (products.length === 0) {
            const og = (prop) => html.match(new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']+)["']`, 'i'))?.[1]
                ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${prop}["']`, 'i'))?.[1]
                ?? '';
            const title = og('title') || html.match(/<title>([^<]*)<\/title>/i)?.[1]?.split(/[|–—-]/)[0]?.trim() || '';
            const imageUrl = og('image');
            const desc = og('description');
            const priceRaw = og('price:amount')
                || html.match(/["']price["']\s*:\s*["']?(\d[\d.,]*)["']?/)?.[1]
                || html.match(/class=["'][^"']*price[^"']*["'][^>]*>([\d\s.,]+)/i)?.[1]
                || '0';
            const price = parsePrice(priceRaw);
            if (title) {
                products.push({
                    name: title,
                    description: desc,
                    price,
                    images: imageUrl ? [imageUrl] : [],
                    source: 'opengraph',
                });
            }
        }
        /* ── 4. Microdata fallback ── */
        if (products.length === 0) {
            const microdataMatches = html.matchAll(/itemtype=["'][^"']*schema\.org\/Product["'][^>]*>([\s\S]{0,2000}?)(?=<[^>]+itemtype|$)/gi);
            for (const match of microdataMatches) {
                const chunk = match[1];
                const name = chunk.match(/itemprop=["']name["'][^>]*>([^<]+)</i)?.[1]?.trim() ?? '';
                const price = parsePrice(chunk.match(/itemprop=["']price["'][^>]+content=["']([^"']+)["']/i)?.[1] ?? '0');
                const image = chunk.match(/itemprop=["']image["'][^>]+(?:src|content)=["']([^"']+)["']/i)?.[1] ?? '';
                if (name)
                    products.push({ name, price, images: image ? [image] : [], source: 'microdata' });
            }
        }
        /* ── Result ── */
        if (products.length === 0) {
            const isBot = /captcha|Type the characters you see|validateCaptcha|automated access/i.test(html);
            const isSheinBlock = retailer === 'shein' && (html.includes('verify') || html.length < 10000);
            return res.json({
                success: true,
                data: { products: [], url, count: 0, retailer },
                warning: isSheinBlock
                    ? 'Shein a bloqué la requête. Copiez le HTML de la page (Ctrl+U) et utilisez l\'onglet JSON pour importer les données manuellement.'
                    : isBot && retailer === 'amazon'
                        ? 'Amazon a détecté une requête automatisée et a bloqué l\'accès (page de vérification anti-robot). Amazon bloque quasi-systématiquement le scraping direct depuis un serveur, quels que soient les en-têtes envoyés. Reportez manuellement le nom, le prix et les liens d\'images dans l\'onglet Import JSON — ou passez par un service de scraping tiers (ScraperAPI, Bright Data...) si vous avez besoin d\'automatiser des imports Amazon en volume.'
                        : isBot
                            ? 'Le site a détecté un robot — essayez de copier-coller les données manuellement dans l\'onglet JSON.'
                            : 'Aucun produit trouvé à cette URL. Le site utilise peut-être du rendu JavaScript pur.',
            });
        }
        return res.json({ success: true, data: { products, url, count: products.length, retailer } });
    }
    catch (err) {
        console.error('[SCRAPE]', err);
        return res.status(400).json({ success: false, message: `Erreur lors du scraping: ${String(err)}` });
    }
});
exports.default = router;
//# sourceMappingURL=stores.js.map