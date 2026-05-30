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
  const [email, password] = process.argv.slice(2)

  if (!email || !password) {
    console.error('Usage : npx ts-node scripts/reset-admin.ts <email> <password>')
    process.exit(1)
  }

  if (password.length < 8) {
    console.error('❌ Mot de passe trop court (minimum 8 caractères)')
    process.exit(1)
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    console.error(`❌ Aucun utilisateur trouvé avec l'email : ${email}`)
    process.exit(1)
  }

  const hashed = await bcrypt.hash(password, 12)
  await prisma.user.update({
    where: { email },
    data:  { password: hashed },
  })

  // Révoque toutes les sessions actives (reconnexion forcée)
  await prisma.session.deleteMany({ where: { userId: user.id } })

  console.log(`✅ Mot de passe mis à jour pour ${email}`)
  console.log('⚠️  Toutes les sessions actives ont été révoquées.')
}

main()
  .catch(err => { console.error('❌', err.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
