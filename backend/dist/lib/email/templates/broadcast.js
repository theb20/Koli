"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendBroadcastEmail = sendBroadcastEmail;
const client_1 = require("../client");
const layout_1 = require("../layout");
const components_1 = require("../components");
async function sendBroadcastEmail(to, prenom, title, message) {
    const frontUrl = process.env.FRONTEND_URL ?? 'https://skignas.com';
    const html = await (0, layout_1.baseLayout)(`
      ${(0, components_1.subheading)('Annonce Skignas')}
      ${(0, components_1.heading)(`Bonjour ${prenom},`)}
      ${(0, components_1.paragraph)(title, 'font-weight:700;color:#111827;font-size:16px')}
      ${(0, components_1.paragraph)(message)}

      ${(0, components_1.ctaButton)('Découvrir le catalogue', `${frontUrl}/catalogue`)}
      `, title);
    await (0, client_1.send)(to, title, html);
}
//# sourceMappingURL=broadcast.js.map