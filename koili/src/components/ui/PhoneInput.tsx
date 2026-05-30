import type { InputHTMLAttributes } from 'react'

interface PhoneInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  error?: string
  /** Classes supplémentaires sur le wrapper */
  wrapperClassName?: string
}

/**
 * Champ téléphone avec indicatif Côte d'Ivoire (+225) pré-fixé.
 * Utilisation :
 *   <PhoneInput value={tel} onChange={e => setTel(e.target.value)} error={errors.tel} />
 */
export function PhoneInput({
  value,
  onChange,
  error,
  wrapperClassName = '',
  placeholder = '07 00 00 00 00',
  maxLength = 12,
  ...rest
}: PhoneInputProps) {
  return (
    <div className={`flex items-center rounded-xl border-2 transition-all overflow-hidden ${
      error
        ? 'border-red-300 focus-within:border-red-400'
        : 'border-gray-200 focus-within:border-gray-400'
    } ${wrapperClassName}`}>
      {/* Indicatif — statique CI uniquement */}
      <div className="flex items-center gap-1.5 px-3 py-3 bg-gray-50 border-r border-gray-200 shrink-0 select-none cursor-default">
        <span className="text-base leading-none" aria-label="Côte d'Ivoire">🇨🇮</span>
        <span className="text-sm font-semibold text-gray-700">+225</span>
      </div>

      {/* Input */}
      <input
        type="tel"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        maxLength={maxLength}
        inputMode="tel"
        className="flex-1 px-3.5 py-3 text-sm bg-white focus:outline-none placeholder:text-gray-300 text-gray-800"
        {...rest}
      />
    </div>
  )
}
