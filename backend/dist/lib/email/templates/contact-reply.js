"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendContactReply = sendContactReply;
const client_1 = require("../client");
const layout_1 = require("../layout");
const settings_1 = require("../settings");
const components_1 = require("../components");
async function sendContactReply(to, prenom, sujet) {
    const contact = await (0, settings_1.getContactInfo)();
    const html = await (0, layout_1.baseLayout)(`
      ${(0, components_1.subheading)('Support client')}
      ${(0, components_1.heading)('Message bien reçu.')}
      ${(0, components_1.paragraph)(`Bonjour <strong style="color:#111827">${prenom}</strong>,`)}
      ${(0, components_1.paragraph)(`Votre message concernant <strong style="color:#111827">&laquo;&nbsp;${sujet}&nbsp;&raquo;</strong> a été transmis à notre équipe. Nous vous répondrons dans les <strong style="color:#111827">24 heures</strong> ouvrées.`)}

      ${(0, components_1.highlightBox)(`
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse">
          <tr>
            <td style="vertical-align:top;padding-right:12px;font-size:18px;padding-top:2px;width:32px">💬</td>
            <td style="font-family:system-ui,-apple-system,sans-serif;font-size:13px;color:#374151;line-height:1.6">
              Pour toute urgence, notre équipe est disponible <strong style="color:#111827">7j/7</strong> sur WhatsApp.
            </td>
          </tr>
        </table>
      `)}

      ${(0, components_1.ctaButton)('Contacter via WhatsApp', (0, settings_1.waLink)(contact.whatsappNumber), '#059669')}
    `, `Nous avons bien reçu votre message concernant "${sujet}".`);
    await (0, client_1.send)(to, `Re : ${sujet} — Skignas`, html);
}
//# sourceMappingURL=contact-reply.js.map