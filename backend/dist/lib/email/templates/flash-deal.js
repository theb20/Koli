"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendFlashDealEmail = sendFlashDealEmail;
const client_1 = require("../client");
const layout_1 = require("../layout");
const components_1 = require("../components");
async function sendFlashDealEmail(to, prenom, products, endsAt) {
    const frontUrl = process.env.FRONTEND_URL ?? 'https://skignas.com';
    const endLabel = endsAt.toLocaleString('fr-FR', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' });
    const title = products.length === 1
        ? `Vente flash sur ${products[0].name}`
        : `Vente flash sur ${products.length} produits`;
    const cards = products
        .map(p => (0, components_1.dealProductCard)({ ...p, url: `${frontUrl}/catalogue/${p.id}` }))
        .join('');
    const html = await (0, layout_1.baseLayout)(`
      ${(0, components_1.subheading)('Vente flash ⚡')}
      ${(0, components_1.heading)(`Bonjour ${prenom},`)}
      ${(0, components_1.paragraph)(`Une promotion à durée limitée vient d'être lancée${products.length > 1 ? ' sur plusieurs produits' : ''} — jusqu'à <strong style="color:#dc2626">-${Math.max(...products.map(p => Math.round(((p.price - p.salePrice) / p.price) * 100)))}%</strong>.`)}

      ${cards}

      ${(0, components_1.paragraph)(`⏳ Offre valable jusqu'au <strong style="color:#111827">${endLabel}</strong>, dans la limite des stocks disponibles.`)}

      ${(0, components_1.ctaButton)('Voir la vente flash', `${frontUrl}/catalogue?badge=sale`, '#dc2626')}
    `, title);
    await (0, client_1.send)(to, `⚡ ${title} — à ne pas manquer`, html);
}
//# sourceMappingURL=flash-deal.js.map