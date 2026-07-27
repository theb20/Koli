import { maxUploadBytes, type UploadCategory } from './limits'
import { isMimeAllowed, isExtensionAllowed, extractExtension } from './mimeValidator'
import { verifySignature } from './fileSignature'
import { generateSafeFileName } from './fileName'

/**
 * Erreur typée — chaque `reason` correspond à un message et un code HTTP
 * précis (voir statusFor ci-dessous), pour que l'appelant puisse répondre
 * correctement sans avoir à re-déterminer lui-même la cause.
 */
export type UploadRejectionReason =
  | 'file_too_large'
  | 'mime_not_allowed'
  | 'extension_not_allowed'
  | 'invalid_signature'

export class UploadValidationError extends Error {
  readonly reason: UploadRejectionReason
  readonly status: number

  constructor(reason: UploadRejectionReason, message: string) {
    super(message)
    this.name = 'UploadValidationError'
    this.reason = reason
    this.status = reason === 'invalid_signature' ? 422 : 400
  }
}

export type ValidatedUpload = {
  /** Nom de stockage sûr — UUID + timestamp + extension validée, jamais le nom client. */
  safeFileName: string
  extension: string
}

export type UploadFileInput = {
  buffer: Buffer
  originalName: string
  mimeType: string
  /** Taille annoncée par le client (Content-Length / multer) — vérifiée en
   *  plus de buffer.length, qui peut différer si le flux a été tronqué. */
  declaredSize: number
}

/**
 * Validation complète d'un fichier uploadé, dans l'ordre du moins coûteux au
 * plus coûteux (échoue vite sur les checks bon marché avant de décoder le
 * contenu) :
 *   1. Taille (déclarée ET réelle)
 *   2. Extension (whitelist stricte — bloque aussi les doubles extensions)
 *   3. Type MIME déclaré (whitelist stricte)
 *   4. Signature binaire réelle (magic number / décodage structurel)
 *
 * Aucune étape n'est sautée pour aucune catégorie — un fichier qui échoue
 * n'importe laquelle est rejeté avec une raison explicite.
 */
export async function validateUpload(
  input: UploadFileInput,
  category: UploadCategory,
): Promise<ValidatedUpload> {
  const { buffer, originalName, mimeType, declaredSize } = input
  const maxBytes = maxUploadBytes(category)

  if (declaredSize > maxBytes || buffer.length > maxBytes) {
    throw new UploadValidationError(
      'file_too_large',
      `Fichier trop volumineux (maximum ${Math.round(maxBytes / (1024 * 1024))} Mo)`,
    )
  }

  if (!isExtensionAllowed(originalName, category)) {
    throw new UploadValidationError(
      'extension_not_allowed',
      `Extension de fichier non autorisée pour ce type d'envoi (.${extractExtension(originalName) || '?'})`,
    )
  }

  if (!isMimeAllowed(mimeType, category)) {
    throw new UploadValidationError(
      'mime_not_allowed',
      `Type de fichier non autorisé (${mimeType.split(';')[0]})`,
    )
  }

  const extension = extractExtension(originalName)
  const signatureOk = await verifySignature(buffer, category, extension)
  if (!signatureOk) {
    throw new UploadValidationError(
      'invalid_signature',
      'Le contenu du fichier ne correspond pas au type annoncé — fichier corrompu ou signature invalide',
    )
  }

  return {
    safeFileName: generateSafeFileName(originalName),
    extension,
  }
}
