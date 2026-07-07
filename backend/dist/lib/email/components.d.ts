/** Sous-titre bleu en capslock avant le heading */
export declare function subheading(text: string): string;
/** Titre principal H1 */
export declare function heading(text: string): string;
/** Paragraphe de corps de texte */
export declare function paragraph(text: string, extraStyle?: string): string;
/** Séparateur horizontal */
export declare function divider(): string;
/** Bouton CTA principal */
export declare function ctaButton(label: string, url: string, color?: string): string;
/** Pill de statut (badge arrondi) */
export declare function statusTag(label: string, accent: string, accentBg: string): string;
/** Bloc encadré avec fond coloré */
export declare function highlightBox(content: string, bg?: string): string;
/** Tableau de métadonnées label / valeur alignés */
export declare function metaTable(rows: Array<[string, string]>): string;
/** Tableau d'articles de commande */
export declare function orderItemsTable(items: Array<{
    name: string;
    qty: number;
    price: number;
}>): string;
/** Ligne icône + texte */
export declare function iconRow(icon: string, text: string): string;
//# sourceMappingURL=components.d.ts.map