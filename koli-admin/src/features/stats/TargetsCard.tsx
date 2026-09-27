import { useState } from 'react'
import { Target, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { CardSkeleton, EmptyState, ErrorState } from '../../components/ui/States'
import { cn } from '../../lib/cn'
import { capitalize, formatDate, formatFCFA, formatNumber } from '../../lib/format'
import { useSaveTargets, useTargets, type TargetKey, type TargetsResponse } from './api'

const TARGETS: { key: TargetKey; label: string; money: boolean; cumulative: boolean }[] = [
  { key: 'revenue',      label: "Chiffre d'affaires", money: true,  cumulative: true },
  { key: 'orders',       label: 'Commandes',          money: false, cumulative: true },
  { key: 'newCustomers', label: 'Nouveaux clients',   money: false, cumulative: true },
  { key: 'avgBasket',    label: 'Panier moyen',       money: true,  cumulative: false },
]
const fmt = (money: boolean, v: number) => (money ? formatFCFA(v) : formatNumber(v))

function EditTargets({ open, onClose, data }: { open: boolean; onClose: () => void; data: TargetsResponse }) {
  const save = useSaveTargets()
  const [values, setValues] = useState<Record<TargetKey, string>>(() =>
    Object.fromEntries(TARGETS.map(t => [t.key, data.targets[t.key] ? String(data.targets[t.key]) : ''])) as Record<TargetKey, string>)
  const invalid = TARGETS.some(t => values[t.key] !== '' && !/^\d+$/.test(values[t.key].replace(/\s/g, '')))

  const submit = async () => {
    const body = Object.fromEntries(TARGETS.map(t => {
      const raw = values[t.key].replace(/\s/g, '')
      return [t.key, raw ? Number(raw) : null]
    }))
    try {
      await save.mutateAsync(body)
      toast.success('Objectifs enregistrés')
      onClose()
    } catch {
      toast.error("Les objectifs n'ont pas pu être enregistrés")
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Objectifs mensuels" width="max-w-md">
      <p className="text-secondary text-ink-2 mb-4">Objectifs appliqués à chaque mois. Laissez vide pour ne pas suivre un indicateur.</p>
      <div className="space-y-3">
        {TARGETS.map(t => (
          <Input key={t.key} label={`${t.label}${t.money ? ' (FCFA)' : ''}`} inputMode="numeric" placeholder="Aucun objectif"
            value={values[t.key]} onChange={e => setValues(v => ({ ...v, [t.key]: e.target.value }))} />
        ))}
      </div>
      {invalid && <p className="text-caption text-down mt-3">Saisissez des nombres entiers positifs.</p>}
      <div className="flex justify-end gap-2 mt-6">
        <Button variant="secondary" size="sm" onClick={onClose}>Annuler</Button>
        <Button size="sm" onClick={submit} loading={save.isPending} disabled={invalid}>Enregistrer</Button>
      </div>
    </Modal>
  )
}

/** Suivi des objectifs du mois en cours : réalisé, % atteint, projection fin de mois. */
export function TargetsCard({ className }: { className?: string }) {
  const { data, isLoading, isError, refetch } = useTargets()
  const [editing, setEditing] = useState(false)

  if (isLoading) return <CardSkeleton lines={4} className={className} />
  if (isError || !data) return <Card padded className={className}><ErrorState onRetry={() => refetch()} /></Card>

  const tracked = TARGETS.filter(t => data.targets[t.key])
  const monthLabel = capitalize(formatDate(`${data.month}-01T00:00:00Z`, 'monthYear'))

  return (
    <Card padded className={className}>
      <CardHeader title="Objectifs du mois" subtitle={`${monthLabel} · jour ${data.elapsedDays} sur ${data.daysInMonth}`}
        actions={<Button variant="subtle" size="xs" icon={<Pencil size={12} />} onClick={() => setEditing(true)}>{tracked.length ? 'Modifier' : 'Définir'}</Button>} />
      {tracked.length === 0 ? (
        <EmptyState icon={<Target size={22} />} title="Aucun objectif défini"
          text="Fixez un objectif mensuel de CA, de commandes ou de nouveaux clients pour suivre votre progression."
          action={<Button size="sm" onClick={() => setEditing(true)}>Définir des objectifs</Button>} className="py-8" />
      ) : (
        <ul className="mt-5 space-y-5">
          {tracked.map(t => {
            const target = data.targets[t.key]!
            const actual = data.actual[t.key] ?? 0
            const pct = Math.min(100, (actual / target) * 100)
            // Projection linéaire au rythme actuel (indicateurs cumulatifs uniquement)
            const projected = t.cumulative ? Math.round((actual / data.elapsedDays) * data.daysInMonth) : actual
            const onTrack = projected >= target
            return (
              <li key={t.key}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-secondary text-ink-2">{t.label}</span>
                  <span className="text-secondary font-medium text-ink tabular">{Math.round((actual / target) * 100)} %</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-muted-fill overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label={`${t.label} : ${Math.round(pct)} % de l'objectif`}>
                  <div className={cn('h-full rounded-full transition-[width] duration-500', onTrack ? 'bg-primary' : 'bg-coral')} style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-1.5 text-caption text-muted tabular">
                  <span className="text-ink-2">{fmt(t.money, actual)}</span> sur {fmt(t.money, target)}
                </p>
                {t.cumulative && (
                  <p className="text-caption text-muted tabular">
                    Projection fin de mois : <span className={onTrack ? 'text-up font-medium' : 'text-down font-medium'}>{fmt(t.money, projected)}</span>
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {editing && <EditTargets open onClose={() => setEditing(false)} data={data} />}
    </Card>
  )
}
