"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPasswordResetEmail = sendPasswordResetEmail;
const client_1 = require("../client");
const layout_1 = require("../layout");
const components_1 = require("../components");
async function sendPasswordResetEmail(to, prenom, link) {
    const html = await (0, layout_1.baseLayout)(`
      ${(0, components_1.subheading)('Réinitialisation du mot de passe')}
      ${(0, components_1.heading)(`Bonjour ${prenom},`)}
      ${(0, components_1.paragraph)("Vous avez demandé la réinitialisation du mot de passe de votre compte Skignas. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.")}

      ${(0, components_1.highlightBox)(`
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse">
          <tr>
            <td style="vertical-align:middle;padding-right:12px;font-size:20px;width:32px">⏱</td>
            <td style="font-family:system-ui,-apple-system,sans-serif;font-size:13px;color:#374151;line-height:1.5">
              Ce lien est valable <strong style="color:#0421ff">30 minutes</strong>
              et ne peut être utilisé qu'une seule fois.
            </td>
          </tr>
        </table>
      `)}

      ${(0, components_1.ctaButton)('Réinitialiser mon mot de passe', link)}

      ${(0, components_1.divider)()}
      ${(0, components_1.paragraph)("Si vous n'êtes pas à l'origine de cette demande, ignorez cet email — votre mot de passe actuel reste inchangé. Si cela se reproduit, contactez le support.", 'font-size:13px;color:#9ca3af')}
      `, 'Réinitialisez votre mot de passe Skignas — lien valable 30 minutes.');
    await (0, client_1.send)(to, 'Réinitialisation de votre mot de passe Skignas 🔒', html);
}
//# sourceMappingURL=password-reset.js.map