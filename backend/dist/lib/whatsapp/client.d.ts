export declare function isWhatsAppConfigured(): boolean;
export type TemplateComponent = {
    type: 'body';
    parameters: {
        type: 'text';
        text: string;
    }[];
} | {
    type: 'button';
    sub_type: 'url';
    index: string;
    parameters: {
        type: 'text';
        text: string;
    }[];
};
/**
 * Envoie un message modèle (template) pré-approuvé par Meta.
 * Lance une erreur si la config est absente ou si l'API refuse l'envoi —
 * à l'appelant de décider si l'échec doit être silencieux (.catch(() => {})).
 */
export declare function sendWhatsAppTemplate(to: string, templateName: string, languageCode: string, components: TemplateComponent[]): Promise<void>;
//# sourceMappingURL=client.d.ts.map