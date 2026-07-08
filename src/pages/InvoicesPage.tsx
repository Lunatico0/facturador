import { useNavigate } from 'react-router-dom'
import { api } from '../data/api'
import { defaultProfile, newInvoice } from '../data/factories'
import { formatMoney } from '../domain/format'
import { invoiceTotal } from '../domain/invoice-calculations'
import { nextDocumentNumber } from '../domain/numbering'
import { useResource } from '../lib/hooks'
import type { Invoice } from '../domain/types'
import { PageHeader, StatusBadge, invoiceStatusLabels } from '../components/ui'

export default function InvoicesPage() {
  const { data: invoices, error, reload } = useResource(api.invoices.list)
  const navigate = useNavigate()

  async function createInvoice() {
    const profile = (await api.profile.get()) ?? defaultProfile()
    const numbers = (await api.invoices.list()).map((i) => i.number)
    const invoice = newInvoice(nextDocumentNumber('FC', numbers), profile)
    await api.invoices.save(invoice)
    navigate(`/facturas/${invoice.id}`)
  }

  async function removeInvoice(invoice: Invoice) {
    if (!window.confirm(`¿Eliminar la factura ${invoice.number}?`)) return
    await api.invoices.remove(invoice.id)
    reload()
  }

  if (error) return <p className="text-sm text-danger">No se pudo conectar con la API: {error}</p>

  return (
    <div className="max-w-5xl">
      <PageHeader title="Facturas">
        <button type="button" className="btn btn-primary" onClick={createInvoice}>
          + Nueva factura
        </button>
      </PageHeader>

      <div className="card overflow-hidden">
        {invoices && invoices.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-brand-soft/50 text-left text-xs tracking-wide text-muted uppercase">
                <th className="px-4 py-2.5 font-semibold">Número</th>
                <th className="px-4 py-2.5 font-semibold">Cliente</th>
                <th className="px-4 py-2.5 font-semibold">Fecha</th>
                <th className="px-4 py-2.5 text-right font-semibold">Total</th>
                <th className="px-4 py-2.5 font-semibold">Estado</th>
                <th className="w-40 px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr
                  key={invoice.id}
                  className="cursor-pointer border-b border-line/60 last:border-0 hover:bg-paper"
                  onClick={() => navigate(`/facturas/${invoice.id}`)}
                >
                  <td className="px-4 py-2.5 font-mono font-semibold">{invoice.number}</td>
                  <td className="px-4 py-2.5 font-semibold">{invoice.client.name || 'Sin cliente'}</td>
                  <td className="px-4 py-2.5 text-muted">{invoice.date}</td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold text-brand">
                    {formatMoney(invoiceTotal(invoice.lines, invoice.discount, invoice.taxRate), invoice.currency)}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={invoice.status} label={invoiceStatusLabels[invoice.status]} />
                  </td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    {invoice.status !== 'paid' && (
                      <button
                        type="button"
                        className="btn btn-mini mr-1.5"
                        onClick={async (e) => {
                          e.stopPropagation()
                          await api.invoices.save({ ...invoice, status: 'paid', updatedAt: new Date().toISOString() })
                          reload()
                        }}
                      >
                        Marcar pagada
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-mini btn-danger"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeInvoice(invoice)
                      }}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-5 py-10 text-center text-sm text-muted">
            Sin facturas todavía. Creá una desde cero o desde una cotización con el botón “Facturar”.
          </p>
        )}
      </div>
    </div>
  )
}
