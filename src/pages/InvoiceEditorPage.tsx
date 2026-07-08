import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import InvoiceDocument from '../components/InvoiceDocument'
import RevisionHistory from '../components/RevisionHistory'
import { Field, NumberField, PageHeader, invoiceStatusLabels } from '../components/ui'
import { api } from '../data/api'
import { clientToParty, defaultProfile, uid } from '../data/factories'
import { formatMoney } from '../domain/format'
import { invoiceLineTotal, invoiceTotal } from '../domain/invoice-calculations'
import { useAutosave, useResource } from '../lib/hooks'
import type { Invoice, InvoiceLine, InvoiceStatus, PartyInfo } from '../domain/types'

export default function InvoiceEditorPage() {
  const { id } = useParams()
  const [invoice, setInvoice] = useState<Invoice | null | undefined>(undefined)
  const profile = useResource(api.profile.get).data ?? defaultProfile()
  const clients = useResource(api.clients.list).data ?? []

  useEffect(() => {
    if (id) api.invoices.get(id).then(setInvoice).catch(() => setInvoice(null))
  }, [id])

  // Autoguardado con debounce contra la API (con flush al desmontar)
  useAutosave(invoice, api.invoices.save)

  function update(mutate: (invoice: Invoice) => Invoice) {
    setInvoice((prev) => (prev ? { ...mutate(prev), updatedAt: new Date().toISOString() } : prev))
  }

  const patch = (p: Partial<Invoice>) => update((i) => ({ ...i, ...p }))
  const patchClient = (p: Partial<PartyInfo>) => update((i) => ({ ...i, client: { ...i.client, ...p } }))

  function patchLine(lineId: string, p: Partial<InvoiceLine>) {
    update((i) => ({ ...i, lines: i.lines.map((l) => (l.id === lineId ? { ...l, ...p } : l)) }))
  }

  function selectClient(clientId: string) {
    const client = clients.find((c) => c.id === clientId)
    update((i) => ({
      ...i,
      clientId: client ? client.id : null,
      client: client ? clientToParty(client) : i.client,
    }))
  }

  if (invoice === undefined) return <p className="text-sm text-muted">Cargando…</p>

  if (invoice === null) {
    return (
      <p className="text-sm text-muted">
        Factura no encontrada. <Link to="/facturas" className="font-semibold text-brand">Volver</Link>
      </p>
    )
  }

  return (
    <div className="max-w-5xl">
      <PageHeader title={`Factura ${invoice.number}`}>
        <Link to="/facturas" className="btn">
          ← Volver
        </Link>
        {invoice.quoteId && (
          <Link to={`/cotizaciones/${invoice.quoteId}`} className="btn">
            Ver cotización
          </Link>
        )}
        <select
          className="inp w-auto"
          value={invoice.status}
          onChange={(e) => patch({ status: e.target.value as InvoiceStatus })}
        >
          {Object.entries(invoiceStatusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>
          Imprimir / PDF
        </button>
      </PageHeader>

      <section className="no-print card mb-5 p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Número">
            <input className="inp inp-num" value={invoice.number} onChange={(e) => patch({ number: e.target.value })} />
          </Field>
          <Field label="Fecha">
            <input type="date" className="inp" value={invoice.date} onChange={(e) => patch({ date: e.target.value })} />
          </Field>
          <Field label="Vencimiento">
            <input type="date" className="inp" value={invoice.dueDate} onChange={(e) => patch({ dueDate: e.target.value })} />
          </Field>
          <Field label="Moneda">
            <input className="inp" value={invoice.currency} onChange={(e) => patch({ currency: e.target.value })} />
          </Field>
          <Field label="Cliente guardado">
            <select className="inp" value={invoice.clientId ?? ''} onChange={(e) => selectClient(e.target.value)}>
              <option value="">— Elegir cliente —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company ? `${c.company} (${c.name})` : c.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mt-4 grid gap-4 border-t border-dashed border-line pt-4 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Cliente (en documento)">
            <input className="inp" value={invoice.client.name} onChange={(e) => patchClient({ name: e.target.value })} />
          </Field>
          <Field label="Dirección">
            <input className="inp" value={invoice.client.address} onChange={(e) => patchClient({ address: e.target.value })} />
          </Field>
          <Field label="CUIT / ID fiscal">
            <input className="inp" value={invoice.client.taxId} onChange={(e) => patchClient({ taxId: e.target.value })} />
          </Field>
          <Field label="Teléfono">
            <input className="inp" value={invoice.client.phone} onChange={(e) => patchClient({ phone: e.target.value })} />
          </Field>
          <Field label="Mail">
            <input className="inp" value={invoice.client.email} onChange={(e) => patchClient({ email: e.target.value })} />
          </Field>
        </div>
      </section>

      <section className="no-print card mb-5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line bg-brand-soft/50 text-left text-[11px] tracking-wider text-muted uppercase">
                <th className="px-3 py-2.5 font-semibold">Descripción</th>
                <th className="w-28 px-2 py-2.5 text-right font-semibold">Cantidad</th>
                <th className="w-32 px-2 py-2.5 text-right font-semibold">Precio unit.</th>
                <th className="w-32 px-2 py-2.5 text-right font-semibold">Total</th>
                <th className="w-10 px-2 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {invoice.lines.map((line) => (
                <tr key={line.id} className="border-b border-line/50">
                  <td className="px-3 py-1.5">
                    <input
                      className="w-full rounded border border-transparent px-1.5 py-1 hover:border-line focus:border-brand focus:outline-none"
                      placeholder="Concepto facturado"
                      value={line.description}
                      onChange={(e) => patchLine(line.id, { description: e.target.value })}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <NumberField className="py-1" value={line.quantity} onChange={(quantity) => patchLine(line.id, { quantity })} />
                  </td>
                  <td className="px-2 py-1.5">
                    <NumberField className="py-1" value={line.unitPrice} onChange={(unitPrice) => patchLine(line.id, { unitPrice })} />
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono text-sm font-bold tabular-nums whitespace-nowrap">
                    {formatMoney(invoiceLineTotal(line), invoice.currency)}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <button
                      type="button"
                      className="cursor-pointer rounded px-1.5 font-bold text-line hover:bg-red-50 hover:text-danger"
                      onClick={() => update((i) => ({ ...i, lines: i.lines.filter((l) => l.id !== line.id) }))}
                      aria-label="Quitar línea"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3 px-4 py-3">
          <button
            type="button"
            className="btn btn-mini"
            onClick={() =>
              update((i) => ({ ...i, lines: [...i.lines, { id: uid(), description: '', quantity: 1, unitPrice: 0 }] }))
            }
          >
            + Línea
          </button>
          <span className="flex-1" />
          <Field label="Descuento">
            <NumberField className="w-28" value={invoice.discount} onChange={(discount) => patch({ discount })} />
          </Field>
          <Field label="IVA %">
            <NumberField className="w-20" value={invoice.taxRate} onChange={(taxRate) => patch({ taxRate })} />
          </Field>
        </div>
      </section>

      <section className="no-print card mb-8 p-5">
        <Field label="Notas (aparecen en la factura)">
          <textarea
            className="inp min-h-20 resize-y"
            value={invoice.notes}
            onChange={(e) => patch({ notes: e.target.value })}
          />
        </Field>
      </section>

      <RevisionHistory
        load={() => api.invoices.revisions(invoice.id)}
        describe={(snap) =>
          `${snap.number} · ${formatMoney(invoiceTotal(snap.lines, snap.discount, snap.taxRate), snap.currency)}`
        }
      />

      <h2 className="no-print mb-3 text-sm font-bold tracking-wide text-muted uppercase">Vista previa del documento</h2>
      <InvoiceDocument invoice={invoice} profile={profile} />
    </div>
  )
}
