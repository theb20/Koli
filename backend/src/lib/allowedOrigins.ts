/**
 * Origines de confiance (front-ends officiels). Réutilisé par CORS (app.ts)
 * et par tout endpoint qui doit construire une URL de redirection à partir
 * de l'Origin de la requête (ex: lien de réinitialisation de mot de passe)
 * sans jamais faire confiance à une valeur arbitraire fournie par le client.
 */
export const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL ??
  'http://localhost:3000',
  'http://localhost:5174',
  'https://skignas.ahobaut.fr',
  'https://adminskignas.web.app',
  'https://skignas.com',
  'https://www.skignas.com',
  'https://admin.skignas.com',
  'https://skignas-bc817.web.app',
  'https://skignas-bc817.firebaseapp.com',
  // koli-business — wizard d'inscription marchand (11 étapes)
  'http://localhost:5175',
  'https://business.skignas.com',
  'https://skignas-business.web.app',
  'https://skignas-business.firebaseapp.com',
  // koli-marchand — dashboard marchand
  'http://localhost:5176',
  'https://marchant-e58f1.web.app',
  'https://marchant-e58f1.firebaseapp.com',
  'https://me.skignas.com',
]
