import { formatHours, formatMoney } from '../domain/format'
import { invoiceLineTotal, invoiceSubtotal, invoiceTaxAmount, invoiceTotal } from '../domain/invoice-calculations'
import type { BusinessProfile, Invoice } from '../domain/types'

export default function InvoiceDocument({ invoice, profile }: { invoice: Invoice; profile: BusinessProfile }) {
  const money = (n: number) => formatMoney(n, invoice.currency)
  const subtotal = invoiceSubtotal(invoice.lines)
  const tax = invoiceTaxAmount(invoice.lines, invoice.discount, invoice.taxRate)

  return (
    <div id="print-root" className="card mx-auto max-w-[210mm] p-10">
      <div className="flex items-start justify-between gap-4 border-b-2 border-ink pb-5">
        <div className="flex items-center gap-4">
          {profile.logo && <img src={profile.logo} alt="" className="max-h-16 max-w-40 object-contain" />}
          <div>
            <p className="text-base font-bold">{profile.name}</p>
            {profile.address && <p className="text-[13px] text-muted">{profile.address}</p>}
            {profile.taxId && <p className="text-[13px] text-muted">CUIT/ID: {profile.taxId}</p>}
            {(profile.phone || profile.email) && (
              <p className="text-[13px] text-muted">{[profile.phone, profile.email].filter(Boolean).join(' · ')}</p>
            )}
            {profile.website && <p className="text-[13px] text-muted">{profile.website}</p>}
          </div>
        </div>
        <div className="text-right">
          <h3 className="text-xl font-bold tracking-tight">FACTURA</h3>
          <p className="font-mono text-sm text-muted">{invoice.number}</p>
          <p className="mt-2 text-[13px] text-muted">Fecha: {invoice.date}</p>
          {invoice.dueDate && <p className="text-[13px] text-muted">Vencimiento: {invoice.dueDate}</p>}
        </div>
      </div>

      <div className="mt-5 mb-6">
        <p className="mb-1.5 text-[11px] font-bold tracking-widest text-muted uppercase">Facturar a</p>
        <p className="text-sm font-bold">{invoice.client.name}</p>
        {invoice.client.address && <p className="text-[13px] text-muted">{invoice.client.address}</p>}
        {invoice.client.taxId && <p className="text-[13px] text-muted">CUIT/ID: {invoice.client.taxId}</p>}
        {(invoice.client.phone || invoice.client.email) && (
          <p className="text-[13px] text-muted">
            {[invoice.client.phone, invoice.client.email].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-ink text-left text-xs tracking-wide uppercase">
            <th className="py-2 pr-2 font-bold">Descripción</th>
            <th className="py-2 pr-2 text-right font-bold">Cantidad</th>
            <th className="py-2 pr-2 text-right font-bold">Precio unit.</th>
            <th className="py-2 text-right font-bold">Total</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lines
            .filter((line) => line.description || invoiceLineTotal(line) !== 0)
            .map((line) => (
              <tr key={line.id} className="border-b border-line/70">
                <td className="py-2 pr-2">{line.description}</td>
                <td className="py-2 pr-2 text-right font-mono tabular-nums">{formatHours(line.quantity)}</td>
                <td className="py-2 pr-2 text-right font-mono tabular-nums">{money(line.unitPrice)}</td>
                <td className="py-2 text-right font-mono tabular-nums">{money(invoiceLineTotal(line))}</td>
              </tr>
            ))}
        </tbody>
      </table>

      <div className="mt-4 ml-auto grid w-64 grid-cols-2 gap-y-1 text-sm">
        <span className="text-muted">Sub-total</span>
        <span className="text-right font-mono tabular-nums">{money(subtotal)}</span>
        {invoice.discount > 0 && (
          <>
            <span className="text-muted">Descuento</span>
            <span className="text-right font-mono tabular-nums">− {money(invoice.discount)}</span>
          </>
        )}
        {tax > 0 && (
          <>
            <span className="text-muted">IVA ({invoice.taxRate}%)</span>
            <span className="text-right font-mono tabular-nums">{money(tax)}</span>
          </>
        )}
        <span className="mt-1 border-t-2 border-ink pt-1.5 text-base font-bold">TOTAL</span>
        <span className="mt-1 border-t-2 border-ink pt-1.5 text-right font-mono text-base font-bold tabular-nums text-brand">
          {money(invoiceTotal(invoice.lines, invoice.discount, invoice.taxRate))}
        </span>
      </div>

      {invoice.notes && <p className="mt-8 text-[13px] whitespace-pre-line text-muted">{invoice.notes}</p>}
      {profile.invoiceFootnote && (
        <p className="mt-4 border-t border-line pt-3 text-xs whitespace-pre-line text-muted">{profile.invoiceFootnote}</p>
      )}
    </div>
  )
}
