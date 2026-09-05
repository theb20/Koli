/* ─────────────────────────────────────────────────────────────
   Normalisation de numéro de téléphone vers le format international E.164
   attendu par Zavu (ex: "+2250700000000") — le champ User.telephone /
   Order.clientTelephone est une chaîne libre, jamais validée à la saisie
   (formulaire koili n'impose aucun format), donc les numéros locaux sans
   indicatif pays sont la norme, pas l'exception.

   Ne couvre que la Côte d'Ivoire (marché principal actuel — indicatif 225,
   numéros locaux à 10 chiffres commençant par 0 depuis le passage au
   10 chiffres en 2021) : un numéro qui ne correspond à aucun format connu
   est renvoyé tel quel, à l'appelant de gérer un éventuel échec d'envoi.
───────────────────────────────────────────────────────────── */

const CI_COUNTRY_CODE = '225'

export function normalizePhoneCI(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, '')

  if (digits.startsWith('+')) return digits
  if (digits.startsWith('00')) return `+${digits.slice(2)}`
  if (digits.startsWith(CI_COUNTRY_CODE) && digits.length === 13) return `+${digits}`
  // Format local ivoirien : 10 chiffres commençant par 0 (ex: 0700000000)
  if (digits.length === 10 && digits.startsWith('0')) return `+${CI_COUNTRY_CODE}${digits.slice(1)}`

  return digits
}

/** Code à 6 chiffres, y compris avec un zéro initial (ex: "042913"). */
export function generateOtpCode(): string {
  return String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')
}
