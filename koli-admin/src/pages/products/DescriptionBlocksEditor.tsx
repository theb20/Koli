import { useRef, useState } from 'react'
import { useFieldArray, useWatch, type Control, type UseFormRegister, type UseFormSetValue, type FieldErrors } from 'react-hook-form'
import { ArrowDown, ArrowUp, ImageIcon, Link2, Loader2, Trash2, Type, Upload, Video } from 'lucide-react'
import { api } from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { Textarea } from '../../components/ui/Input'

export type DescriptionBlockValue =
  | { type: 'text'; text: string }
  | { type: 'image'; url: string; alt?: string }
  | { type: 'video'; url: string; provider: 'upload' | 'youtube' | 'vimeo'; poster?: string }

/*
 * Formulaire hôte réduit à ce seul champ — ProductFormPage porte beaucoup
 * plus de champs, mais `control`/`register`/`setValue` sont les mêmes
 * fonctions quel que soit le type générique utilisé pour les typer ; le
 * cast se fait une seule fois, au point d'appel dans ProductFormPage.tsx,
 * plutôt que d'essayer de généraliser ce composant sur un type de formulaire
 * arbitraire (RHF ne s'y prête pas proprement avec une union discriminée).
 */
export type FormWithBlocks = { descriptionBlocks: DescriptionBlockValue[] }

async function uploadDescriptionMedia(file: File): Promise<{ url: string; type: 'image' | 'video' }> {
  const fd = new FormData()
  fd.append('file', file)
  const { data } = await api.post('/api/products/description-media', fd)
  return data.data
}

function UploadButton({ accept, uploading, onFile, label }: {
  accept: string
  uploading: boolean
  onFile: (file: File) => void
  label: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        disabled={uploading}
        className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-200 hover:bg-indigo-50 transition-colors disabled:opacity-50"
      >
        {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
        {uploading ? 'Envoi…' : label}
      </button>
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) onFile(file)
          e.target.value = ''
        }}
      />
    </>
  )
}

export function DescriptionBlocksEditor({ control, register, setValue, errors }: {
  control: Control<FormWithBlocks>
  register: UseFormRegister<FormWithBlocks>
  setValue: UseFormSetValue<FormWithBlocks>
  errors: FieldErrors<FormWithBlocks>
}) {
  const { fields, append, remove, move } = useFieldArray({ control, name: 'descriptionBlocks' })
  /*
   * `fields` (useFieldArray) ne reflète que la STRUCTURE du tableau (ajout/
   * suppression/réordre) — ses entrées gardent les valeurs figées au moment
   * de l'ajout et ne se mettent pas à jour quand on appelle `setValue` sur
   * un champ individuel (ex: changer `provider` ou remplir `url` après un
   * upload). Sans `useWatch` ici, les radios vidéo et les aperçus après
   * upload restent visuellement bloqués sur leur valeur initiale même si le
   * formulaire est bien à jour en interne.
   */
  const watchedBlocks = useWatch({ control, name: 'descriptionBlocks' })
  const [uploadingAt, setUploadingAt] = useState<number | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const handleUpload = async (index: number, file: File) => {
    setUploadError(null)
    setUploadingAt(index)
    try {
      const { url } = await uploadDescriptionMedia(file)
      setValue(`descriptionBlocks.${index}.url`, url, { shouldDirty: true })
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Échec du téléversement'
      setUploadError(message)
    } finally {
      setUploadingAt(null)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button type="button" variant="secondary" size="xs" icon={<Type size={12} />}
          onClick={() => append({ type: 'text', text: '' })}>
          Paragraphe
        </Button>
        <Button type="button" variant="secondary" size="xs" icon={<ImageIcon size={12} />}
          onClick={() => append({ type: 'image', url: '', alt: '' })}>
          Photo
        </Button>
        <Button type="button" variant="secondary" size="xs" icon={<Video size={12} />}
          onClick={() => append({ type: 'video', url: '', provider: 'upload' })}>
          Vidéo
        </Button>
      </div>

      {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}
      {fields.length === 0 && (
        <p className="text-xs text-slate-400">
          Aucun bloc — la description texte ci-dessus s'affiche seule sur la fiche produit.
        </p>
      )}

      {fields.map((field, i) => {
        const block = (watchedBlocks?.[i] ?? field) as unknown as DescriptionBlockValue
        return (
          <div key={field.id} className="border border-slate-200 rounded-xl p-3 space-y-2 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                {block.type === 'text' && <><Type size={11} /> Paragraphe</>}
                {block.type === 'image' && <><ImageIcon size={11} /> Photo</>}
                {block.type === 'video' && <><Video size={11} /> Vidéo</>}
              </span>
              <div className="flex items-center gap-1">
                <button type="button" disabled={i === 0} onClick={() => move(i, i - 1)}
                  className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 transition-colors">
                  <ArrowUp size={13} />
                </button>
                <button type="button" disabled={i === fields.length - 1} onClick={() => move(i, i + 1)}
                  className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 transition-colors">
                  <ArrowDown size={13} />
                </button>
                <button type="button" onClick={() => remove(i)} className="p-1 text-red-400 hover:text-red-600 transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            {block.type === 'text' && (
              <Textarea rows={3} placeholder="Texte du paragraphe…"
                {...register(`descriptionBlocks.${i}.text` as const)}
                error={(errors.descriptionBlocks?.[i] as { text?: { message?: string } } | undefined)?.text?.message}
              />
            )}

            {block.type === 'image' && (
              <div className="space-y-2">
                <div className="flex gap-2 items-start">
                  <div className="w-14 h-14 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                    {block.url && <img src={block.url} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Link2 size={12} className="text-slate-400 shrink-0" />
                      <input
                        className="flex-1 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:outline-none"
                        placeholder="https://... (lien externe, sera ré-hébergé)"
                        {...register(`descriptionBlocks.${i}.url` as const)}
                      />
                    </div>
                    <UploadButton accept="image/jpeg,image/png,image/webp" uploading={uploadingAt === i}
                      onFile={file => handleUpload(i, file)} label="Téléverser une photo" />
                  </div>
                </div>
                <input
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:outline-none"
                  placeholder="Texte alternatif (accessibilité, optionnel)"
                  {...register(`descriptionBlocks.${i}.alt` as const)}
                />
              </div>
            )}

            {block.type === 'video' && (
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  {(['upload', 'youtube', 'vimeo'] as const).map(p => (
                    <label key={p} className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                      <input type="radio" className="accent-indigo-600"
                        checked={block.provider === p}
                        onChange={() => setValue(`descriptionBlocks.${i}.provider` as const, p, { shouldDirty: true })}
                      />
                      {p === 'upload' ? 'Téléverser' : p === 'youtube' ? 'Lien YouTube' : 'Lien Vimeo'}
                    </label>
                  ))}
                </div>

                {block.provider === 'upload' ? (
                  <div className="space-y-1.5">
                    {block.url && <video src={block.url} controls className="w-full max-w-xs rounded-lg bg-black" />}
                    <UploadButton accept="video/mp4,video/webm" uploading={uploadingAt === i}
                      onFile={file => handleUpload(i, file)} label="Téléverser une vidéo" />
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Link2 size={12} className="text-slate-400 shrink-0" />
                    <input
                      className="flex-1 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:outline-none"
                      placeholder={block.provider === 'youtube' ? 'https://www.youtube.com/watch?v=...' : 'https://vimeo.com/...'}
                      {...register(`descriptionBlocks.${i}.url` as const)}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
