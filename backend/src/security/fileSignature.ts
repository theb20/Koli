import sharp from 'sharp'
import type { UploadCategory } from './limits'

/**
 * heic/heif/avif (ISO-BMFF) : certains builds de Sharp/libvips ne décodent
 * pas HEIC (licence du codec HEVC souvent exclue des binaires précompilés),
 * alors que ces fichiers viennent en pratique d'un iPhone (photos, y compris
 * les pièces d'identité scannées à l'inscription marchand) — un décodage
 * Sharp qui échouerait ne doit donc pas, à lui seul, rejeter un fichier réel.
 * Repli sur la structure du conteneur : la box "ftyp" doit apparaître en
 * tête avec l'un des brands ISO-BMFF connus pour image — toujours une
 * vérification du contenu réel, pas du nom/MIME déclaré.
 */
const ISO_BMFF_IMAGE_BRANDS = ['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1', 'avif', 'avis']

function looksLikeIsoBmffImage(buffer: Buffer): boolean {
  if (buffer.length < 12) return false
  const boxType = buffer.subarray(4, 8).toString('ascii')
  if (boxType !== 'ftyp') return false
  const brand = buffer.subarray(8, 12).toString('ascii').toLowerCase()
  return ISO_BMFF_IMAGE_BRANDS.includes(brand)
}

/**
 * Vérifie le contenu RÉEL d'un fichier — jamais son nom ni son Content-Type
 * déclaré, tous deux fournis par le client et donc falsifiables. Pour les
 * images, on délègue d'abord à Sharp (déjà une dépendance du projet, voir
 * lib/imageProcessing.ts) : décoder l'en-tête via `metadata()` échoue sur
 * tout ce qui n'est pas une image structurellement valide, quel que soit le
 * nom/extension/MIME annoncé — une garantie plus forte qu'une simple
 * comparaison des premiers octets (magic number), qui ne détecterait pas un
 * fichier tronqué ou corrompu après une signature valide. Le repli ISO-BMFF
 * ne couvre que heic/heif/avif, jamais jpeg/png/webp (qui doivent toujours
 * décoder correctement — un échec sur ces formats reste un vrai rejet).
 */
export async function verifyImageSignature(buffer: Buffer): Promise<boolean> {
  try {
    const meta = await sharp(buffer).metadata()
    if (meta.format && ['jpeg', 'png', 'webp', 'heif'].includes(meta.format)) return true
  } catch {
    // décodage Sharp indisponible pour ce format sur ce déploiement — repli ci-dessous
  }
  return looksLikeIsoBmffImage(buffer)
}

/** PDF : signature %PDF- en tête + marqueur %%EOF en fin de fichier — une
 *  vérification structurelle légère, pas un parsing complet (hors périmètre
 *  ici), suffisante pour rejeter un binaire arbitraire renommé en .pdf. */
export function verifyPdfSignature(buffer: Buffer): boolean {
  if (buffer.length < 5) return false
  const header = buffer.subarray(0, 5).toString('ascii')
  if (header !== '%PDF-') return false
  const tail = buffer.subarray(Math.max(0, buffer.length - 1024)).toString('latin1')
  return tail.includes('%%EOF')
}

/** XLSX est un zip (signature PK\x03\x04, ou PK\x05\x06 pour un zip vide). */
function isZipSignature(buffer: Buffer): boolean {
  if (buffer.length < 4) return false
  const sig = buffer.subarray(0, 4)
  return (sig[0] === 0x50 && sig[1] === 0x4b && sig[2] === 0x03 && sig[3] === 0x04)
      || (sig[0] === 0x50 && sig[1] === 0x4b && sig[2] === 0x05 && sig[3] === 0x06)
}

/** CSV : pas de format binaire, donc pas de signature au sens strict — on
 *  rejette en revanche tout octet nul (marqueur classique de contenu binaire
 *  déguisé en texte) sur un échantillon du fichier. */
function looksLikeText(buffer: Buffer): boolean {
  const sample = buffer.subarray(0, Math.min(buffer.length, 8192))
  return !sample.includes(0)
}

export function verifySpreadsheetSignature(buffer: Buffer, extension: string): boolean {
  if (extension === 'xlsx') return isZipSignature(buffer)
  if (extension === 'csv') return looksLikeText(buffer)
  return false
}

/** Point d'entrée unique — dispatch par catégorie. Asynchrone dans tous les
 *  cas (même quand la vérification elle-même est synchrone) pour que les
 *  appelants n'aient pas à distinguer les catégories. */
export async function verifySignature(
  buffer: Buffer,
  category: UploadCategory,
  extension: string,
): Promise<boolean> {
  switch (category) {
    case 'image':
      return verifyImageSignature(buffer)
    case 'pdf':
    case 'document':
      return verifyPdfSignature(buffer)
    case 'spreadsheet':
      return verifySpreadsheetSignature(buffer, extension)
    default:
      return false
  }
}
