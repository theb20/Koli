"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendProductRequestReplyEmail = sendProductRequestReplyEmail;
const client_1 = require("../client");
const layout_1 = require("../layout");
const components_1 = require("../components");
function fmt(n) {
    return n.toLocaleString('fr-FR') + '&nbsp;FCFA';
}
async function sendProductRequestReplyEmail(to, prenom, productName, replyMessage, quotedPrice) {
    const frontUrl = process.env.FRONTEND_URL ?? 'https://skignas.com';
    const html = await (0, layout_1.baseLayout)(`
      ${(0, components_1.subheading)('Réponse à votre demande')}
      ${(0, components_1.heading)(`Concernant : ${productName}`)}
      ${(0, components_1.paragraph)(`Bonjour <strong style="color:#111827">${prenom}</strong>,`)}
      ${(0, components_1.paragraph)(`Notre équipe a étudié votre demande de sourcing. Voici notre réponse :`)}

      ${(0, components_1.highlightBox)(`<p style="font-family:system-ui,-apple-system,sans-serif;font-size:14px;color:#111827;line-height:1.7;white-space:pre-line;margin:0">${replyMessage}</p>`)}

      ${quotedPrice != null ? `
        ${(0, components_1.divider)()}
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse">
          <tr>
            <td style="font-family:system-ui,-apple-system,sans-serif;font-size:13px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;color:#6b7280">Prix proposé</td>
            <td style="font-family:system-ui,-apple-system,sans-serif;font-size:22px;font-weight:900;color:#0421ff;text-align:right;letter-spacing:-0.5px">${fmt(quotedPrice)}</td>
          </tr>
        </table>
      ` : ''}

      ${(0, components_1.ctaButton)('Nous contacter', `${frontUrl}/contact`)}
    `, `Réponse à votre demande de sourcing : ${productName}`);
    await (0, client_1.send)(to, `Réponse à votre demande — ${productName}`, html);
}
//# sourceMappingURL=product-request-reply.js.map