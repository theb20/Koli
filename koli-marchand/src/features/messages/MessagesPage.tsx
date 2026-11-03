import { useEffect, useRef, useState } from 'react'
import { Send, Paperclip, Loader2, X } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { fmtDateTime } from '@/lib/format'
import { useMessages, useSendMessage, uploadMessageImage } from './api/useMessages'

export default function MessagesPage() {
  const { data, isLoading } = useMessages()
  const sendMessage = useSendMessage()
  const [body, setBody] = useState('')
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const messages = data?.messages ?? []

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  const handleFile = async (file: File) => {
    setUploading(true)
    try {
      const url = await uploadMessageImage(file)
      setAttachmentUrl(url)
    } finally {
      setUploading(false)
    }
  }

  const handleSend = () => {
    if (!body.trim() && !attachmentUrl) return
    sendMessage.mutate(
      { body: body.trim() || '📎 Pièce jointe', attachmentUrl: attachmentUrl ?? undefined },
      { onSuccess: () => { setBody(''); setAttachmentUrl(null) } },
    )
  }

  return (
    <div>
      <PageHeader title="Messages" subtitle="Échangez directement avec l'équipe Skignas" />

      <Card className="flex flex-col h-[calc(100vh-220px)] min-h-[420px]">
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {isLoading ? (
            <p className="text-sm text-[#6b6b68]">Chargement…</p>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-2 text-[#a3a3a1]">
              <p className="text-sm">Aucun message pour l'instant.</p>
              <p className="text-xs">Écrivez à l'équipe Skignas pour toute question sur votre boutique.</p>
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex ${m.senderRole === 'merchant' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                  m.senderRole === 'merchant' ? 'bg-[#1E90FF] text-white' : 'bg-[#f0f0ed] text-[#0a0a0b]'
                }`}>
                  {m.attachmentUrl && (
                    <a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer">
                      <img src={m.attachmentUrl} alt="" className="rounded-lg mb-1.5 max-h-48 object-cover" />
                    </a>
                  )}
                  <p className="text-sm whitespace-pre-line">{m.body}</p>
                  <p className={`text-[10px] mt-1 ${m.senderRole === 'merchant' ? 'text-white/70' : 'text-[#a3a3a1]'}`}>
                    {fmtDateTime(m.createdAt)}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-[#e8e8e4] p-3">
          {attachmentUrl && (
            <div className="flex items-center gap-2 mb-2 pl-1">
              <img src={attachmentUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
              <button onClick={() => setAttachmentUrl(null)} className="p-1 text-[#6b6b68] hover:text-red-500">
                <X size={14} />
              </button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="p-2.5 rounded-xl border border-[#e8e8e4] text-[#6b6b68] hover:border-[#1E90FF] transition-colors disabled:opacity-40 shrink-0"
              aria-label="Joindre une image"
            >
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
            </button>
            <input
              ref={fileInputRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              rows={1}
              placeholder="Écrivez un message…"
              className="flex-1 resize-none rounded-xl border border-[#e8e8e4] px-3.5 py-2.5 text-sm focus:border-[#1E90FF] focus:ring-2 focus:ring-[#1E90FF]/20 transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={sendMessage.isPending || (!body.trim() && !attachmentUrl)}
              className="p-2.5 rounded-xl bg-[#0a0a0b] text-white disabled:opacity-40 transition-opacity shrink-0"
              aria-label="Envoyer"
            >
              {sendMessage.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      </Card>
    </div>
  )
}
