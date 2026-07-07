import { Resend } from 'resend';
export declare const resend: Resend;
export declare const FROM: string;
/**
 * Envoie un email via Resend.
 * Lance une erreur si l'API renvoie une erreur.
 */
export declare function send(to: string, subject: string, html: string): Promise<void>;
//# sourceMappingURL=client.d.ts.map