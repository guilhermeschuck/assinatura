import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react'

type AlertVariant = 'success' | 'warning' | 'error' | 'info'

const config: Record<AlertVariant, { icon: React.ElementType; classes: string }> = {
  success: { icon: CheckCircle2, classes: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
  warning: { icon: AlertTriangle, classes: 'bg-amber-50 border-amber-200 text-amber-800' },
  error:   { icon: XCircle,       classes: 'bg-red-50 border-red-200 text-red-800' },
  info:    { icon: Info,          classes: 'bg-blue-50 border-blue-200 text-blue-800' },
}

interface AlertProps {
  variant?:  AlertVariant
  title?:    string
  children:  React.ReactNode
}

export function Alert({ variant = 'info', title, children }: AlertProps) {
  const { icon: Icon, classes } = config[variant]

  return (
    <div className={`flex gap-3 p-4 rounded-lg border ${classes}`}>
      <Icon size={18} className="mt-0.5 shrink-0" />
      <div className="flex-1 text-sm">
        {title && <p className="font-semibold mb-1">{title}</p>}
        {children}
      </div>
    </div>
  )
}
