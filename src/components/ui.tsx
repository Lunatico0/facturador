import { useEffect, useRef, useState } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import type { InvoiceStatus, QuoteStatus } from '../domain/types'

export function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="lbl">{label}</span>
      {children}
    </label>
  )
}

interface NumberFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number
  onChange: (value: number) => void
}

/**
 * Input numérico que tolera estados intermedios de tipeo ("1.", "0,5")
 * sin pelearse con el estado controlado de React.
 */
export function NumberField({ value, onChange, className = '', ...props }: NumberFieldProps) {
  const [text, setText] = useState(value === 0 ? '' : String(value))
  const focused = useRef(false)

  useEffect(() => {
    if (!focused.current) setText(value === 0 ? '' : String(value))
  }, [value])

  return (
    <input
      type="number"
      step="any"
      min="0"
      inputMode="decimal"
      className={`inp inp-num ${className}`}
      value={text}
      placeholder="0"
      onFocus={() => {
        focused.current = true
      }}
      onBlur={() => {
        focused.current = false
        setText(value === 0 ? '' : String(value))
      }}
      onChange={(e) => {
        setText(e.target.value)
        const parsed = parseFloat(e.target.value)
        onChange(Number.isNaN(parsed) ? 0 : parsed)
      }}
      {...props}
    />
  )
}

export const quoteStatusLabels: Record<QuoteStatus, string> = {
  draft: 'Borrador',
  sent: 'Enviada',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
}

export const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  draft: 'Borrador',
  sent: 'Enviada',
  paid: 'Pagada',
}

const statusStyles: Record<string, string> = {
  draft: 'bg-paper text-muted border-line',
  sent: 'bg-amber-soft text-amber border-amber/30',
  accepted: 'bg-brand-soft text-brand border-brand/30',
  paid: 'bg-brand-soft text-brand border-brand/30',
  rejected: 'bg-red-50 text-danger border-danger/30',
}

export function StatusBadge({ status, label }: { status: string; label: string }) {
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusStyles[status] ?? ''}`}>
      {label}
    </span>
  )
}

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="no-print mb-6 flex flex-wrap items-center gap-3 border-b-2 border-ink pb-4">
      <h1 className="text-xl font-bold tracking-tight">{title}</h1>
      <div className="ml-auto flex flex-wrap items-center gap-2">{children}</div>
    </div>
  )
}
