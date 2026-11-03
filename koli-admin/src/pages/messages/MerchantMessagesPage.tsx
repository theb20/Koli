import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { MessageCircle, Search } from 'lucide-react'
import { api, fmtDateTime } from '../../lib/api'
import { PageTitle } from '../../components/layout/Sidebar'

type Conversation = {
  storeId: number
  storeName: string
  storeLogo: string | null
  lastMessage: { body: string; senderRole: 'merchant' | 'admin'; createdAt: string } | null
  unreadCount: number
}

async function fetchConversations() {
  const { data } = await api.get('/api/admin/messages')
  return data.data.conversations as Conversation[]
}

export default function MerchantMessagesPage() {
  const navigate = useNavigate()
  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['merchant-messages'],
    queryFn: fetchConversations,
    refetchInterval: 30_000,
  })

  return (
    <div className="space-y-5">
      <PageTitle title="Messages" sub="Conversations privées avec vos marchands" />

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm divide-y divide-slate-100">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-4 py-4"><div className="h-10 bg-slate-100 rounded-lg animate-pulse" /></div>
          ))
        ) : conversations.length === 0 ? (
          <div className="py-16 text-center">
            <Search size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-slate-400 text-sm">Aucune conversation pour l'instant</p>
          </div>
        ) : (
          conversations.map(c => (
            <div key={c.storeId} onClick={() => navigate(`/messages/${c.storeId}`)}
              className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-slate-50 transition-colors ${c.unreadCount > 0 ? 'bg-indigo-50/40' : ''}`}>
              <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center text-slate-400">
                {c.storeLogo ? <img src={c.storeLogo} alt="" className="w-full h-full object-cover" /> : <MessageCircle size={16} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900 truncate">{c.storeName}</p>
                  {c.lastMessage && <span className="text-xs text-slate-400 shrink-0">{fmtDateTime(c.lastMessage.createdAt)}</span>}
                </div>
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  {c.lastMessage ? `${c.lastMessage.senderRole === 'admin' ? 'Vous : ' : ''}${c.lastMessage.body}` : '—'}
                </p>
              </div>
              {c.unreadCount > 0 && (
                <span className="shrink-0 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-indigo-600 text-white text-[11px] font-bold">
                  {c.unreadCount}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
