import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Zap, Mail, BookOpen, Store, Plus, ExternalLink, CalendarDays } from 'lucide-react'
import { Card, CardHeader } from '../../components/ui/Card'
import { IconButton, Button } from '../../components/ui/Button'
import { Menu, KebabMenu } from '../../components/ui/Menu'
import { Skeleton, ErrorState, EmptyState } from '../../components/ui/States'
import { cn } from '../../lib/cn'
import { capitalize, formatDate } from '../../lib/format'
import { useAgenda, type AgendaEvent, type AgendaType } from './api'

const DAY = 24 * 3600 * 1000
const utcDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
const mondayOf = (d: Date) => { const x = utcDay(d); return new Date(x.getTime() - ((x.getUTCDay() + 6) % 7) * DAY) }
const sameDay = (a: Date, b: Date) => utcDay(a).getTime() === utcDay(b).getTime()
const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

const TYPE_STYLE: Record<AgendaType, { bg: string; icon: React.ReactNode; label: string }> = {
  deal:  { bg: 'bg-event-yellow',   icon: <Zap size={16} />,      label: 'Deal' },
  email: { bg: 'bg-event-lavender', icon: <Mail size={16} />,     label: 'E-mail planifié' },
  blog:  { bg: 'bg-event-green',    icon: <BookOpen size={16} />, label: 'Article de blog' },
  store: { bg: 'bg-event-blue',     icon: <Store size={16} />,    label: 'Boutique' },
}

function timeRange(e: AgendaEvent) {
  const start = new Date(e.start)
  if (!e.end) return formatDate(start, 'time')
  const end = new Date(e.end)
  return sameDay(start, end)
    ? `${formatDate(start, 'time')} – ${formatDate(end, 'time')}`
    : `${formatDate(start, 'time')} → ${formatDate(end, 'medium')}`
}

function EventBlock({ e }: { e: AgendaEvent }) {
  const navigate = useNavigate()
  const t = TYPE_STYLE[e.type]
  return (
    <div className={cn('flex items-center gap-3 rounded-cta px-3.5 py-3', t.bg)}>
      <button type="button" onClick={() => navigate(e.link)} className="flex-1 min-w-0 flex items-center gap-3 text-left">
        <span className="w-[30px] h-[30px] rounded-input bg-card text-ink flex items-center justify-center shrink-0" title={t.label}>{t.icon}</span>
        <span className="min-w-0">
          <span className="block text-secondary font-semibold text-ink truncate">{e.title}</span>
          <span className="block text-caption text-ink-2 tabular">{timeRange(e)}</span>
        </span>
      </button>
      <KebabMenu label={`Actions : ${e.title}`} items={[{ label: 'Ouvrir', icon: <ExternalLink size={15} />, onSelect: () => navigate(e.link) }]} />
    </div>
  )
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mt-4 mb-2 first:mt-0">
      <span className="text-micro text-muted whitespace-nowrap">{children}</span>
      <span className="flex-1 border-t border-dashed border-line" aria-hidden />
    </div>
  )
}

export function AgendaCard({ className }: { className?: string }) {
  const navigate = useNavigate()
  const today = useMemo(() => utcDay(new Date()), [])
  const [weekStart, setWeekStart] = useState(() => mondayOf(today))
  const [selected, setSelected] = useState(today)
  const weekEnd = new Date(weekStart.getTime() + 7 * DAY)
  const { data, isLoading, isError, refetch } = useAgenda(weekStart, weekEnd)

  const days = Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * DAY))
  const moveWeek = (n: number) => {
    const next = new Date(weekStart.getTime() + n * 7 * DAY)
    const containsToday = today.getTime() >= next.getTime() && today.getTime() < next.getTime() + 7 * DAY
    setWeekStart(next)
    setSelected(containsToday ? today : next)
  }

  // Jour sélectionné en premier (même vide), puis les autres jours de la
  // semaine qui ont des événements, dans l'ordre chronologique.
  const events = data?.events ?? []
  const itemsOf = (d: Date) => events.filter(e => sameDay(new Date(e.start), d))
  const groups = [
    { day: selected, items: itemsOf(selected) },
    ...days.filter(d => !sameDay(d, selected)).map(d => ({ day: d, items: itemsOf(d) })).filter(g => g.items.length > 0),
  ]

  const dayLabel = (d: Date) => sameDay(d, today) ? "Aujourd'hui" : capitalize(new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(d))
  const hasEvents = (d: Date) => events.some(e => sameDay(new Date(e.start), d))

  return (
    <Card padded className={cn('flex flex-col', className)}>
      <CardHeader title="Agenda" />
      <div className="flex items-center justify-between mt-5">
        <p className="text-body font-medium text-ink">{capitalize(formatDate(new Date(weekStart.getTime() + 3 * DAY), 'monthYear'))}</p>
        <div className="flex items-center gap-2">
          <IconButton size={28} label="Semaine précédente" icon={<ChevronLeft size={15} />} onClick={() => moveWeek(-1)} />
          <IconButton size={28} label="Semaine suivante" icon={<ChevronRight size={15} />} onClick={() => moveWeek(1)} />
        </div>
      </div>

      <div className="grid grid-cols-7 mt-4" role="radiogroup" aria-label="Jour">
        {days.map((d, i) => {
          const isSel = sameDay(d, selected)
          return (
            <button key={i} type="button" role="radio" aria-checked={isSel} onClick={() => setSelected(d)}
              aria-label={formatDate(d, 'long')} className="flex flex-col items-center gap-1.5 py-1 group">
              <span className="text-micro text-muted">{DAY_LABELS[i]}</span>
              <span className={cn('relative w-[30px] h-[30px] rounded-full flex items-center justify-center text-body font-medium tabular transition-colors',
                isSel ? 'bg-day-selected text-day-selected-ink' : 'text-ink group-hover:bg-hover-fill')}>
                {d.getUTCDate()}
                {hasEvents(d) && !isSel && <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-muted" aria-hidden />}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-4 flex-1 min-h-0 overflow-y-auto -mr-2 pr-2 max-h-[320px] xl:max-h-none">
        {isError ? <ErrorState onRetry={() => refetch()} className="py-4" />
          : isLoading ? <div className="space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></div>
          : groups.map(g => (
            <div key={g.day.toISOString()}>
              <GroupLabel>{dayLabel(g.day)}</GroupLabel>
              {g.items.length === 0
                ? <p className="text-caption text-muted py-2">Rien de prévu ce jour-là.</p>
                : <div className="space-y-2">{g.items.map(e => <EventBlock key={e.id} e={e} />)}</div>}
            </div>
          ))}
        {!isLoading && !isError && events.length === 0 && groups.length <= 1 && (
          <EmptyState icon={<CalendarDays size={20} />} title="Semaine calme" text="Aucun deal, e-mail, article ni ouverture de boutique cette semaine." className="py-6" />
        )}
      </div>

      <div className="pt-3 mt-2 border-t border-line">
        <Menu align="left" side="top" width={230} label="Planifier" items={[
          { label: 'Programmer un deal', icon: <Zap size={15} />, onSelect: () => navigate('/deals') },
          { label: 'Planifier un e-mail flash-deal', icon: <Mail size={15} />, onSelect: () => navigate('/deals') },
          { label: 'Écrire un article', icon: <BookOpen size={15} />, onSelect: () => navigate('/blog/new') },
        ]} trigger={({ open, toggle }) => (
          <Button variant="ghost" size="sm" icon={<Plus size={14} />} onClick={toggle} aria-haspopup="menu" aria-expanded={open}>Planifier</Button>
        )} />
      </div>
    </Card>
  )
}
