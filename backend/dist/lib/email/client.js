"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailCaptureContext = exports.FROM = exports.resend = void 0;
exports.send = send;
const resend_1 = require("resend");
const node_async_hooks_1 = require("node:async_hooks");
exports.resend = new resend_1.Resend(process.env.RESEND_API_KEY);
exports.FROM = process.env.EMAIL_FROM ?? 'Skignas <noreply@skignas.com>';
/**
 * Contexte de capture pour la prévisualisation (GET /api/email-templates/:name) :
 * quand actif, send() écrit le HTML dans le store au lieu d'appeler Resend.
 * Isolé par requête via AsyncLocalStorage — contrairement à un monkey-patch de
 * resend.emails.send sur l'objet partagé, un vrai envoi concurrent (ex: un
 * reset de mot de passe pendant qu'un admin prévisualise un template) ne peut
 * jamais être intercepté par erreur ni avalé silencieusement.
 */
exports.emailCaptureContext = new node_async_hooks_1.AsyncLocalStorage();
/**
 * Envoie un email via Resend.
 * Lance une erreur si l'API renvoie une erreur.
 */
async function send(to, subject, html) {
    const capture = exports.emailCaptureContext.getStore();
    if (capture) {
        capture.html = html;
        return;
    }
    const { error } = await exports.resend.emails.send({ from: exports.FROM, to, subject, html });
    if (error)
        throw new Error(`Resend error [${error.name}]: ${error.message}`);
}
//# sourceMappingURL=client.js.map