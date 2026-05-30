import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Save, Eye } from 'lucide-react'
import { api } from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { Input, Textarea, Select } from '../../components/ui/Input'

const schema = z.object({
  slug:        z.string().min(3).regex(/^[a-z0-9-]+$/, 'Slug: minuscules, chiffres, tirets uniquement'),
  title:       z.string().min(5),
  excerpt:     z.string().min(10).max(500),
  body:        z.string().min(50),
  coverImage:  z.string().url('URL invalide'),
  category:    z.enum(['tech', 'style', 'lifestyle', 'guide', 'news']),
  tags:        z.string(),
  author:      z.string().min(2),
  authorImage: z.string().url().optional().or(z.literal('')),
  readTime:    z.coerce.number().int().positive(),
  isPublished: z.boolean(),
})

type FormData = z.infer<typeof schema>

export default function BlogFormPage() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const qc        = useQueryClient()
  const isEdit    = !!id
  const [preview, setPreview] = useState(false)

  const { data: post } = useQuery({
    queryKey: ['blog-post', id],
    queryFn: async () => {
      const { data } = await api.get(`/api/blog/admin/${id}`)
      return data.data.post
    },
    enabled: isEdit,
  })

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as import('react-hook-form').Resolver<FormData>,
    defaultValues: { readTime: 5, isPublished: false, category: 'news' },
  })

  useEffect(() => {
    if (post) {
      const tags = (() => { try { return JSON.parse(post.tags).join(', ') } catch { return post.tags } })()
      reset({ ...post, tags, authorImage: post.authorImage ?? '' })
    }
  }, [post, reset])

  const title = watch('title')
  useEffect(() => {
    if (!isEdit && title) {
      const slug = title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-')
      setValue('slug', slug)
    }
  }, [title, isEdit, setValue])

  const mutation = useMutation({
    mutationFn: (body: object) => isEdit
      ? api.put(`/api/blog/${id}`, body)
      : api.post('/api/blog', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['blog-admin'] }); navigate('/blog') },
  })

  const onSubmit = (data: FormData) => {
    mutation.mutate({
      ...data,
      tags: data.tags.split(',').map(t => t.trim()).filter(Boolean),
      authorImage: data.authorImage || undefined,
    })
  }

  const bodyContent = watch('body') ?? ''
  const cardCls = "bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4"

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/blog')} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{isEdit ? 'Modifier l\'article' : 'Nouvel article'}</h1>
            <p className="text-sm text-slate-500">Éditeur de contenu</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={<Eye size={14} />} onClick={() => setPreview(v => !v)}>
            {preview ? 'Éditer' : 'Prévisualiser'}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {mutation.isError && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
            Erreur lors de l'enregistrement. Vérifiez les champs.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-4">
            <div className={cardCls}>
              <Input label="Titre" {...register('title')} error={errors.title?.message} placeholder="Titre de l'article" />
              <Input label="Slug (URL)" {...register('slug')} error={errors.slug?.message} placeholder="mon-article-slug" />
              <Textarea label="Extrait" {...register('excerpt')} error={errors.excerpt?.message} rows={3} placeholder="Résumé de l'article (affiché sur la liste)..." />
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Contenu (Markdown supporté)</label>
                <span className="text-xs text-slate-400">{bodyContent.length} caractères</span>
              </div>
              {preview ? (
                <div className="min-h-[400px] p-4 bg-slate-50 rounded-xl text-sm text-slate-700 whitespace-pre-wrap border border-slate-100">
                  {bodyContent || <span className="text-slate-400">Contenu vide...</span>}
                </div>
              ) : (
                <textarea
                  {...register('body')}
                  rows={18}
                  placeholder="Écrivez votre article ici... (Markdown supporté)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none resize-none font-mono transition-all"
                />
              )}
              {errors.body && <p className="text-xs text-red-500 mt-1">{errors.body.message}</p>}
            </div>
          </div>

          {/* Sidebar settings */}
          <div className="space-y-4">
            <div className={cardCls}>
              <h3 className="text-sm font-semibold text-slate-800">Publication</h3>
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input type="checkbox" {...register('isPublished')} className="sr-only peer" />
                  <div className="w-10 h-5 bg-slate-200 rounded-full peer-checked:bg-indigo-600 transition-colors" />
                  <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
                </div>
                <span className="text-sm text-slate-600">Publier immédiatement</span>
              </label>
            </div>

            <div className={cardCls}>
              <h3 className="text-sm font-semibold text-slate-800">Métadonnées</h3>
              <Select label="Catégorie" {...register('category')} options={[
                { value: 'tech', label: 'Technologie' }, { value: 'style', label: 'Style' },
                { value: 'lifestyle', label: 'Lifestyle' }, { value: 'guide', label: 'Guide' },
                { value: 'news', label: 'Actualités' },
              ]} />
              <Input label="Tags (séparés par virgule)" {...register('tags')} placeholder="mode, tendance, tech" />
              <Input label="Temps de lecture (min)" type="number" {...register('readTime')} />
            </div>

            <div className={cardCls}>
              <h3 className="text-sm font-semibold text-slate-800">Auteur & Couverture</h3>
              <Input label="Auteur" {...register('author')} error={errors.author?.message} placeholder="Nom de l'auteur" />
              <Input label="Photo auteur (URL)" {...register('authorImage')} placeholder="https://..." />
              <div>
                <Input label="Image de couverture (URL)" {...register('coverImage')} error={errors.coverImage?.message} placeholder="https://..." />
                {watch('coverImage') && (
                  <img src={watch('coverImage')} alt="" className="mt-2 w-full h-24 object-cover rounded-xl"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button type="submit" loading={mutation.isPending} icon={<Save size={15} />} className="w-full">
                {isEdit ? 'Enregistrer' : 'Créer l\'article'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => navigate('/blog')} className="w-full">
                Annuler
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
