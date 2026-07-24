export type BusinessType = 'individuel' | 'auto-entrepreneur' | 'societe'
export type IdDocType = 'cni' | 'passeport' | 'permis'
export type PaymentMethod = 'mobile_money' | 'virement_bancaire'

export type RegisterFormData = {
  // 1. Création du compte
  prenom: string
  nom: string
  email: string
  telephone: string
  password: string
  acceptedTerms: boolean

  // 2. Vérification
  emailVerified: boolean

  // 3. Informations personnelles
  photoProfil: File | null
  photoProfilUrl: string
  dateNaissance: string
  paysResidence: string
  villeResidence: string
  langue: string
  devise: string

  // 4. Informations entreprise
  nomBoutique: string
  logoBoutique: File | null
  logoBoutiqueUrl: string
  banniereBoutique: File | null
  banniereBoutiqueUrl: string
  descriptionBoutique: string
  categorieActivite: string
  siteWeb: string

  // 5. Informations légales
  typeEntreprise: BusinessType
  numeroLegal: string    // RCCM — personne physique (auto-entrepreneur) ou morale (société)
  numeroNCC: string      // Numéro de Compte Contribuable (DGI) — remplace la notion de "TVA"
  formeJuridique: string // SARL, SA, SUARL… (société uniquement)
  nomEntreprise: string
  adresseSiege: string

  // 6. Adresse
  paysAdresse: string
  regionAdresse: string
  villeAdresse: string
  codePostal: string
  adresseComplete: string

  // 7. Paiement
  titulaireCompte: string
  banque: string
  iban: string
  swift: string
  mobileMoneyOperateur: string
  mobileMoneyNumero: string
  moyenPaiementPrefere: PaymentMethod

  // 8. KYC
  typeDocument: IdDocType
  documentIdentite: File | null
  documentIdentiteUrl: string
  selfie: File | null
  selfieUrl: string
  justificatifDomicile: File | null
  justificatifDomicileUrl: string

  // 9. Livraison
  zonesLivraison: string
  modesLivraison: string
  delaisLivraison: string
  fraisLivraison: string
  retraitMagasin: boolean

  // 10. Paramètres boutique
  domainePersonnalise: string
  horairesOuverture: string
  facebook: string
  instagram: string
  whatsapp: string
  politiqueRetour: string
  cgv: boolean
}

export const initialRegisterFormData: RegisterFormData = {
  prenom: '', nom: '', email: '', telephone: '', password: '', acceptedTerms: false,
  emailVerified: false,
  photoProfil: null, photoProfilUrl: '', dateNaissance: '', paysResidence: '', villeResidence: '', langue: 'fr', devise: 'XOF',
  nomBoutique: '', logoBoutique: null, logoBoutiqueUrl: '', banniereBoutique: null, banniereBoutiqueUrl: '', descriptionBoutique: '', categorieActivite: '', siteWeb: '',
  typeEntreprise: 'individuel', numeroLegal: '', numeroNCC: '', formeJuridique: '', nomEntreprise: '', adresseSiege: '',
  paysAdresse: '', regionAdresse: '', villeAdresse: '', codePostal: '', adresseComplete: '',
  titulaireCompte: '', banque: '', iban: '', swift: '', mobileMoneyOperateur: '', mobileMoneyNumero: '', moyenPaiementPrefere: 'mobile_money',
  typeDocument: 'cni', documentIdentite: null, documentIdentiteUrl: '', selfie: null, selfieUrl: '', justificatifDomicile: null, justificatifDomicileUrl: '',
  zonesLivraison: '', modesLivraison: '', delaisLivraison: '', fraisLivraison: '', retraitMagasin: false,
  domainePersonnalise: '', horairesOuverture: '', facebook: '', instagram: '', whatsapp: '', politiqueRetour: '', cgv: false,
}

export type StepProps = {
  data: RegisterFormData
  update: (patch: Partial<RegisterFormData>) => void
}

export const PAYS_OPTIONS = [
  { value: 'CI', label: "Côte d'Ivoire" }
]

// Le libellé du numéro légal dépend du pays — RCCM pour la plupart des pays
// UEMOA/CEMAC francophones, IFU spécifiquement mis en avant au Bénin.
export function legalNumberLabel(paysCode: string): string {
  if (paysCode === 'BJ') return 'Numéro IFU'
  if (paysCode === 'CM') return 'Numéro RCCM / NIU'
  return 'Numéro RCCM'
}
