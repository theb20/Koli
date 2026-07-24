import sharp from 'sharp'

/**
 * Convertit n'importe quelle image (jpeg, png, heic/heif, gif animé, webp…)
 * en WebP — format unique de stockage pour tous les uploads du site.
 * `.rotate()` sans argument applique l'orientation EXIF puis la retire,
 * indispensable pour les photos prises depuis un téléphone.
 */
export async function toWebp(input: Buffer, quality = 82): Promise<Buffer> {
  return sharp(input, { animated: true })
    .rotate()
    .webp({ quality })
    .toBuffer()
}

/**
 * Variante réduite pour les vignettes (grille produits, cartes catégorie…) —
 * une photo uploadée telle quelle peut faire plusieurs Mo alors qu'elle
 * s'affiche sur ~300px de large ; sans ce redimensionnement, la grille
 * télécharge la pleine résolution pour rien. `fit: 'inside'` + `withoutEnlargement`
 * : ne recadre jamais et n'agrandit jamais une image déjà plus petite que
 * `maxDimension`.
 */
export async function toWebpThumbnail(input: Buffer, maxDimension = 480, quality = 75): Promise<Buffer> {
  return sharp(input, { animated: true })
    .rotate()
    .resize({ width: maxDimension, height: maxDimension, fit: 'inside', withoutEnlargement: true })
    .webp({ quality })
    .toBuffer()
}
