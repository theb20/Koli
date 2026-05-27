/* ═══════════════════════════════════════════════════════════════
   SHARED PRODUCT DATA
   Source unique pour CataloguePage + ProductPage + BestSellers
═══════════════════════════════════════════════════════════════ */

export type Badge = 'hot' | 'new' | 'sale' | 'top'

export type Product = {
  id: number
  name: string
  brand: string
  category: string
  price: number
  oldPrice?: number
  rating: number
  reviews: number
  /** 4 images : [principale, alt1, alt2, alt3] */
  images: [string, string, string, string]
  badge?: Badge
  sold: number
  stock?: number
  isNew?: boolean
  description?: string
  specs?: { label: string; value: string }[]
  colors?: string[]
}

const U = 'https://images.unsplash.com/photo-'
const Q = '?w=800&q=85'

export const PRODUCTS: Product[] = [
  /* ── High-Tech ── */
  {
    id: 1, name: 'Montre Connectée Pro X7', brand: 'TechWave', category: 'hightech',
    price: 29990, oldPrice: 49990, rating: 4.8, reviews: 2341, badge: 'hot', sold: 1240, stock: 12,
    images: [`${U}1546868871-7041f2a55e12${Q}`, `${U}1523275335684-37898b6baf30${Q}`, `${U}1508685096489-7aacd43bd3b1${Q}`, `${U}1579586337278-3befd40fd17a${Q}`],
    colors: ['#1a1a2e', '#c0c0c0', '#b87333'],
    description: 'La Montre Connectée Pro X7 redéfinit l\'élégance technologique. Avec son écran AMOLED 1.4" Always-On, son suivi santé 24/7 (cardiaque, SpO2, stress) et son autonomie de 14 jours, elle accompagne chaque instant de votre vie. Étanche 50m, compatible iOS & Android.',
    specs: [
      { label: 'Écran', value: 'AMOLED 1.4" Always-On 454×454px' },
      { label: 'Autonomie', value: '14 jours (mode eco : 30 jours)' },
      { label: 'Étanchéité', value: '5ATM — 50 mètres' },
      { label: 'Capteurs', value: 'Cardio, SpO2, Gyroscope, Accéléromètre' },
      { label: 'Connectivité', value: 'Bluetooth 5.3, GPS intégré' },
      { label: 'Compatibilité', value: 'iOS 14+ / Android 8+' },
      { label: 'Matière bracelet', value: 'Fluoroélastomère premium' },
      { label: 'Garantie', value: '24 mois constructeur' },
    ],
  },
  {
    id: 2, name: 'Écouteurs Sans Fil ANC 40h', brand: 'SoundMax', category: 'hightech',
    price: 24990, oldPrice: 39990, rating: 4.7, reviews: 1105, badge: 'sale', sold: 890,
    images: [`${U}1505740420928-5e560c06d30e${Q}`, `${U}1484704849700-f032a568e944${Q}`, `${U}1524678714210-9917a6c619c2${Q}`, `${U}1583394838336-acd977736f90${Q}`],
    colors: ['#0a0a0a', '#f5f5f5', '#1a3a6b'],
    description: 'Plongez dans votre univers sonore avec les SoundMax ANC. Réduction active du bruit de dernière génération, 40h d\'autonomie totale, drivers 40mm hi-fi et microphones à formation de faisceaux pour des appels cristallins. Le compagnon audio ultime.',
    specs: [
      { label: 'Autonomie écouteurs', value: '10h (ANC on) / 15h (ANC off)' },
      { label: 'Autonomie avec étui', value: '40h totales' },
      { label: 'Réduction de bruit', value: 'Hybride ANC -35dB' },
      { label: 'Drivers', value: '40mm néodyme hi-fi' },
      { label: 'Bluetooth', value: '5.2 — portée 10m' },
      { label: 'Charge', value: 'USB-C + charge sans fil Qi' },
      { label: 'Latence', value: 'Mode Gaming < 40ms' },
      { label: 'Garantie', value: '12 mois' },
    ],
  },
  {
    id: 3, name: 'Smartphone 5G 256Go Camera 200MP', brand: 'NovaPro', category: 'hightech',
    price: 149990, oldPrice: 189990, rating: 4.9, reviews: 876, badge: 'top', sold: 432,
    images: [`${U}1511707171634-5f897ff02aa9${Q}`, `${U}1598327105666-5b89351aff97${Q}`, `${U}1565849904461-04a58ad377e0${Q}`, `${U}1580910051074-3eb694886505${Q}`],
    colors: ['#0d1117', '#6e40c9', '#c0c0c0'],
    description: 'La référence absolue de la photo mobile. Avec son capteur principal 200MP OIS, son zoom périscopique 10×, son processeur Snapdragon 8 Gen 3 et sa charge rapide 100W, le NovaPro repousse les frontières du possible. Écran ProXDR 6.8" 144Hz.',
    specs: [
      { label: 'Écran', value: '6.8" AMOLED ProXDR 144Hz 2K+' },
      { label: 'Processeur', value: 'Snapdragon 8 Gen 3 — 4nm' },
      { label: 'RAM / Stockage', value: '12 Go LPDDR5X / 256 Go UFS 4.0' },
      { label: 'Caméra principale', value: '200MP OIS f/1.7' },
      { label: 'Zoom', value: 'Périscopique 10× optique' },
      { label: 'Batterie', value: '5000 mAh — Charge 100W filaire' },
      { label: 'Système', value: 'Android 15 — 4 ans de mises à jour' },
      { label: 'Étanchéité', value: 'IP68' },
    ],
  },
  {
    id: 4, name: 'Tablette 11" AMOLED 120Hz', brand: 'TabX', category: 'hightech',
    price: 89990, oldPrice: 129990, rating: 4.6, reviews: 543, badge: 'new', sold: 315, isNew: true,
    images: [`${U}1544244015-0df4b3ffc6b0${Q}`, `${U}1561154464-82e9adf32764${Q}`, `${U}1585789575492-f4a154d5b5a9${Q}`, `${U}1627454820516-d7b7d6fe7a59${Q}`],
    colors: ['#1a1a2e', '#f8f8f8'],
    description: 'Créativité, productivité et divertissement sans compromis. La TabX 11" offre un écran AMOLED 120Hz flamboyant, la compatibilité stylet et clavier (vendus séparément), 8h d\'autonomie réelle et une charge rapide 45W.',
    specs: [
      { label: 'Écran', value: '11" AMOLED 120Hz 2560×1600px' },
      { label: 'Processeur', value: 'Dimensity 9000+ — 4nm' },
      { label: 'RAM / Stockage', value: '8 Go / 256 Go + MicroSD' },
      { label: 'Batterie', value: '8360 mAh — Charge 45W' },
      { label: 'Caméra', value: '13MP + 8MP frontal' },
      { label: 'Connectivité', value: 'WiFi 6E, Bluetooth 5.3, USB-C 3.2' },
      { label: 'Système', value: 'Android 15' },
      { label: 'Garantie', value: '24 mois' },
    ],
  },
  {
    id: 5, name: 'Chargeur Rapide 65W GaN 4-en-1', brand: 'PowerGo', category: 'hightech',
    price: 14990, oldPrice: 24990, rating: 4.5, reviews: 2100, badge: 'sale', sold: 3200,
    images: [`${U}1609091839311-d5365f9ff1c5${Q}`, `${U}1583863788434-e58a36330cf0${Q}`, `${U}1588508065123-287b28e013da${Q}`, `${U}1615655406736-b37c4fabf923${Q}`],
    colors: ['#1a1a1a', '#f5f5f5'],
    description: 'Chargez 4 appareils simultanément avec une seule prise. Technologie GaN (Nitrure de Gallium) pour une compacité maximale et une efficacité de 95%. Compatible Power Delivery 3.0 et Quick Charge 4+.',
    specs: [
      { label: 'Puissance totale', value: '65W max' },
      { label: 'Ports', value: '2× USB-C PD + 2× USB-A QC' },
      { label: 'Technologie', value: 'GaN III — rendement 95%' },
      { label: 'Protocoles', value: 'PD 3.0, QC 4+, AFC, FCP, SCP' },
      { label: 'Dimensions', value: '65×65×32mm — 150g' },
      { label: 'Sécurité', value: 'Protection surcharge, court-circuit, surtension' },
      { label: 'Garantie', value: '24 mois' },
    ],
  },
  {
    id: 6, name: 'Caméra de Surveillance WiFi 4K', brand: 'SecureCam', category: 'hightech',
    price: 34990, oldPrice: 49990, rating: 4.7, reviews: 671, sold: 560, stock: 8,
    images: [`${U}1555618254-9c4b7bffd6f0${Q}`, `${U}1557597774-9d273605dfa9${Q}`, `${U}1596568400823-3a8a5e1e72e1${Q}`, `${U}1568992687947-868a62a9f521${Q}`],
    colors: ['#f0f0f0', '#1a1a1a'],
    description: 'Sécurisez votre domicile en 4K Ultra HD. Détection IA de personnes/véhicules, vision nocturne couleur jusqu\'à 30m, stockage local + cloud chiffré, et sirène intégrée 110dB. Compatible Alexa & Google Home.',
    specs: [
      { label: 'Résolution', value: '4K — 3840×2160px' },
      { label: 'Vision nocturne', value: 'Couleur 30m — Infrarouge 50m' },
      { label: 'Détection', value: 'IA humain/véhicule/animal' },
      { label: 'Stockage', value: 'MicroSD 256Go max + Cloud' },
      { label: 'Audio', value: 'Bidirectionnel + sirène 110dB' },
      { label: 'Connectivité', value: 'WiFi 6 double bande' },
      { label: 'Étanchéité', value: 'IP67' },
      { label: 'Garantie', value: '24 mois' },
    ],
  },
  {
    id: 7, name: 'Drone FPV 4K Stabilisateur', brand: 'FlyTech', category: 'hightech',
    price: 79990, oldPrice: 119990, rating: 4.6, reviews: 389, badge: 'sale', sold: 210,
    images: [`${U}1579829366248-204fe8413f31${Q}`, `${U}1532996122724-e3c354a0b15b${Q}`, `${U}1508444845599-5c89863b1c44${Q}`, `${U}1527977966376-1c8408f9f108${Q}`],
    colors: ['#1a1a2e', '#e53e3e'],
    description: 'Filmez depuis les cieux avec une stabilité professionnelle. Stabilisateur 3 axes EIS+OIS, autonomie 35min, portée 10km, retour automatique et évitement d\'obstacles tri-directionnel. Pliable, compact, prêt à décoller.',
    specs: [
      { label: 'Caméra', value: '4K 60fps — stabilisateur 3 axes' },
      { label: 'Autonomie', value: '35 minutes par batterie' },
      { label: 'Portée', value: '10km (transmission O3 Pro)' },
      { label: 'Vitesse max', value: '68 km/h' },
      { label: 'Évitement obstacles', value: 'Tri-directionnel APAS 5.0' },
      { label: 'Poids', value: '249g (sans formalités)' },
      { label: 'Résistance vent', value: 'Niveau 6 — 54 km/h' },
      { label: 'Garantie', value: '12 mois' },
    ],
  },
  {
    id: 8, name: 'Clavier Mécanique RGB TKL', brand: 'KeyPro', category: 'hightech',
    price: 39990, oldPrice: 59990, rating: 4.8, reviews: 1567, badge: 'hot', sold: 780,
    images: [`${U}1587829741301-dc798b83add3${Q}`, `${U}1541140532154-b024d705b90a${Q}`, `${U}1527814050087-3793815479db${Q}`, `${U}1618384887929-16ec33fab9ef${Q}`],
    colors: ['#1a1a2e', '#f0e6d3'],
    description: 'La précision mécanique au service de votre performance. Switches Gateron Yellow Pro linéaires ultra-silencieux, rétroéclairage RGB per-key 16,7M couleurs, structure en aluminium brossé et mousse de découplage intégrée.',
    specs: [
      { label: 'Switches', value: 'Gateron Yellow Pro — Linéaires silencieux' },
      { label: 'Rétroéclairage', value: 'RGB per-key — 16,7M couleurs' },
      { label: 'Format', value: 'TKL 87 touches — Hot-swap 5 pins' },
      { label: 'Structure', value: 'Aluminium brossé CNC + mousse' },
      { label: 'Connectivité', value: 'USB-C détachable + Bluetooth 5.0' },
      { label: 'Polling rate', value: '1000Hz filaire / 125Hz sans fil' },
      { label: 'Autonomie', value: '60h sans rétroéclairage' },
      { label: 'Garantie', value: '24 mois' },
    ],
  },

  /* ── Maison ── */
  {
    id: 9, name: 'Lampe Bureau LED Architecte', brand: 'LumiArt', category: 'maison',
    price: 22990, oldPrice: 34990, rating: 4.8, reviews: 391, badge: 'sale', sold: 267, stock: 8,
    images: [`${U}1507473885765-e6ed057f782c${Q}`, `${U}1513519245088-0e12902e35a6${Q}`, `${U}1555041469-a586c61ea9bc${Q}`, `${U}1493663284031-b7e3aefcae8e${Q}`],
    colors: ['#1a1a2e', '#c0c0c0', '#b87333'],
    description: 'Éclairez votre espace de travail avec style et précision. 5 températures de couleur (2700K–6500K), 10 niveaux de luminosité, bras articulé en aluminium, port USB-C 18W intégré et minuterie programmable. Certifiée anti-éblouissement.',
    specs: [
      { label: 'Puissance', value: '12W — équivalent 80W incandescent' },
      { label: 'Température couleur', value: '2700K à 6500K — 5 modes' },
      { label: 'Luminosité', value: '10 niveaux — 800 lumens max' },
      { label: 'Port de charge', value: 'USB-C 18W Quick Charge' },
      { label: 'Matière', value: 'Aluminium anodisé + ABS premium' },
      { label: 'Bras', value: 'Triple articulation 360°' },
      { label: 'Minuterie', value: '30/60 min programmable' },
      { label: 'Garantie', value: '24 mois' },
    ],
  },
  {
    id: 10, name: 'Bande LED RGB Ambiance 5M', brand: 'GlowHome', category: 'maison',
    price: 15990, oldPrice: 24990, rating: 4.6, reviews: 876, badge: 'new', sold: 534, isNew: true,
    images: [`${U}1558618666-fcd25c85cd64${Q}`, `${U}1618090584126-129cd1a15f97${Q}`, `${U}1565814329452-e1efa11c5b89${Q}`, `${U}1531306728370-e2ebd9d7bb99${Q}`],
    description: 'Transformez votre intérieur en 30 secondes. 5 mètres de LEDs RGB+IC adressables individuellement, app smartphone avec synchronisation musicale, 16M couleurs, coupe personnalisable tous les 3cm et adhésif 3M premium.',
    specs: [
      { label: 'Longueur', value: '5 mètres (extensible jusqu\'à 20m)' },
      { label: 'Type LED', value: 'SMD5050 RGB+IC adressables' },
      { label: 'Densité', value: '60 LEDs/mètre' },
      { label: 'Luminosité', value: '1200 lumens/mètre' },
      { label: 'Contrôle', value: 'App + télécommande 40 touches + voix' },
      { label: 'Synchronisation', value: 'Musique + scenes + scènes horaires' },
      { label: 'Coupe', value: 'Tous les 3cm — sans soudure' },
      { label: 'Garantie', value: '12 mois' },
    ],
  },
  {
    id: 11, name: "Humidificateur Ultrasonique 4L", brand: 'AirFresh', category: 'maison',
    price: 19990, oldPrice: 29990, rating: 4.7, reviews: 643, badge: 'top', sold: 412,
    images: [`${U}1585771724684-38269d6639fd${Q}`, `${U}1604580864964-0462f5d5b1a8${Q}`, `${U}1602928298849-325cec8771c0${Q}`, `${U}1563178406-4cdc2923acbc${Q}`],
    colors: ['#f8f8f8', '#1a1a2e'],
    description: 'Respirez mieux, dormez mieux. Réservoir 4L pour 36h d\'autonomie, ultra-silencieux (28dB), diffusion d\'huiles essentielles, veilleuse LED 7 couleurs et arrêt automatique. Parfait pour chambres, bureaux et salons jusqu\'à 40m².',
    specs: [
      { label: 'Capacité', value: '4 litres — 36h d\'autonomie' },
      { label: 'Bruit', value: '< 28 dB (ultra-silencieux)' },
      { label: 'Humidité', value: '40–80% réglable' },
      { label: 'Surface', value: 'Jusqu\'à 40m²' },
      { label: 'Diffuseur', value: 'Huiles essentielles intégré' },
      { label: 'Veilleuse', value: '7 couleurs LED dimmable' },
      { label: 'Arrêt auto', value: 'Réservoir vide + programmable' },
      { label: 'Garantie', value: '12 mois' },
    ],
  },
  {
    id: 12, name: 'Robot Aspirateur Laser 3000Pa', brand: 'CleanBot', category: 'maison',
    price: 89990, oldPrice: 139990, rating: 4.9, reviews: 1203, badge: 'hot', sold: 890,
    images: [`${U}1558618047-3c8c76ca7d13${Q}`, `${U}1563351672-62b74891a28a${Q}`, `${U}1581235720704-06d3acfcb36f${Q}`, `${U}1601597111158-2fceff292cdc${Q}`],
    colors: ['#1a1a2e', '#f0f0f0'],
    description: 'Le robot aspirateur le plus intelligent du marché. Navigation LiDAR 360° avec cartographie multi-niveaux, aspiration 3000Pa, lavage simultané avec pression réglable, vidage automatique de la base et recharge en 3h.',
    specs: [
      { label: 'Aspiration', value: '3000 Pa — 4 niveaux réglables' },
      { label: 'Navigation', value: 'LiDAR 360° — cartographie multi-étages' },
      { label: 'Lavage', value: 'Pression d\'eau 3 niveaux — serpillière vibrante' },
      { label: 'Autonomie', value: '180 min — recharge auto' },
      { label: 'Vidage auto', value: 'Base 3L — 45 jours sans intervention' },
      { label: 'Surface', value: 'Jusqu\'à 250m²' },
      { label: 'Franchise', value: 'Obstacle 2cm — tapis 4cm' },
      { label: 'Garantie', value: '24 mois' },
    ],
  },
  {
    id: 13, name: 'Diffuseur Arômes Bois Bambou', brand: 'ZenHome', category: 'maison',
    price: 9990, oldPrice: 14990, rating: 4.4, reviews: 328, sold: 198,
    images: [`${U}1602928298849-325cec8771c0${Q}`, `${U}1544947950-fa07a98d237f${Q}`, `${U}1612540139150-4b5ac99e3cfd${Q}`, `${U}1548484352-ea579e5233a8${Q}`],
    colors: ['#d4a373', '#f5f5f5'],
    description: 'Créez une atmosphère zen et apaisante avec ce diffuseur en bambou naturel. Ultrasonique à froid pour préserver les propriétés des huiles essentielles, minuterie 1/3/6h, 7 lumières LED douces et arrêt automatique.',
    specs: [
      { label: 'Matière', value: 'Bambou naturel + ABS BPA-free' },
      { label: 'Capacité', value: '300 ml' },
      { label: 'Autonomie', value: '6 à 8 heures' },
      { label: 'Technologie', value: 'Ultrasonique à froid' },
      { label: 'Minuterie', value: '1h / 3h / 6h / continu' },
      { label: 'Lumière', value: '7 couleurs LED + mode nuit' },
      { label: 'Surface', value: 'Jusqu\'à 20m²' },
      { label: 'Garantie', value: '12 mois' },
    ],
  },

  /* ── Beauté ── */
  {
    id: 14, name: 'Set 15 Pinceaux Maquillage Pro', brand: 'GlamPro', category: 'beaute',
    price: 12990, oldPrice: 19990, rating: 4.5, reviews: 452, sold: 328,
    images: [`${U}1512207736890-6ffed8a84e8d${Q}`, `${U}1522335789203-aabd1fc54bc9${Q}`, `${U}1596462502278-27bfdc403348${Q}`, `${U}1487700160041-babef9c3cb55${Q}`],
    description: 'La collection complète pour un maquillage professionnel. 15 pinceaux à poils synthétiques ultra-doux vegan, manches en bois de rose, pochette de rangement incluse. Pour le fond de teint, fard, contouring, yeux et lèvres.',
    specs: [
      { label: 'Nombre de pinceaux', value: '15 pièces — set complet' },
      { label: 'Poils', value: 'Synthétique vegan ultra-doux' },
      { label: 'Manches', value: 'Bois de rose naturel' },
      { label: 'Usage', value: 'Fond de teint, poudre, yeux, lèvres...' },
      { label: 'Pochette', value: 'Incluse — cuir vegan' },
      { label: 'Entretien', value: 'Lavables à l\'eau et au savon' },
      { label: 'Garantie', value: '6 mois' },
    ],
  },
  {
    id: 15, name: 'Épilateur Lumière Pulsée IPL', brand: 'SilkSkin', category: 'beaute',
    price: 49990, oldPrice: 89990, rating: 4.7, reviews: 789, badge: 'sale', sold: 445,
    images: [`${U}1631730486784-74757d38e27c${Q}`, `${U}1559181567-c3190878d5d4${Q}`, `${U}1570194065650-d99fb4abbd40${Q}`, `${U}1616394584738-fc6e612e71b9${Q}`],
    colors: ['#f8f8f8', '#c084fc'],
    description: 'Dites adieu aux poils indésirables définitivement, depuis chez vous. Technologie IPL professionnelle, 500 000 éclairs, 5 intensités, tête de précision incluse pour les zones sensibles. Résultats visibles dès la 2ème séance.',
    specs: [
      { label: 'Technologie', value: 'IPL (Intense Pulsed Light)' },
      { label: 'Éclairs', value: '500 000 — durée de vie illimitée' },
      { label: 'Intensités', value: '5 niveaux d\'énergie' },
      { label: 'Têtes', value: 'Corps + Précision zones sensibles' },
      { label: 'Temps traitement', value: 'Corps entier en 15 min' },
      { label: 'Résultats', value: 'Visibles dès la 2ème séance' },
      { label: 'Type de peau', value: 'Phototypes I à IV (capteur auto)' },
      { label: 'Garantie', value: '24 mois' },
    ],
  },
  {
    id: 16, name: 'Sérum Vitamine C Concentré', brand: 'GlowLab', category: 'beaute',
    price: 18990, oldPrice: 27990, rating: 4.8, reviews: 1123, badge: 'top', sold: 920, isNew: true,
    images: [`${U}1620916566398-39f1143ab7be${Q}`, `${U}1556228578-0d85b1a4d571${Q}`, `${U}1598440947619-2c35fc9aa908${Q}`, `${U}1611080626919-7cf5a9dbab12${Q}`],
    description: 'Le sérum vitamine C le plus concentré du marché. Formule 20% Vitamine C stable (dérivé L-ascorbyl glucoside), acide hyaluronique 3 poids moléculaires, niacinamide et extrait de thé vert. Anti-oxydant, éclat et anti-taches.',
    specs: [
      { label: 'Concentration', value: 'Vitamine C 20% — formule stable' },
      { label: 'Actifs', value: 'Acide hyaluronique, Niacinamide, Thé vert' },
      { label: 'Contenance', value: '30ml' },
      { label: 'Texture', value: 'Sérum léger — absorption rapide' },
      { label: 'Type de peau', value: 'Tous types — testé dermatologiquement' },
      { label: 'Usage', value: 'Matin + soir sur peau nettoyée' },
      { label: 'Conservation', value: '12 mois ouvert' },
    ],
  },
  {
    id: 17, name: 'Brosse Lissante Ionique 230°', brand: 'HairPro', category: 'beaute',
    price: 24990, oldPrice: 39990, rating: 4.6, reviews: 567, badge: 'new', sold: 312,
    images: [`${U}1522337360788-8b13dee7a37e${Q}`, `${U}1560869713-7d0a29430803${Q}`, `${U}1595475207225-428b62bda831${Q}`, `${U}1580618864181-2dd9913f39e7${Q}`],
    colors: ['#1a1a2e', '#c084fc', '#f8f8f8'],
    description: 'Lissez et stylisez vos cheveux en une seule passe. Technologie ionique anti-frisottis, 5 températures jusqu\'à 230°C, chauffe en 30 secondes, revêtement en céramique tourmaline et arrêt automatique 60 min.',
    specs: [
      { label: 'Température', value: '150°C à 230°C — 5 niveaux' },
      { label: 'Chauffe', value: '30 secondes' },
      { label: 'Technologie', value: 'Ionique + Céramique tourmaline' },
      { label: 'Tension', value: 'Universelle 100–240V' },
      { label: 'Arrêt auto', value: '60 minutes' },
      { label: 'Longueur', value: '29cm — câble pivotant 2.5m' },
      { label: 'Garantie', value: '24 mois' },
    ],
  },

  /* ── Sport ── */
  {
    id: 18, name: 'Pistolet de Massage Musculaire', brand: 'RecoverPro', category: 'sport',
    price: 34990, oldPrice: 59990, rating: 4.9, reviews: 1105, badge: 'sale', sold: 788, stock: 5,
    images: [`${U}1571019613454-1cb2f99b2d8b${Q}`, `${U}1552196563-55cd4e45efb3${Q}`, `${U}1518611012118-696072aa579a${Q}`, `${U}1574680178050-55c6a6a96e0a${Q}`],
    colors: ['#1a1a2e', '#e53e3e', '#f0f0f0'],
    description: 'Récupérez 3× plus vite après l\'effort. Moteur brushless silencieux (45dB), 6 têtes de massage interchangeables, 30 vitesses de 1800 à 3200 RPM, 6h d\'autonomie et étui de transport inclus. Le choix des sportifs professionnels.',
    specs: [
      { label: 'Vitesses', value: '30 niveaux — 1800 à 3200 RPM' },
      { label: 'Bruit', value: '< 45 dB (moteur brushless)' },
      { label: 'Autonomie', value: '6 heures en usage continu' },
      { label: 'Têtes', value: '6 embouts interchangeables' },
      { label: 'Amplitude', value: '12mm (percussion profonde)' },
      { label: 'Recharge', value: 'USB-C 2h' },
      { label: 'Étui', value: 'Inclus — rigide moulé' },
      { label: 'Garantie', value: '24 mois' },
    ],
  },
  {
    id: 19, name: 'Tapis de Yoga Antidérapant 6mm', brand: 'YogaFlow', category: 'sport',
    price: 18990, oldPrice: 27990, rating: 4.7, reviews: 724, badge: 'new', sold: 390, isNew: true,
    images: [`${U}1592432678016-e910b452f9a2${Q}`, `${U}1545205597-3d9d02c29597${Q}`, `${U}1506126613408-eca07ce68773${Q}`, `${U}1599901942544-6d8c62a5a7e2${Q}`],
    colors: ['#6b46c1', '#38a169', '#e53e3e', '#2b6cb0'],
    description: 'La stabilité ultime pour votre pratique. Caoutchouc naturel TPE double couche, texture microfibre anti-dérapante des deux côtés, absorption des chocs 6mm, sangle de transport et pochette de nettoyage incluses. Sans phtalates ni latex.',
    specs: [
      { label: 'Dimensions', value: '183 × 61cm — épaisseur 6mm' },
      { label: 'Matière', value: 'TPE double couche — sans latex' },
      { label: 'Surface', value: 'Microfibre anti-dérapante biface' },
      { label: 'Poids', value: '1.5 kg' },
      { label: 'Repères', value: 'Lignes d\'alignement imprimées' },
      { label: 'Accessoires', value: 'Sangle + pochette de nettoyage' },
      { label: 'Garantie', value: '12 mois' },
    ],
  },
  {
    id: 20, name: 'Corde à Sauter Digitale LCD', brand: 'JumpFit', category: 'sport',
    price: 9990, oldPrice: 15990, rating: 4.5, reviews: 432, badge: 'hot', sold: 1560,
    images: [`${U}1606889464198-fcb18894cf50${Q}`, `${U}1601422407692-ec4eeec1d9b3${Q}`, `${U}1594737626072-90dc274bc2bd${Q}`, `${U}1517963628622-9a24e1b39b2e${Q}`],
    colors: ['#1a1a2e', '#e53e3e'],
    description: 'Brulez des calories avec les données en temps réel. Écran LCD anti-reflets affichant compteur de sauts, calories, temps et fréquence cardiaque. Câble en acier renforcé réglable, poignées anti-dérapantes en caoutchouc.',
    specs: [
      { label: 'Écran', value: 'LCD — 4 métriques en temps réel' },
      { label: 'Métriques', value: 'Sauts, Calories, Temps, FC' },
      { label: 'Câble', value: 'Acier renforcé 3mm — réglable' },
      { label: 'Roulements', value: '360° sans accrocs' },
      { label: 'Poignées', value: 'Caoutchouc anti-dérapant ergonomique' },
      { label: 'Alimentation', value: '2× AAA incluses' },
      { label: 'Garantie', value: '6 mois' },
    ],
  },
  {
    id: 21, name: 'Vélo Stationnaire Pliable', brand: 'CyclePro', category: 'sport',
    price: 129990, oldPrice: 189990, rating: 4.8, reviews: 234, badge: 'sale', sold: 145, stock: 3,
    images: [`${U}1534438327276-14e5300c3a48${Q}`, `${U}1517836357463-d25dfeac3438${Q}`, `${U}1571902943202-507ec2618e8f${Q}`, `${U}1605296867424-35fc25c9212a${Q}`],
    colors: ['#1a1a2e', '#c0c0c0'],
    description: 'Entraînez-vous chez vous sans sacrifier l\'espace. Pliable en 10 secondes, silencieux à magnétique, 24 niveaux de résistance, écran LCD couleur, app connectée et selle réglable dans 5 directions. Capacité max 150kg.',
    specs: [
      { label: 'Résistance', value: 'Magnétique 24 niveaux — silencieux' },
      { label: 'Écran', value: 'LCD couleur 5" — 8 métriques' },
      { label: 'Pliable', value: 'En 10 secondes — 60×40cm replié' },
      { label: 'Selle', value: 'Gel — 5 axes de réglage' },
      { label: 'Guidon', value: 'Multi-positions — hauteur réglable' },
      { label: 'Charge max', value: '150 kg' },
      { label: 'Bluetooth', value: 'Compatible Zwift, Peloton, Kinomap' },
      { label: 'Garantie', value: '24 mois' },
    ],
  },

  /* ── Mode ── */
  {
    id: 22, name: 'Sac à Dos Imperméable 30L', brand: 'UrbanPack', category: 'mode',
    price: 27990, oldPrice: 39990, rating: 4.6, reviews: 876, badge: 'top', sold: 543,
    images: [`${U}1553062407-98eeb64c6a62${Q}`, `${U}1491637639811-60e2756cc1c7${Q}`, `${U}1622560480605-d83c853bc5c3${Q}`, `${U}1548036328-c9fa89d128fa${Q}`],
    colors: ['#1a1a2e', '#2f855a', '#9b2335'],
    description: 'Le sac à dos urbain ultime. Nylon 1680D imperméable, compartiment laptop 17", port USB-A de charge externe, dos ventilé ErgoAir et bretelles rembourrées. 12 poches organisées pour un rangement optimal.',
    specs: [
      { label: 'Capacité', value: '30 litres' },
      { label: 'Matière', value: 'Nylon 1680D imperméable IPX6' },
      { label: 'Compartiment laptop', value: '17" rembourré' },
      { label: 'Port USB', value: 'Externe USB-A + câble interne' },
      { label: 'Dos', value: 'ErgoAir — canaux de ventilation' },
      { label: 'Poches', value: '12 — dont zippée anti-RFID' },
      { label: 'Poids', value: '1.1 kg' },
      { label: 'Garantie', value: '24 mois' },
    ],
  },
  {
    id: 23, name: 'Montre Femme Acier Inoxydable', brand: 'TimeElegance', category: 'mode',
    price: 44990, oldPrice: 69990, rating: 4.8, reviews: 432, badge: 'new', sold: 280, isNew: true,
    images: [`${U}1523170335258-f5ed11844a49${Q}`, `${U}1434056886845-dac89ffe9b56${Q}`, `${U}1542496658-e33a6d0d3091${Q}`, `${U}1617137984095-74e4e5e3613f${Q}`],
    colors: ['#c0c0c0', '#b87333', '#1a1a2e'],
    description: 'L\'élégance intemporelle à votre poignet. Boîtier en acier inoxydable 316L poli, cadran nacré, mouvement japonais Miyota de précision, verre saphir anti-rayures et bracelet acier réglable. Étanche 5ATM.',
    specs: [
      { label: 'Boîtier', value: 'Acier 316L poli — 38mm' },
      { label: 'Cadran', value: 'Nacre — index en cristal' },
      { label: 'Mouvement', value: 'Japonais Miyota 2115 — quartz' },
      { label: 'Verre', value: 'Saphir anti-rayures' },
      { label: 'Bracelet', value: 'Acier maillé réglable sans outil' },
      { label: 'Étanchéité', value: '5ATM — 50 mètres' },
      { label: 'Garantie', value: '24 mois' },
    ],
  },

  /* ── Jeux ── */
  {
    id: 24, name: 'Manette Gaming Sans Fil Pro', brand: 'GameForce', category: 'jeux',
    price: 29990, oldPrice: 44990, rating: 4.7, reviews: 1876, badge: 'hot', sold: 2100,
    images: [`${U}1593118247619-e2d6f056869e${Q}`, `${U}1612287230202-1ff1d85d1bdf${Q}`, `${U}1542549182-67e1b2a54969${Q}`, `${U}1625805600119-eb8b3bac8e7f${Q}`],
    colors: ['#1a1a2e', '#e53e3e', '#f0f0f0'],
    description: 'La manette de jeu sans fil qui change tout. Compatibilité universelle PC/PS/Xbox/Android/iOS, gâchettes à effet Hall anti-dérive, 20h d\'autonomie, vibration haptic et turbine, switch pour les sticks réglable en 3 zones.',
    specs: [
      { label: 'Compatibilité', value: 'PC / PS4-5 / Xbox / Android / iOS' },
      { label: 'Connexion', value: 'Bluetooth 5.3 + USB-C filaire' },
      { label: 'Sticks', value: 'Effet Hall — zéro dérive garantie' },
      { label: 'Gâchettes', value: 'Effet Hall — course réglable 3 zones' },
      { label: 'Vibration', value: 'Haptic HD + moteur de turbine' },
      { label: 'Autonomie', value: '20h — recharge USB-C 2h' },
      { label: 'Polling rate', value: '1000Hz filaire / 125Hz BT' },
      { label: 'Garantie', value: '12 mois' },
    ],
  },
]

/* ─── Helpers ─── */
export const getProduct = (id: number): Product | undefined =>
  PRODUCTS.find(p => p.id === id)

export const getRelated = (product: Product, count = 4): Product[] =>
  PRODUCTS
    .filter(p => p.category === product.category && p.id !== product.id)
    .slice(0, count)
