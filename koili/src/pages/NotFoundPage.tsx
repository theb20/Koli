import { useNavigate } from 'react-router-dom'
import { PageMeta } from '../components/seo/PageMeta'

type Card = { text: string; to: string }

const ROWS: Card[][] = [
  [
    { text: '🎧 Casques Bluetooth en promo', to: '/catalogue?categorie=audio' },
    { text: '📱 Smartphones reconditionnés', to: '/catalogue?categorie=smartphones' },
    { text: '💻 Ordinateurs portables dès 150 000 FCFA', to: '/catalogue?categorie=laptops' },
    { text: '🎮 Consoles & accessoires gaming', to: '/catalogue?categorie=gaming' },
    { text: '⌚ Montres connectées', to: '/catalogue?categorie=watches' },
    { text: '📷 Appareils photo & caméras', to: '/catalogue?categorie=cameras' },
  ],
  [
    { text: '🚚 Payer par Orange Money, MTN ou Wave', to: '/catalogue' },
    { text: '🎁 Créer une liste de cadeaux', to: '/profil' },
    { text: '🔄 Retourner un article sous 14 jours', to: '/commandes' },
    { text: '📦 Suivre ma commande en direct', to: '/commandes' },
    { text: '🛍️ Voir les ventes flash du jour', to: '/catalogue' },
    { text: '❤️ Ma liste de souhaits', to: '/profil' },
  ],
  [
    { text: '🔍 Comparer plusieurs produits', to: '/comparer' },
    { text: '🧾 Télécharger une facture', to: '/commandes' },
    { text: '🎯 Demander un produit introuvable', to: '/demande' },
    { text: '💬 Contacter le service client', to: '/contact' },
    { text: '📖 Lire le blog Skignas', to: '/blog' },
    { text: '🏬 Découvrir la boutique', to: '/catalogue' },
  ],
]

function ArrowIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="7" y1="17" x2="17" y2="7" />
      <polyline points="7 7 17 7 17 17" />
    </svg>
  )
}

function MarqueeRow({ cards, direction, duration }: { cards: Card[]; direction: 'left' | 'right'; duration: number }) {
  const navigate = useNavigate()
  const doubled = [...cards, ...cards]
  return (
    <div className="nf-marquee">
      <div className={`nf-track nf-track--${direction}`} style={{ '--nf-dur': `${duration}s` } as React.CSSProperties}>
        {doubled.map((card, i) => (
          <button key={i} className="nf-card" onClick={() => navigate(card.to)}>
            <span>{card.text}</span>
            <ArrowIcon />
          </button>
        ))}
      </div>
    </div>
  )
}

export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <>
      <PageMeta
        title="Page non trouvée"
        description="Cette page n'existe pas ou plus sur Skignas."
        path="/404"
        noIndex
      />

      <div className="nf-shell">
        <div className="nf-rows nf-rows--top">
          <MarqueeRow cards={ROWS[0]} direction="left" duration={60} />
          <MarqueeRow cards={ROWS[1]} direction="right" duration={70} />
        </div>

        <div className="nf-center">
          <div className="nf-code">404</div>
          <div className="nf-label">Page non trouvée</div>
          <p className="nf-sub">Ce lien n'existe pas ou plus — mais le reste de la boutique vous attend.</p>
          <div className="nf-actions">
            <button className="nf-btn nf-btn--primary" onClick={() => navigate('/')}>Retour à l'accueil</button>
            <button className="nf-btn nf-btn--ghost" onClick={() => navigate('/catalogue')}>Voir le catalogue</button>
          </div>
        </div>

        <div className="nf-rows nf-rows--bottom">
          <MarqueeRow cards={ROWS[2]} direction="left" duration={65} />
        </div>
      </div>

      <style>{`
        .nf-shell {
          min-height: 100vh;
          background: #ffffff;
          color: #0d0d0d;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow: hidden;
        }
        .nf-rows { display: flex; flex-direction: column; gap: 16px; }
        .nf-rows--top { padding-top: 28px; }
        .nf-rows--bottom { padding-bottom: 28px; }

        .nf-marquee { overflow: hidden; width: 100%; }
        .nf-track { display: flex; gap: 16px; width: max-content; }
        .nf-track--left  { animation: nf-marquee-left  var(--nf-dur, 60s) linear infinite; }
        .nf-track--right { animation: nf-marquee-right var(--nf-dur, 60s) linear infinite; }
        .nf-marquee:hover .nf-track { animation-play-state: paused; }

        @keyframes nf-marquee-left  { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes nf-marquee-right { from { transform: translateX(-50%); } to { transform: translateX(0); } }

        .nf-card {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 8px;
          min-width: 280px;
          max-width: 320px;
          padding: 16px 20px;
          border-radius: 16px;
          background: #f4f4f4;
          border: none;
          font-family: inherit;
          font-size: 14.5px;
          line-height: 1.35;
          text-align: left;
          color: #0d0d0d;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .nf-card:hover { background: #ececec; }
        .nf-card:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
        .nf-card svg { flex-shrink: 0; margin-top: 2px; opacity: 0.55; }

        .nf-center {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 48px 20px;
        }
        .nf-code {
          font-size: clamp(96px, 18vw, 200px);
          font-weight: 700;
          color: #d4d4d4;
          line-height: 1;
          letter-spacing: -0.04em;
        }
        .nf-label { font-size: clamp(22px, 3.6vw, 32px); font-weight: 600; margin-top: 12px; color: #0d0d0d; }
        .nf-sub { font-size: 15px; color: #6b6b6b; margin-top: 10px; max-width: 40ch; }
        .nf-actions { display: flex; gap: 12px; margin-top: 32px; flex-wrap: wrap; justify-content: center; }
        .nf-btn {
          padding: 13px 26px;
          border-radius: 999px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.15s ease, background 0.15s ease;
        }
        .nf-btn--primary { border: none; background: #0d0d0d; color: #fff; }
        .nf-btn--primary:hover { opacity: 0.85; }
        .nf-btn--ghost { border: 1px solid #d4d4d4; background: transparent; color: #0d0d0d; }
        .nf-btn--ghost:hover { background: #f4f4f4; }

        @media (prefers-reduced-motion: reduce) {
          .nf-track--left, .nf-track--right { animation: none; }
        }
      `}</style>
    </>
  )
}
