"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertPublicHost = assertPublicHost;
exports.rehostImage = rehostImage;
exports.rehostImages = rehostImages;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const net_1 = __importDefault(require("net"));
const promises_1 = __importDefault(require("dns/promises"));
const imageProcessing_1 = require("./imageProcessing");
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? './uploads';
const PRODUCTS_DIR = path_1.default.resolve(UPLOAD_DIR, 'products');
if (!fs_1.default.existsSync(PRODUCTS_DIR))
    fs_1.default.mkdirSync(PRODUCTS_DIR, { recursive: true });
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const FETCH_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;
function isPrivateIp(ip) {
    if (net_1.default.isIPv4(ip)) {
        const parts = ip.split('.').map(Number);
        const [a, b] = [parts[0] ?? 0, parts[1] ?? 0];
        if (a === 10 || a === 127 || a === 0)
            return true;
        if (a === 169 && b === 254)
            return true;
        if (a === 172 && b >= 16 && b <= 31)
            return true;
        if (a === 192 && b === 168)
            return true;
        if (a === 100 && b >= 64 && b <= 127)
            return true; // CGNAT
        return false;
    }
    if (net_1.default.isIPv6(ip)) {
        const lower = ip.toLowerCase();
        if (lower === '::1')
            return true;
        if (lower.startsWith('fe80:') || lower.startsWith('fc') || lower.startsWith('fd'))
            return true;
        if (lower.startsWith('::ffff:'))
            return isPrivateIp(lower.slice(7));
        return false;
    }
    return true; // format inconnu — on refuse par prudence
}
async function assertPublicHost(hostname) {
    const records = await promises_1.default.lookup(hostname, { all: true });
    if (records.length === 0)
        throw new Error('Hôte introuvable');
    for (const r of records) {
        if (isPrivateIp(r.address))
            throw new Error('Adresse IP interne refusée');
    }
}
/**
 * Télécharge une image externe côté serveur (contourne le hotlink-blocking
 * basé sur le Referer navigateur) et la sauvegarde localement.
 * En cas d'échec (timeout, 403, type invalide, IP interne...), retourne
 * l'URL d'origine telle quelle plutôt que de faire échouer l'opération
 * appelante — l'image externe reste utilisable en dégradé.
 */
async function rehostImage(sourceUrl, backendBaseUrl) {
    if (sourceUrl.startsWith(backendBaseUrl) || sourceUrl.includes('/uploads/')) {
        return sourceUrl; // déjà hébergée chez nous
    }
    let url;
    try {
        url = new URL(sourceUrl);
    }
    catch {
        return sourceUrl;
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:')
        return sourceUrl;
    try {
        let currentUrl = url;
        let redirects = 0;
        let res;
        for (;;) {
            await assertPublicHost(currentUrl.hostname);
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
            try {
                res = await fetch(currentUrl, {
                    redirect: 'manual',
                    signal: controller.signal,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
                        'Accept': 'image/avif,image/webp,image/*,*/*;q=0.8',
                    },
                });
            }
            finally {
                clearTimeout(timeout);
            }
            if (res.status >= 300 && res.status < 400) {
                const location = res.headers.get('location');
                if (!location || redirects >= MAX_REDIRECTS)
                    return sourceUrl;
                const nextUrl = new URL(location, currentUrl);
                if (nextUrl.protocol !== 'http:' && nextUrl.protocol !== 'https:')
                    return sourceUrl;
                currentUrl = nextUrl;
                redirects++;
                continue;
            }
            break;
        }
        if (!res.ok)
            return sourceUrl;
        const contentType = res.headers.get('content-type') ?? '';
        if (!/^image\//.test(contentType))
            return sourceUrl;
        const declaredLength = Number(res.headers.get('content-length') ?? '0');
        if (declaredLength > MAX_BYTES)
            return sourceUrl;
        const reader = res.body?.getReader();
        if (!reader)
            return sourceUrl;
        const chunks = [];
        let total = 0;
        for (;;) {
            const { done, value } = await reader.read();
            if (done)
                break;
            total += value.byteLength;
            if (total > MAX_BYTES) {
                await reader.cancel();
                return sourceUrl;
            }
            chunks.push(value);
        }
        const buf = Buffer.concat(chunks.map(c => Buffer.from(c)));
        if (buf.length === 0)
            return sourceUrl;
        const webp = await (0, imageProcessing_1.toWebp)(buf);
        const filename = `prod-${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
        fs_1.default.writeFileSync(path_1.default.join(PRODUCTS_DIR, filename), webp);
        return `${backendBaseUrl}/uploads/products/${filename}`;
    }
    catch (err) {
        console.error('[rehostImage]', sourceUrl, err instanceof Error ? err.message : err);
        return sourceUrl;
    }
}
async function rehostImages(urls, backendBaseUrl) {
    return Promise.all(urls.map(u => rehostImage(u, backendBaseUrl)));
}
//# sourceMappingURL=rehostImage.js.map