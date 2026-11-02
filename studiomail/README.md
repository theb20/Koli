# StudioMail

Studio de création d'e-mails professionnels — éditeur visuel, blocs, export HTML. Prototype local-first (aucun backend, projets stockés dans le `localStorage` du navigateur).

## Installation

```bash
cd studiomail
npm install
npm run dev       # http://localhost:5177
```

Autres commandes :

```bash
npm run build      # typecheck (tsc -b) + build de production dans dist/
npm run preview    # sert le build de production localement
```

Aucune variable d'environnement requise — tout fonctionne sans clé API ni service payant.

## Important : limite de test de cette livraison

Ce code a été vérifié par **typecheck strict** (`tsc -b`, zéro erreur) et **build de production** (zéro erreur), et son fonctionnement a été raisonné manuellement en détail (notamment l'édition de texte en place, qui a nécessité une relecture de sécurité — voir plus bas). **Il n'a en revanche pas pu être testé en cliquant réellement dans un navigateur** dans cet environnement (aucun outil d'automatisation de navigateur n'y est disponible). Avant une utilisation réelle, testez vous-même le parcours : créer un projet → éditer visuellement → glisser-déposer → aperçu mobile → exporter le HTML.

## Ce qui fonctionne réellement (vérifié par le code, à confirmer visuellement)

- **Projets** : créer (vierge ou à partir d'un modèle), dupliquer, renommer, mettre en favori, supprimer, rechercher. Sauvegarde automatique (debounce ~1,2 s) + indicateur d'état dans la barre du haut. Import/export au format JSON versionné (`formatVersion`), validé par Zod à l'import.
- **12 modèles** de démonstration avec contenu crédible (newsletter, bienvenue, lancement produit, promotion, panier abandonné, confirmation de commande, facture, réinitialisation de mot de passe, notification transactionnelle, prospection B2B, événement, communication interne).
- **11 types de blocs** : titre, paragraphe (gras/italique/souligné/lien/liste via la sélection de texte), image, bouton, séparateur, espacement, colonnes (2 à 4, empilables sur mobile), logo, réseaux sociaux, pied de page (avec lien de désinscription), HTML personnalisé.
- **Édition visuelle réelle** : sélection au clic, édition de texte en place (contentEditable, jamais de perte de curseur), glisser-déposer pour réordonner (dans une section, dans une colonne, et entre les deux), dupliquer/supprimer un bloc ou une section, ajouter une section, déplacer une section (haut/bas).
- **Inspecteur de propriétés** : onglets Contenu / Style / Responsive (masquer sur mobile ou ordinateur, marges) par bloc ; panneau dédié pour les propriétés de section (couleur de fond, largeur, marges).
- **Historique annuler/rétablir** réel (pile d'instantanés du document, jusqu'à 100 étapes), raccourcis Cmd/Ctrl+Z et Cmd/Ctrl+Maj+Z.
- **Aperçu** desktop/tablette/mobile — rendu depuis le MÊME moteur HTML que l'export (une iframe avec le HTML final), jamais une approximation visuelle séparée.
- **Export** : HTML autonome (tableaux + styles inline, compatible clients de messagerie, media query pour l'empilement mobile des colonnes, conditionnels Outlook), version texte brut, copie du code, téléchargement du fichier.
- **Contrôle qualité** : objet/pré-en-tête manquants, document vide, images sans source ou sans texte alternatif, boutons sans lien valide, contraste de texte insuffisant (calcul WCAG réel), absence de lien de désinscription — chaque problème cliquable renvoie au bloc concerné.
- **Création assistée** : mode démonstration explicite et déterministe (suggestions d'objet, réécriture de ton, génération à partir d'un brief qui choisit un modèle pertinent par mots-clés) — **aucune IA réelle n'est connectée**, c'est annoncé clairement dans le panneau. L'interface `lib/ai/provider.ts` est prête à recevoir un vrai fournisseur plus tard, via un backend (jamais de clé API dans ce frontend).
- **Sécurité** : tout HTML saisi par l'utilisateur (texte riche, bloc HTML personnalisé) est assaini avant rendu (`lib/sanitizeRichText.ts` — retire scripts, gestionnaires d'événements, URL `javascript:`/`data:`). Les champs censés être du texte brut (titre, bouton) ne passent jamais par `innerHTML` en lecture, pour éviter qu'une valeur important (JSON importé) ne s'exécute comme du HTML.

## Pont vers les e-mails de sécurité Skignas (réel, pas qu'un lien)

StudioMail n'a pas d'accès réseau vers le backend Skignas (aucune authentification admin ici), donc le pont n'est pas automatique — mais il est réel, pas seulement un lien qui ouvre un onglet :

1. Dans **Exporter → HTML**, copiez le code (bouton "Copier le code" ou "Télécharger .html").
2. Dans **koli-admin → E-mails de sécurité**, activez le mode **« HTML personnalisé »**, collez le code. Un aperçu live (iframe) confirme le rendu avant envoi.
3. Le backend **assainit ce HTML côté serveur** (`backend/src/lib/sanitizeEmailHtml.ts`, via `sanitize-html`) avant tout envoi réel — scripts, gestionnaires d'événements et URL `javascript:`/`data:` retirés, même si le HTML provient d'un copier-coller externe, pas seulement de StudioMail.
4. L'envoi utilise alors ce HTML tel quel (plus le gabarit `message` standard) — voir `backend/src/lib/email/templates/security-alert.ts`, paramètre `customHtml`.

Limite assumée : aucune personnalisation par destinataire dans ce mode (pas d'injection du prénom) — le même contenu statique part à tout le monde dans une campagne donnée.

## Ce qui N'EST PAS fait (honnêteté du cahier des charges, section 13)

- **Pas de glisser-déposer depuis la bibliothèque de blocs** vers une position précise du canevas — ajouter un bloc dépose en fin de section/colonne ; le réordonnancement par glisser-déposer, lui, fonctionne sur les blocs déjà posés.
- **Pas d'imbrication de colonnes dans des colonnes** (une colonne ne peut contenir que des blocs simples) — limite assumée, documentée dans `types/document.ts`.
- **Pas de téléversement d'image** : les blocs image/logo prennent une URL, ce studio n'héberge aucun fichier (pas de backend).
- **Pas d'export ZIP** avec ressources — conséquence directe du point précédent, rien à empaqueter.
- **Pas de simulation certifiée Gmail/Outlook/Apple Mail** — l'aperçu et le contrôle qualité sont des outils internes honnêtes, pas un moteur de rendu tiers (type Litmus/Email on Acid).
- **Traduction** : le bouton existe dans l'interface du fournisseur IA mais `translateDocument` ne traduit pas réellement en mode démo (documenté comme tel dans le code) — aucun service de traduction n'est branché.
- **Historique de versions nommées / restauration ponctuelle** : seul l'annuler/rétablir en pile est implémenté, pas un historique de versions consultable a posteriori comme un vrai contrôle de version.
- **Pas de gestion visible en interface d'un échec de sauvegarde locale** (ex : quota `localStorage` dépassé) — l'échec est seulement journalisé en console (`lib/storage.ts`), jamais silencieusement présenté comme un succès côté UI pour autant (l'indicateur "Enregistré" reflète l'état `dirty`, pas une confirmation d'écriture réussie).
- **Pas de tests automatisés** (unitaires/composants/E2E) — non écrits faute de temps dans cette livraison ; le code a été vérifié par typecheck strict et relecture manuelle, pas par une suite de tests.
- **Mode sombre manuel** : les jetons de couleur `--color-*` existent pour `prefers-color-scheme: dark` et `[data-theme="dark"]` (voir `index.css`), mais aucun bouton de bascule n'est câblé dans l'interface — seul le mode système est actif.

## Architecture

```
src/
  types/document.ts        Modèle de données (Zod) — source unique de vérité
  lib/
    blocks/                 Fabrique de blocs par défaut, registre pour la bibliothèque
    html/                   Moteur d'export (HTML table-based + texte brut)
    qa/checks.ts             Contrôle qualité
    ai/provider.ts           Interface IA + implémentation démo déterministe
    templates/               12 modèles de démonstration
    sanitizeRichText.ts       Assainissement HTML (sécurité)
    storage.ts                Persistance localStorage versionnée
  store/
    editorStore.ts           Document en cours d'édition + sélection + historique (Zustand + Immer)
    projectsStore.ts         Liste des projets (CRUD, persistée)
    dndStore.ts               État de glisser-déposer éphémère
  components/
    blocks/                   Rendu canevas des blocs (édition en place)
    layout/                   TopBar, LeftPanel, Canvas, Inspector
    panels/                   Aperçu, Export, Contrôle qualité, IA, Nouveau projet
    ui/                        Primitives (Button, Field, Modal, Tabs...)
  pages/
    ProjectsPage.tsx          Accueil / gestion des projets
    EditorPage.tsx            Le studio lui-même
```

Le modèle de document (`types/document.ts`) est la seule source de vérité : le canevas (React), le JSON sauvegardé et le HTML exporté en dérivent tous directement, sans état parallèle qui pourrait diverger.
