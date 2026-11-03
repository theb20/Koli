import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Send, Paperclip, Loader2, X } from 'lucide-react'
import { api, fmtDateTime } from '../../lib/api'

type Message = {
  id: string
  senderRole: 'merchant' | 'admin'
  body: string
  attachmentUrl: string | null
  createdAt: string
}

async function fetchThread(storeId: string) {
  const { data } = await api.get(`/api/admin/messages/${storeId}`)
  return data.data as { store: { id: number; name: string }; messages: Message[] }
}

export default function MerchantMessageDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [body, setBody] = useState('')
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['merchant-message-thread', id],
    queryFn: () => fetchThread(id!),
    enabled: !!id,
    refetchInterval: 15_000,
  })

  const sendMutation = useMutation({
    mutationFn: (input: { body: string; attachmentUrl?: string }) => api.post(`/api/admin/messages/${id}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['merchant-message-thread', id] })
      qc.invalidateQueries({ queryKey: ['merchant-messages'] })
      setBody('')
      setAttachmentUrl(null)
    },
  })

  const messages = data?.messages ?? []

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  const handleFile = async (file: File) => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const { data } = await api.post('/api/admin/messages/upload-image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setAttachmentUrl(data.data.url)
    } finally {
      setUploading(false)
    }
  }

  const handleSend = () => {
    if (!body.trim() && !attachmentUrl) return
    sendMutation.mutate({ body: body.trim() || '📎 Pièce jointe', attachmentUrl: attachmentUrl ?? undefined })
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/messages')}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all shrink-0">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-bold text-slate-900">{isLoading ? '…' : data?.store.name}</h1>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col h-[calc(100vh-220px)] min-h-[420px]">
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {isLoading ? (
            <p className="text-sm text-slate-400">Chargement…</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">Aucun message pour l'instant.</p>
          ) : (
            messages.map(m => (
              <div key={m.id} className={`flex ${m.senderRole === 'admin' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                  m.senderRole === 'admin' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-900'
                }`}>
                  {m.attachmentUrl && (
                    <a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer">
                      <img src={m.attachmentUrl} alt="" className="rounded-lg mb-1.5 max-h-48 object-cover" />
                    </a>
                  )}
                  <p className="text-sm whitespace-pre-line">{m.body}</p>
                  <p className={`text-[10px] mt-1 ${m.senderRole === 'admin' ? 'text-white/70' : 'text-slate-400'}`}>
                    {fmtDateTime(m.createdAt)}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-slate-100 p-3">
          {attachmentUrl && (
            <div className="flex items-center gap-2 mb-2 pl-1">
              <img src={attachmentUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
              <button onClick={() => setAttachmentUrl(null)} className="p-1 text-slate-500 hover:text-red-500">
                <X size={14} />
              </button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:border-indigo-400 transition-colors disabled:opacity-40 shrink-0"
              aria-label="Joindre une image"
            >
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
            </button>
            <input
              ref={fileInputRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              rows={1}
              placeholder="Répondre…"
              className="flex-1 resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={sendMutation.isPending || (!body.trim() && !attachmentUrl)}
              className="p-2.5 rounded-xl bg-indigo-600 text-white disabled:opacity-40 transition-opacity shrink-0"
              aria-label="Envoyer"
            >
              {sendMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
