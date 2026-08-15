import { PrismaClient } from '@prisma/client'
import { mockDeep, mockReset, type DeepMockProxy } from 'vitest-mock-extended'
import { beforeEach } from 'vitest'

// Mock profond réutilisé par tous les tests de routes qui touchent la base —
// aucun test n'ouvre de vraie connexion Postgres. Voir usage :
//   vi.mock('../lib/prisma', () => ({ prisma: prismaMock }))
export const prismaMock = mockDeep<PrismaClient>() as unknown as DeepMockProxy<PrismaClient>

beforeEach(() => {
  mockReset(prismaMock)
})
