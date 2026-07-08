"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWelcomeEmail = sendWelcomeEmail;
const client_1 = require("../client");
const layout_1 = require("../layout");
const components_1 = require("../components");
async function sendWelcomeEmail(to, prenom) {
    const frontUrl = process.env.FRONTEND_URL ?? 'https://skignas.com';
    const html = await (0, layout_1.baseLayout)(`
      ${(0, components_1.subheading)('Compte activé')}
      ${(0, components_1.heading)(`Bienvenue, ${prenom} !`)}
      ${(0, components_1.paragraph)("Votre compte Skignas est prêt. Vous rejoignez <strong style=\"color:#111827\">+12&nbsp;000</strong> clients satisfaits à travers la Côte d'Ivoire.")}

      ${(0, components_1.highlightBox)(`
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse">
          <tbody>
            ${(0, components_1.iconRow)('📦', '<strong style="color:#111827">Suivi en temps réel</strong> · Vos commandes à portée de main')}
            ${(0, components_1.iconRow)('❤️', '<strong style="color:#111827">Liste de souhaits</strong> · Retrouvez vos favoris à tout moment')}
            ${(0, components_1.iconRow)('🎁', '<strong style="color:#111827">Offres exclusives</strong> · Réservées aux membres Skignas')}
          </tbody>
        </table>
      `)}

      ${(0, components_1.divider)()}
      ${(0, components_1.paragraph)('Parcourez des milliers de produits sélectionnés avec soin, livrés chez vous en 48–72h.', 'color:#6b7280')}
      ${(0, components_1.ctaButton)('Découvrir le catalogue', `${frontUrl}/catalogue`)}
      `, `Bienvenue chez Skignas, ${prenom} — votre compte est actif.`);
    await (0, client_1.send)(to, `Bienvenue chez Skignas, ${prenom} 🎉`, html);
}
//# sourceMappingURL=welcome.js.map