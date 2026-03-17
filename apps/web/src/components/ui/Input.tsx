import { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?:   string
  error?:   string
  hint?:    string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  hint,
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-[#1A1A2E]">
          {label}
          {props.required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={[
          'w-full px-3.5 py-2.5 rounded-md text-sm',
          'border bg-white text-[#1A1A2E]',
          'transition-colors duration-150',
          'placeholder:text-[#9CA3AF]',
          'focus:outline-none focus:ring-2 focus:ring-[#1B2E4B] focus:border-transparent',
          error
            ? 'border-red-400 focus:ring-red-400'
            : 'border-[#E2DDD5] hover:border-[#C9A84C]',
          className,
        ].join(' ')}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      {hint && ! error && <p className="text-xs text-[#6B7280]">{hint}</p>}
    </div>
  )
})

Input.displayName = 'Input'
