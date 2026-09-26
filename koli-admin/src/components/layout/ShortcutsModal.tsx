import { Modal } from '../ui/Modal'
import { Kbd } from '../ui/Button'

const mod = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl'

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: [mod, 'K'], label: 'Ouvrir la palette de commandes' },
  { keys: ['?'],      label: 'Afficher les raccourcis' },
  { keys: ['G', 'D'], label: "Vue d'ensemble" },
  { keys: ['G', 'O'], label: 'Commandes' },
  { keys: ['G', 'P'], label: 'Produits' },
  { keys: ['G', 'U'], label: 'Utilisateurs' },
  { keys: ['G', 'R'], label: 'Retours' },
  { keys: ['G', 'M'], label: 'Marchands' },
  { keys: ['G', 'C'], label: 'Contact' },
  { keys: ['G', 'S'], label: 'Statistiques' },
  { keys: ['G', 'N'], label: 'Notifications' },
  { keys: ['Échap'],  label: 'Fermer une fenêtre' },
]

export function ShortcutsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Raccourcis clavier" width="max-w-md">
      <ul className="divide-y divide-line">
        {SHORTCUTS.map(s => (
          <li key={s.label} className="flex items-center justify-between py-2.5">
            <span className="text-body text-ink-2">{s.label}</span>
            <span className="flex items-center gap-1">
              {s.keys.map((k, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && s.keys[0] === 'G' && <span className="text-caption text-muted">puis</span>}
                  <Kbd>{k}</Kbd>
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </Modal>
  )
}
