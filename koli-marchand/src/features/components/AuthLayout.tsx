import type { InputHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'

type Props = {
  headline: ReactNode
  leftExtra: ReactNode
  children: ReactNode
}

export function AuthLayout({ headline, leftExtra, children }: Props) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      <div className="relative overflow-hidden lg:w-[480px] shrink-0 flex flex-col justify-between px-8 lg:px-12 py-10 lg:py-14 gap-10 bg-[url('/wall/wall1.png')] bg-cover bg-center">
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/70 to-black/90" />

        <Link to="/" className="relative z-10">
          <img src="/logo-skignas.png" alt="Skignas" width={150} height={49} decoding="async" className="h-9 w-auto invert" />
        </Link>

        <div className="relative z-10 flex flex-col gap-9 text-[#f4f4f2]">
          <h1 className="text-4xl lg:text-[42px] font-extrabold leading-[1.1] tracking-tight">{headline}</h1>
          {leftExtra}
        </div>

        <span className="relative z-10 text-[#9a9a9a] text-[13px]">© 2026 Skignas · Espace marchand</span>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-14 lg:py-10">
        <div className="w-full max-w-[420px] flex flex-col gap-7">
          {children}
        </div>
      </div>
    </div>
  )
}

export function Field({
  label, extra, ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; extra?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <label className="text-[13px] font-semibold text-[#111]">{label}</label>
        {extra}
      </div>
      <input
        {...props}
        className="border border-[#d6d6d6] focus:border-[#111] rounded-lg px-3.5 py-3 text-[15px] font-[Archivo] outline-none transition-colors placeholder:text-[#9a9a9a]"
      />
    </div>
  )
}

export function GoogleButton({ children }: { children: ReactNode }) {
  return (
    <button
      type="button"
      className="border border-[#d6d6d6] hover:border-[#111] transition-colors rounded-lg py-3.5 text-[15px] font-semibold text-[#111] flex items-center justify-center gap-2.5"
    >
      <span className="font-extrabold text-base leading-none">G</span>
      {children}
    </button>
  )
}
