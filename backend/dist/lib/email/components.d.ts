/** Sous-titre bleu en capslock avant le heading, avec puce */
export declare function subheading(text: string): string;
/** Titre principal H1 */
export declare function heading(text: string): string;
/** Paragraphe de corps de texte */
export declare function paragraph(text: string, extraStyle?: string): string;
/** Séparateur horizontal en dégradé */
export declare function divider(): string;
/** Bouton CTA principal */
export declare function ctaButton(label: string, url: string, color?: string): string;
/** Pill de statut (badge arrondi) avec puce */
export declare function statusTag(label: string, accent: string, accentBg: string): string;
/** Bloc encadré avec fond coloré et bordure discrète */
export declare function highlightBox(content: string, bg?: string): string;
/** Tableau de métadonnées label / valeur alignés */
export declare function metaTable(rows: Array<[string, string]>): string;
/** Tableau d'articles de commande */
export declare function orderItemsTable(items: Array<{
    name: string;
    qty: number;
    price: number;
}>): string;
/** Carte produit en promo (vente flash) — image, prix barré, prix promo, réduction */
export declare function dealProductCard(p: {
    name: string;
    image: string;
    price: number;
    salePrice: number;
    url: string;
}): string;
/** Ligne icône + texte */
export declare function iconRow(icon: string, text: string): string;
//# sourceMappingURL=components.d.ts.map