"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FROM = exports.resend = void 0;
exports.send = send;
const resend_1 = require("resend");
exports.resend = new resend_1.Resend(process.env.RESEND_API_KEY);
exports.FROM = process.env.EMAIL_FROM ?? 'Skignas <noreply@skignas.ahobaut.fr>';
/**
 * Envoie un email via Resend.
 * Lance une erreur si l'API renvoie une erreur.
 */
async function send(to, subject, html) {
    const { error } = await exports.resend.emails.send({ from: exports.FROM, to, subject, html });
    if (error)
        throw new Error(`Resend error [${error.name}]: ${error.message}`);
}
//# sourceMappingURL=client.js.map