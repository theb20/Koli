export type EmailContactInfo = {
    whatsappNumber: string;
    supportEmail: string;
    supportPhone: string;
};
/** Coordonnées de contact réelles (SiteSettings), avec repli si indisponible. */
export declare function getContactInfo(): Promise<EmailContactInfo>;
export declare function waLink(whatsappNumber: string, text?: string): string;
//# sourceMappingURL=settings.d.ts.map