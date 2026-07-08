import { useNavigate } from 'react-router-dom'
import { api } from '../data/api'
import { defaultProfile, invoiceFromQuote, newQuote } from '../data/factories'
import { formatMoney } from '../domain/format'
import { nextDocumentNumber } from '../domain/numbering'
import { quoteTotal } from '../domain/quote-calculations'
import { useResource } from '../lib/hooks'
import type { Quote } from '../domain/types'
import { PageHeader, StatusBadge, quoteStatusLabels } from '../components/ui'

export default function QuotesPage() {
  const { data: quotes, error, reload } = useResource(api.quotes.list)
  const navigate = useNavigate()

  async function createQuote() {
    const profile = (await api.profile.get()) ?? defaultProfile()
    const numbers = (await api.quotes.list()).map((q) => q.number)
    const quote = newQuote(nextDocumentNumber('COT', numbers), profile, true)
    await api.quotes.save(quote)
    navigate(`/cotizaciones/${quote.id}`)
  }

  async function createInvoice(quote: Quote) {
    const numbers = (await api.invoices.list()).map((i) => i.number)
    const invoice = invoiceFromQuote(quote, nextDocumentNumber('FC', numbers))
    await api.invoices.save(invoice)
    navigate(`/facturas/${invoice.id}`)
  }

  async function removeQuote(quote: Quote) {
    if (!window.confirm(`¿Eliminar la cotización ${quote.number}?`)) return
    await api.quotes.remove(quote.id)
    reload()
  }

  if (error) return <p className="text-sm text-danger">No se pudo conectar con la API: {error}</p>

  return (
    <div className="max-w-5xl">
      <PageHeader title="Cotizaciones">
        <button type="button" className="btn btn-primary" onClick={createQuote}>
          + Nueva cotización
        </button>
      </PageHeader>

      <div className="card overflow-hidden">
        {quotes && quotes.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-brand-soft/50 text-left text-xs tracking-wide text-muted uppercase">
                <th className="px-4 py-2.5 font-semibold">Número</th>
                <th className="px-4 py-2.5 font-semibold">Proyecto / Cliente</th>
                <th className="px-4 py-2.5 font-semibold">Fecha</th>
                <th className="px-4 py-2.5 text-right font-semibold">Total</th>
                <th className="px-4 py-2.5 font-semibold">Estado</th>
                <th className="w-44 px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {quotes.map((quote) => (
                <tr
                  key={quote.id}
                  className="cursor-pointer border-b border-line/60 last:border-0 hover:bg-paper"
                  onClick={() => navigate(`/cotizaciones/${quote.id}`)}
                >
                  <td className="px-4 py-2.5 font-mono font-semibold">{quote.number}</td>
                  <td className="px-4 py-2.5">
                    <span className="font-semibold">{quote.title || 'Sin título'}</span>
                    {quote.client.name && <span className="text-muted"> · {quote.client.name}</span>}
                  </td>
                  <td className="px-4 py-2.5 text-muted">{quote.date}</td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold text-brand">
                    {formatMoney(quoteTotal(quote.sections, quote.adjustments), quote.currency)}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={quote.status} label={quoteStatusLabels[quote.status]} />
                  </td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    <button
                      type="button"
                      className="btn btn-mini mr-1.5"
                      title="Generar factura a partir de esta cotización"
                      onClick={(e) => {
                        e.stopPropagation()
                        createInvoice(quote)
                      }}
                    >
                      Facturar
                    </button>
                    <button
                      type="button"
                      className="btn btn-mini btn-danger"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeQuote(quote)
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
            Sin cotizaciones todavía. Creá la primera: arranca con tu plantilla de secciones y tareas típicas.
          </p>
        )}
      </div>
    </div>
  )
}
