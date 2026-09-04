import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck } from '../ui/Icon'
import { useNotificationsStore } from '../../store/notificationsStore'
import { useAuthStore } from '../../store/authStore'

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const notifications = useNotificationsStore((s) => s.notifications)
  const unreadCount = useNotificationsStore((s) => s.unreadCount)
  const markRead = useNotificationsStore((s) => s.markRead)
  const markAllRead = useNotificationsStore((s) => s.markAllRead)
  const setActiveCompany = useAuthStore((s) => s.setActiveCompany)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function go(n: (typeof notifications)[number]) {
    markRead(n.id)
    if (n.companyId) setActiveCompany(n.companyId)
    if (n.link) navigate(n.link)
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} className="relative p-2 text-muted hover:bg-gray-100 hover:text-ink">
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center bg-danger px-1 text-[9px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-1.5 w-80 max-h-96 overflow-y-auto border border-border bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
            <p className="text-xs font-bold text-ink">Notifications</p>
            {unreadCount > 0 && (
              <button onClick={() => markAllRead()} className="flex items-center gap-1 text-[11px] font-semibold text-brand">
                <CheckCheck size={12} /> Tout marquer lu
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-muted">Aucune notification pour le moment.</p>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => go(n)}
                className={`block w-full border-b border-border px-3 py-2.5 text-left text-xs last:border-0 hover:bg-gray-50 ${!n.isRead ? 'bg-brand-light/40' : ''}`}
              >
                <p className={`text-ink ${!n.isRead ? 'font-semibold' : ''}`}>{n.message}</p>
                <p className="mt-0.5 text-[10px] text-muted">{new Date(n.createdAt).toLocaleString('fr-FR')}</p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
