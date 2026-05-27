"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const app_1 = __importDefault(require("./app"));
const prisma_1 = require("./lib/prisma");
const PORT = parseInt(process.env.PORT ?? '4000');
async function main() {
    // Test connexion DB
    await prisma_1.prisma.$connect();
    console.log('✅ Base de données connectée');
    app_1.default.listen(PORT, () => {
        console.log(`
╔══════════════════════════════════════╗
║       🛍  KOLI API — v1.0.0          ║
╠══════════════════════════════════════╣
║  Serveur  : http://localhost:${PORT}    ║
║  Env      : ${(process.env.NODE_ENV ?? 'development').padEnd(22)}  ║
║  DB       : ${(process.env.DATABASE_URL ?? '').slice(0, 22).padEnd(22)}  ║
╚══════════════════════════════════════╝
    `);
    });
}
main().catch(err => {
    console.error('❌ Erreur démarrage:', err);
    process.exit(1);
});
// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM reçu — arrêt gracieux...');
    await prisma_1.prisma.$disconnect();
    process.exit(0);
});
process.on('SIGINT', async () => {
    await prisma_1.prisma.$disconnect();
    process.exit(0);
});
//# sourceMappingURL=index.js.map