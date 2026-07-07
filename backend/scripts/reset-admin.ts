/**
 * Réinitialise le mot de passe admin
 * Usage : npx ts-node scripts/reset-admin.ts <email> <nouveauMotDePasse>
 * Ex    : npx ts-node scripts/reset-admin.ts admin@koli.cm MonNouveauMdp@2026
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Début de la réinitialisation...')
  const [email, password] = process.argv.slice(2)
  console.log('📧 Email reçu :', email)
  console.log('🔑 Mot de passe reçu :', password ? '***' : 'NON FOURNI')

  const normalizedEmail = email?.toLowerCase().trim()

  if (!normalizedEmail || !password) {
    console.error('❌ Usage : npx ts-node scripts/reset-admin.ts <email> <password>')
    process.exit(1)
  }

  if (password.length < 8) {
    console.error('❌ Mot de passe trop court (minimum 8 caractères)')
    process.exit(1)
  }

  console.log('🔍 Recherche de l\'utilisateur avec email normalisé :', normalizedEmail)
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })
  if (!user) {
    console.error(`❌ Aucun utilisateur trouvé avec l'email : ${email} (normalisé : ${normalizedEmail})`)
    process.exit(1)
  }

  console.log('✅ Utilisateur trouvé :', user.prenom, user.nom, user.email)

  console.log('🔐 Hachage du nouveau mot de passe...')
  const hashed = await bcrypt.hash(password, 12)

  console.log('💾 Mise à jour en base de données...')
  await prisma.user.update({
    where: { email: normalizedEmail },
    data:  { password: hashed },
  })

  console.log('🗑️ Révocation des sessions actives...')
  await prisma.session.deleteMany({ where: { userId: user.id } })

  console.log(`\n✅ Mot de passe mis à jour avec succès !`)
  console.log('──────────────────────────────────────────────')
  console.log('Email       :', normalizedEmail)
  console.log('Nouveau mdp :', password)
  console.log('⚠️  Toutes les sessions actives ont été révoquées.')
  console.log('──────────────────────────────────────────────')
}

main()
  .catch(err => { console.error('❌ Erreur:', err.message); process.exit(1) })
  .finally(() => prisma.$disconnect())

