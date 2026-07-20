"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPasswordChangedEmail = sendPasswordChangedEmail;
const client_1 = require("../client");
const layout_1 = require("../layout");
const components_1 = require("../components");
async function sendPasswordChangedEmail(to, prenom, ipAddress) {
    const html = await (0, layout_1.baseLayout)(`
      ${(0, components_1.subheading)('Sécurité du compte')}
      ${(0, components_1.heading)(`Bonjour ${prenom},`)}
      ${(0, components_1.paragraph)('Le mot de passe de votre compte Skignas vient d\'être modifié avec succès.')}

      ${(0, components_1.highlightBox)(`
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse">
          <tr>
            <td style="vertical-align:middle;padding-right:12px;font-size:20px;width:32px">🛡️</td>
            <td style="font-family:system-ui,-apple-system,sans-serif;font-size:13px;color:#374151;line-height:1.5">
              Par mesure de sécurité, toutes vos sessions actives ont été déconnectées${ipAddress ? ` (demande depuis l'adresse ${ipAddress})` : ''}.
              Vous devrez vous reconnecter partout.
            </td>
          </tr>
        </table>
      `)}

      ${(0, components_1.divider)()}
      ${(0, components_1.paragraph)("Si vous n'êtes pas à l'origine de ce changement, contactez le support immédiatement — votre compte pourrait être compromis.", 'font-size:13px;color:#ef4444;font-weight:600')}
      `, 'Le mot de passe de votre compte Skignas a été modifié.');
    await (0, client_1.send)(to, 'Votre mot de passe Skignas a été modifié 🔒', html);
}
//# sourceMappingURL=password-changed.js.map