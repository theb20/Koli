"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWelcomeEmail = sendWelcomeEmail;
const client_1 = require("../client");
const layout_1 = require("../layout");
const components_1 = require("../components");
async function sendWelcomeEmail(to, prenom) {
    const frontUrl = process.env.FRONTEND_URL ?? 'https://skignas.com';
    const html = await (0, layout_1.baseLayout)(`
      ${(0, components_1.checkBadge)('Compte activé')}
      ${(0, components_1.heading)(`Bienvenue, ${prenom} !`)}
      ${(0, components_1.paragraph)("Votre compte Skignas est prêt. Vous rejoignez <strong style=\"color:#202124;font-weight:500\">+1&nbsp;000</strong> clients satisfaits à travers la Côte d'Ivoire.")}

      ${(0, components_1.featureBlock)([
        { icon: '📦', iconBg: '#e8f0fe', title: 'Suivi en temps réel', desc: 'Vos commandes à portée de main' },
        { icon: '❤️', iconBg: '#fce8e6', title: 'Liste de souhaits', desc: 'Retrouvez vos favoris à tout moment' },
        { icon: '🎁', iconBg: '#fef7e0', title: 'Offres exclusives', desc: 'Réservées aux membres Skignas' },
    ])}

      ${(0, components_1.divider)()}
      ${(0, components_1.paragraph)('Parcourez des milliers de produits sélectionnés avec soin, livrés chez vous en 48–72h.')}
      ${(0, components_1.ctaButton)('Découvrir le catalogue', `${frontUrl}/catalogue`)}
      `, `Bienvenue chez Skignas, ${prenom} — votre compte est actif.`);
    await (0, client_1.send)(to, `Bienvenue chez Skignas, ${prenom} 🎉`, html);
}
//# sourceMappingURL=welcome.js.map