import { Resend } from 'resend';
import { AsyncLocalStorage } from 'node:async_hooks';
export declare const resend: Resend;
export declare const FROM: string;
/**
 * Contexte de capture pour la prévisualisation (GET /api/email-templates/:name) :
 * quand actif, send() écrit le HTML dans le store au lieu d'appeler Resend.
 * Isolé par requête via AsyncLocalStorage — contrairement à un monkey-patch de
 * resend.emails.send sur l'objet partagé, un vrai envoi concurrent (ex: un
 * reset de mot de passe pendant qu'un admin prévisualise un template) ne peut
 * jamais être intercepté par erreur ni avalé silencieusement.
 */
export declare const emailCaptureContext: AsyncLocalStorage<{
    html: string;
}>;
/**
 * Envoie un email via Resend.
 * Lance une erreur si l'API renvoie une erreur.
 */
export declare function send(to: string, subject: string, html: string): Promise<void>;
//# sourceMappingURL=client.d.ts.map