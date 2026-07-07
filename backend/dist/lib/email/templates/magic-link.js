"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMagicLinkEmail = sendMagicLinkEmail;
const client_1 = require("../client");
const layout_1 = require("../layout");
const components_1 = require("../components");
async function sendMagicLinkEmail(to, prenom, link) {
    const html = await (0, layout_1.baseLayout)(`
      ${(0, components_1.subheading)('Connexion sécurisée')}
      ${(0, components_1.heading)(`Bonjour ${prenom},`)}
      ${(0, components_1.paragraph)('Vous avez demandé un lien de connexion à votre compte Skignas. Cliquez sur le bouton ci-dessous pour vous connecter instantanément.')}

      ${(0, components_1.highlightBox)(`
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse">
          <tr>
            <td style="vertical-align:middle;padding-right:12px;font-size:20px;width:32px">⏱</td>
            <td style="font-family:system-ui,-apple-system,sans-serif;font-size:13px;color:#374151;line-height:1.5">
              Ce lien est valable <strong style="color:#0421ff">15 minutes</strong>
              et ne peut être utilisé qu'une seule fois.
            </td>
          </tr>
        </table>
      `)}

      ${(0, components_1.ctaButton)('Me connecter', link)}

      ${(0, components_1.divider)()}
      ${(0, components_1.paragraph)("Si vous n'avez pas demandé ce lien, ignorez cet email. Votre compte reste sécurisé.", 'font-size:13px;color:#9ca3af')}
      `, 'Votre lien de connexion Skignas — valable 15 minutes.');
    await (0, client_1.send)(to, 'Votre lien de connexion Skignas 🔑', html);
}
//# sourceMappingURL=magic-link.js.map