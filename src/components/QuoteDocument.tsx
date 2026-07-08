import { formatHours, formatMoney } from '../domain/format'
import {
  managementAmount,
  quoteBase,
  quoteSubtotal,
  quoteTaxAmount,
  quoteTotal,
  sectionHours,
  sectionTotal,
} from '../domain/quote-calculations'
import type { BusinessProfile, Quote } from '../domain/types'

function PartyBlock({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-bold tracking-widest text-muted uppercase">{title}</p>
      {lines.filter(Boolean).map((line, i) => (
        <p key={i} className={i === 0 ? 'text-sm font-bold' : 'text-[13px] text-muted'}>
          {line}
        </p>
      ))}
    </div>
  )
}

export default function QuoteDocument({ quote, profile }: { quote: Quote; profile: BusinessProfile }) {
  const money = (n: number) => formatMoney(n, quote.currency)
  const management = managementAmount(quoteSubtotal(quote.sections), quote.adjustments)
  const base = quoteBase(quote.sections, quote.adjustments)
  const tax = quoteTaxAmount(base, quote.adjustments)

  return (
    <div id="print-root" className="card mx-auto max-w-[210mm] p-10">
      <div className="flex items-start justify-between gap-4 border-b-2 border-ink pb-4">
        <div className="flex items-center gap-4">
          {profile.logo && <img src={profile.logo} alt="" className="max-h-16 max-w-40 object-contain" />}
          <div>
            <h3 className="text-xl font-bold tracking-tight">PRESUPUESTO</h3>
            <p className="font-mono text-sm text-muted">{quote.number}</p>
          </div>
        </div>
        <div className="text-right text-[13px] text-muted">
          <p>Fecha: {quote.date}</p>
          {quote.validity && <p>Validez: {quote.validity}</p>}
        </div>
      </div>

      {quote.title && <p className="mt-4 text-sm font-semibold">{quote.title}</p>}

      <div className="mt-5 mb-6 grid grid-cols-2 gap-6">
        <PartyBlock
          title="De"
          lines={[
            profile.name,
            profile.address,
            profile.taxId && `CUIT/ID: ${profile.taxId}`,
            profile.phone,
            profile.email,
            profile.website,
          ]}
        />
        <PartyBlock
          title="Para"
          lines={[
            quote.client.name,
            quote.client.address,
            quote.client.taxId && `CUIT/ID: ${quote.client.taxId}`,
            quote.client.phone,
            quote.client.email,
          ]}
        />
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-ink text-left text-xs tracking-wide uppercase">
            <th className="py-2 pr-2 font-bold">Descripción</th>
            <th className="py-2 pr-2 text-right font-bold">Unidades/Hs</th>
            <th className="py-2 pr-2 text-right font-bold">Precio</th>
            <th className="py-2 text-right font-bold">Total</th>
          </tr>
        </thead>
        <tbody>
          {quote.sections.map((section) => {
            const hours = sectionHours(section)
            const total = sectionTotal(section)
            if (hours === 0 && total === 0) return null
            return (
              <tr key={section.id} className="border-b border-line/70">
                <td className="py-2 pr-2">{section.name}</td>
                <td className="py-2 pr-2 text-right font-mono tabular-nums">{formatHours(hours)}</td>
                <td className="py-2 pr-2 text-right font-mono tabular-nums">{money(hours > 0 ? total / hours : total)}</td>
                <td className="py-2 text-right font-mono tabular-nums">{money(total)}</td>
              </tr>
            )
          })}
          {management > 0 && (
            <tr className="border-b border-line/70">
              <td className="py-2 pr-2">Costos de gestión</td>
              <td className="py-2 pr-2 text-right font-mono tabular-nums">1</td>
              <td className="py-2 pr-2 text-right font-mono tabular-nums">{money(management)}</td>
              <td className="py-2 text-right font-mono tabular-nums">{money(management)}</td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="mt-4 ml-auto grid w-64 grid-cols-2 gap-y-1 text-sm">
        <span className="text-muted">Sub-total</span>
        <span className="text-right font-mono tabular-nums">{money(base)}</span>
        {quote.adjustments.discount > 0 && (
          <>
            <span className="text-muted">Descuento</span>
            <span className="text-right font-mono tabular-nums">− {money(quote.adjustments.discount)}</span>
          </>
        )}
        {tax > 0 && (
          <>
            <span className="text-muted">IVA ({quote.adjustments.taxRate}%)</span>
            <span className="text-right font-mono tabular-nums">{money(tax)}</span>
          </>
        )}
        <span className="mt-1 border-t-2 border-ink pt-1.5 text-base font-bold">TOTAL</span>
        <span className="mt-1 border-t-2 border-ink pt-1.5 text-right font-mono text-base font-bold tabular-nums text-brand">
          {money(quoteTotal(quote.sections, quote.adjustments))}
        </span>
      </div>

      <div className="mt-16 grid grid-cols-2 gap-10">
        <p className="border-t border-ink pt-1.5 text-center text-xs text-muted">Firma</p>
        <p className="border-t border-ink pt-1.5 text-center text-xs text-muted">Firma del cliente</p>
      </div>
    </div>
  )
}
