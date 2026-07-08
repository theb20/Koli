export type DealSegment = 'all' | 'buyers' | 'inactive';
/** Envoie (ou marque en échec) une annonce de vente flash déjà enregistrée en base. */
export declare function processDealAnnouncement(id: number): Promise<void>;
/** Poller — envoie les annonces programmées dont l'heure est arrivée. À appeler périodiquement. */
export declare function processDueDealAnnouncements(): Promise<void>;
//# sourceMappingURL=dealAnnouncements.d.ts.map