import { useState, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { Upload, FileCheck, X } from 'lucide-react'

const inputCls = "border border-[#d6d6d6] focus:border-[#111] rounded-lg px-3.5 py-3 text-[15px] outline-none transition-colors placeholder:text-[#9a9a9a] bg-white"
const labelCls = "text-[13px] font-semibold text-[#111]"

export function Select({
  label, options, extra, ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; options: { value: string; label: string }[]; extra?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <label className="text-[13px] font-semibold text-[#111]">{label}</label>
        {extra}
      </div>
      <select {...props} className={inputCls}>
        <option value="">Sélectionner…</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

export function Textarea({
  label, ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className={labelCls}>{label}</label>
      <textarea {...props} rows={props.rows ?? 4} className={`${inputCls} resize-none`} />
    </div>
  )
}

export function RadioGroup({
  label, name, options, value, onChange,
}: {
  label: string
  name: string
  options: { value: string; label: string; desc?: string }[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <label className={labelCls}>{label}</label>
      <div className="flex flex-col gap-2">
        {options.map(o => (
          <label
            key={o.value}
            className={`flex items-start gap-3 border rounded-lg px-4 py-3 cursor-pointer transition-colors ${
              value === o.value ? 'border-[#111] bg-[#f7f7f5]' : 'border-[#d6d6d6] hover:border-[#9a9a9a]'
            }`}
          >
            <input
              type="radio"
              name={name}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="mt-0.5 w-4 h-4 accent-[#111] shrink-0"
            />
            <div className="flex flex-col">
              <span className="text-[14px] font-semibold text-[#111]">{o.label}</span>
              {o.desc && <span className="text-[13px] text-[#6f6f6f]">{o.desc}</span>}
            </div>
          </label>
        ))}
      </div>
    </div>
  )
}

export function FileInput({
  label, hint, value, onChange, accept = 'image/*',
}: {
  label: string
  hint?: string
  value: File | null
  onChange: (file: File | null) => void
  accept?: string
}) {
  const [preview, setPreview] = useState<string | null>(null)

  function handleFile(f: File | null) {
    onChange(f)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(f && f.type.startsWith('image/') ? URL.createObjectURL(f) : null)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className={labelCls}>{label}</label>
      {value ? (
        <div className="flex items-center gap-3 border border-[#d6d6d6] rounded-lg px-3.5 py-2.5">
          {preview ? (
            <img src={preview} alt="" className="w-10 h-10 rounded-md object-cover shrink-0" />
          ) : (
            <FileCheck size={18} className="text-[#0a8a3a] shrink-0" />
          )}
          <span className="flex-1 text-[13px] text-[#111] truncate">{value.name}</span>
          <button type="button" onClick={() => handleFile(null)} className="text-[#9a9a9a] hover:text-[#111] shrink-0">
            <X size={16} />
          </button>
        </div>
      ) : (
        <label className="flex items-center gap-3 border border-dashed border-[#d6d6d6] hover:border-[#111] rounded-lg px-3.5 py-3 cursor-pointer transition-colors">
          <Upload size={16} className="text-[#6f6f6f] shrink-0" />
          <span className="text-[13px] text-[#6f6f6f]">Choisir un fichier…</span>
          <input
            type="file"
            accept={accept}
            className="hidden"
            onChange={e => handleFile(e.target.files?.[0] ?? null)}
          />
        </label>
      )}
      {hint && <span className="text-[12px] text-[#9a9a9a]">{hint}</span>}
    </div>
  )
}

export function StepHeader({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h2 className="text-[24px] lg:text-[26px] font-extrabold text-[#111] tracking-tight">{title}</h2>
      {desc && <p className="text-[#6f6f6f] text-[14px]">{desc}</p>}
    </div>
  )
}
