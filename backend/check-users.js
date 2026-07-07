
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Liste des utilisateurs en base de données :');
  const users = await prisma.user.findMany();
  console.log(users);
  console.log('\n-------------------------------');
}

main()
  .catch(e => console.error('❌ Erreur:', e))
  .finally(async () => await prisma.$disconnect());

