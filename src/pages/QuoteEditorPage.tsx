import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import QuoteDocument from '../components/QuoteDocument'
import RevisionHistory from '../components/RevisionHistory'
import { Field, NumberField, PageHeader, quoteStatusLabels } from '../components/ui'
import { api } from '../data/api'
import { clientToParty, defaultProfile, invoiceFromQuote, newSection, newTask } from '../data/factories'
import { useAutosave, useResource } from '../lib/hooks'
import { formatHours, formatMoney } from '../domain/format'
import { nextDocumentNumber } from '../domain/numbering'
import {
  managementAmount,
  pertEstimate,
  quoteSubtotal,
  quoteTotal,
  sectionHours,
  sectionTotal,
  taskHours,
  taskTotal,
} from '../domain/quote-calculations'
import type { PartyInfo, Quote, QuoteSection, QuoteStatus, TaskEstimate } from '../domain/types'

export default function QuoteEditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [quote, setQuote] = useState<Quote | null | undefined>(undefined)
  const profile = useResource(api.profile.get).data ?? defaultProfile()
  const clients = useResource(api.clients.list).data ?? []

  useEffect(() => {
    if (id) api.quotes.get(id).then(setQuote).catch(() => setQuote(null))
  }, [id])

  // Autoguardado con debounce contra la API (con flush al desmontar)
  useAutosave(quote, api.quotes.save)

  function update(mutate: (quote: Quote) => Quote) {
    setQuote((prev) => (prev ? { ...mutate(prev), updatedAt: new Date().toISOString() } : prev))
  }

  const patch = (p: Partial<Quote>) => update((q) => ({ ...q, ...p }))
  const patchAdjustments = (p: Partial<Quote['adjustments']>) =>
    update((q) => ({ ...q, adjustments: { ...q.adjustments, ...p } }))
  const patchClient = (p: Partial<PartyInfo>) => update((q) => ({ ...q, client: { ...q.client, ...p } }))

  function patchSection(sectionId: string, p: Partial<QuoteSection>) {
    update((q) => ({
      ...q,
      sections: q.sections.map((s) => (s.id === sectionId ? { ...s, ...p } : s)),
    }))
  }

  function changeSectionRate(section: QuoteSection, rate: number) {
    // Las tareas que seguían la tarifa vieja acompañan a la nueva
    patchSection(section.id, {
      rate,
      tasks: section.tasks.map((t) => (t.unitCost === section.rate ? { ...t, unitCost: rate } : t)),
    })
  }

  function patchTask(sectionId: string, taskId: string, p: Partial<TaskEstimate>) {
    update((q) => ({
      ...q,
      sections: q.sections.map((s) =>
        s.id === sectionId ? { ...s, tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, ...p } : t)) } : s,
      ),
    }))
  }

  function togglePert(sectionId: string, task: TaskEstimate, enabled: boolean) {
    patchTask(sectionId, task.id, {
      pert: enabled,
      likely: enabled && task.likely === 0 && task.hours > 0 ? task.hours : task.likely,
    })
  }

  function selectClient(clientId: string) {
    const client = clients.find((c) => c.id === clientId)
    update((q) => ({
      ...q,
      clientId: client ? client.id : null,
      client: client ? clientToParty(client) : q.client,
    }))
  }

  async function createInvoice() {
    if (!quote) return
    const numbers = (await api.invoices.list()).map((i) => i.number)
    const invoice = invoiceFromQuote(quote, nextDocumentNumber('FC', numbers))
    await api.invoices.save(invoice)
    navigate(`/facturas/${invoice.id}`)
  }

  if (quote === undefined) return <p className="text-sm text-muted">Cargando…</p>

  if (quote === null) {
    return (
      <p className="text-sm text-muted">
        Cotización no encontrada. <Link to="/cotizaciones" className="font-semibold text-brand">Volver</Link>
      </p>
    )
  }

  const money = (n: number) => formatMoney(n, quote.currency)
  const subtotal = quoteSubtotal(quote.sections)
  const totalHours = quote.sections.reduce((sum, s) => sum + sectionHours(s), 0)

  return (
    <div className="max-w-5xl">
      <PageHeader title={`Cotización ${quote.number}`}>
        <Link to="/cotizaciones" className="btn">
          ← Volver
        </Link>
        <select
          className="inp w-auto"
          value={quote.status}
          onChange={(e) => patch({ status: e.target.value as QuoteStatus })}
        >
          {Object.entries(quoteStatusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button type="button" className="btn" onClick={createInvoice}>
          Facturar
        </button>
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>
          Imprimir / PDF
        </button>
      </PageHeader>

      <section className="no-print card mb-5 p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Número">
            <input className="inp inp-num" value={quote.number} onChange={(e) => patch({ number: e.target.value })} />
          </Field>
          <Field label="Proyecto / Título" className="lg:col-span-3">
            <input
              className="inp"
              placeholder="Ej: Sistema de reservas para B&C Viandas"
              value={quote.title}
              onChange={(e) => patch({ title: e.target.value })}
            />
          </Field>
          <Field label="Fecha">
            <input type="date" className="inp" value={quote.date} onChange={(e) => patch({ date: e.target.value })} />
          </Field>
          <Field label="Validez">
            <input className="inp" value={quote.validity} onChange={(e) => patch({ validity: e.target.value })} />
          </Field>
          <Field label="Moneda">
            <input className="inp" value={quote.currency} onChange={(e) => patch({ currency: e.target.value })} />
          </Field>
          <Field label="Cliente guardado">
            <select className="inp" value={quote.clientId ?? ''} onChange={(e) => selectClient(e.target.value)}>
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
            <input className="inp" value={quote.client.name} onChange={(e) => patchClient({ name: e.target.value })} />
          </Field>
          <Field label="Dirección">
            <input className="inp" value={quote.client.address} onChange={(e) => patchClient({ address: e.target.value })} />
          </Field>
          <Field label="CUIT / ID fiscal">
            <input className="inp" value={quote.client.taxId} onChange={(e) => patchClient({ taxId: e.target.value })} />
          </Field>
          <Field label="Teléfono">
            <input className="inp" value={quote.client.phone} onChange={(e) => patchClient({ phone: e.target.value })} />
          </Field>
          <Field label="Mail">
            <input className="inp" value={quote.client.email} onChange={(e) => patchClient({ email: e.target.value })} />
          </Field>
        </div>
      </section>

      <div className="no-print">
        {quote.sections.map((section) => (
          <section key={section.id} className="card mb-4 overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 border-b border-line bg-brand-soft px-4 py-3">
              <input
                className="min-w-40 flex-1 rounded bg-transparent px-1 text-[15px] font-bold focus:bg-white focus:outline-2 focus:outline-brand"
                value={section.name}
                onChange={(e) => patchSection(section.id, { name: e.target.value })}
                aria-label="Nombre de sección"
              />
              <span className="flex items-center gap-1.5 text-xs text-muted">
                Tarifa
                <NumberField
                  className="w-20 py-1"
                  value={section.rate}
                  onChange={(rate) => changeSectionRate(section, rate)}
                />
                /h
              </span>
              <span className="font-mono text-[13px] font-bold text-brand tabular-nums">
                {formatHours(sectionHours(section))} hs · {money(sectionTotal(section))}
              </span>
              <button
                type="button"
                className="btn btn-mini btn-danger"
                onClick={() => {
                  if (window.confirm(`¿Quitar la sección "${section.name}"?`))
                    update((q) => ({ ...q, sections: q.sections.filter((s) => s.id !== section.id) }))
                }}
              >
                Quitar
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-[11px] tracking-wider text-muted uppercase">
                    <th className="w-[32%] px-3 py-2 font-semibold">Tarea</th>
                    <th className="w-14 px-2 py-2 text-center font-semibold">PERT</th>
                    <th className="w-24 px-2 py-2 text-right font-semibold">Hs/Un.</th>
                    <th className="w-24 px-2 py-2 text-right font-semibold">Costo unit.</th>
                    <th className="w-28 px-2 py-2 text-right font-semibold">Total</th>
                    <th className="px-3 py-2 font-semibold">Consideraciones</th>
                    <th className="w-10 px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {section.tasks.map((task) => (
                    <TaskRows
                      key={task.id}
                      task={task}
                      money={money}
                      onPatch={(p) => patchTask(section.id, task.id, p)}
                      onTogglePert={(enabled) => togglePert(section.id, task, enabled)}
                      onDelete={() =>
                        patchSection(section.id, { tasks: section.tasks.filter((t) => t.id !== task.id) })
                      }
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2.5">
              <button
                type="button"
                className="btn btn-mini"
                onClick={() => patchSection(section.id, { tasks: [...section.tasks, newTask(section.rate)] })}
              >
                + Tarea
              </button>
            </div>
          </section>
        ))}

        <button
          type="button"
          className="btn btn-primary mb-6"
          onClick={() => update((q) => ({ ...q, sections: [...q.sections, newSection()] }))}
        >
          + Sección
        </button>

        <section className="card mb-8 p-5">
          <h2 className="mb-3 text-sm font-bold tracking-wide text-muted uppercase">Resumen interno</h2>
          <div className="grid max-w-xl grid-cols-[1fr_auto_auto] gap-x-6 gap-y-1 text-sm">
            {quote.sections.map((s) => (
              <div key={s.id} className="contents">
                <span className="text-muted">{s.name}</span>
                <span className="text-right font-mono tabular-nums">{formatHours(sectionHours(s))} hs</span>
                <span className="text-right font-mono tabular-nums">{money(sectionTotal(s))}</span>
              </div>
            ))}
            <span className="text-muted">
              Gestión / contingencia
              {quote.adjustments.managementMode === 'percent' && ` (${quote.adjustments.managementValue}%)`}
            </span>
            <span />
            <span className="text-right font-mono tabular-nums">{money(managementAmount(subtotal, quote.adjustments))}</span>
            <span className="col-span-3 my-1.5 border-t border-line" />
            <span className="text-base font-bold">Total</span>
            <span className="text-right font-mono text-base font-bold tabular-nums">{formatHours(totalHours)} hs</span>
            <span className="text-right font-mono text-base font-bold text-brand tabular-nums">
              {money(quoteTotal(quote.sections, quote.adjustments))}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-3 border-t border-dashed border-line pt-4">
            <Field label="Gestión / contingencia">
              <div className="flex gap-2">
                <select
                  className="inp w-auto"
                  value={quote.adjustments.managementMode}
                  onChange={(e) => patchAdjustments({ managementMode: e.target.value as 'fixed' | 'percent' })}
                >
                  <option value="fixed">Monto fijo</option>
                  <option value="percent">% del subtotal</option>
                </select>
                <NumberField
                  className="w-24"
                  value={quote.adjustments.managementValue}
                  onChange={(v) => patchAdjustments({ managementValue: v })}
                />
              </div>
            </Field>
            <Field label="Descuento">
              <NumberField
                className="w-28"
                value={quote.adjustments.discount}
                onChange={(v) => patchAdjustments({ discount: v })}
              />
            </Field>
            <Field label="IVA %">
              <NumberField
                className="w-20"
                value={quote.adjustments.taxRate}
                onChange={(v) => patchAdjustments({ taxRate: v })}
              />
            </Field>
            <p className="pb-2 text-xs text-amber">Recomendado: 20–30% de gestión si usás porcentaje.</p>
          </div>
        </section>
      </div>

      <RevisionHistory
        load={() => api.quotes.revisions(quote.id)}
        describe={(snap) =>
          `${snap.number}${snap.title ? ` — ${snap.title}` : ''} · ${formatMoney(quoteTotal(snap.sections, snap.adjustments), snap.currency)}`
        }
      />

      <h2 className="no-print mb-3 text-sm font-bold tracking-wide text-muted uppercase">Vista previa del documento</h2>
      <QuoteDocument quote={quote} profile={profile} />
    </div>
  )
}

function TaskRows({
  task,
  money,
  onPatch,
  onTogglePert,
  onDelete,
}: {
  task: TaskEstimate
  money: (n: number) => string
  onPatch: (p: Partial<TaskEstimate>) => void
  onTogglePert: (enabled: boolean) => void
  onDelete: () => void
}) {
  return (
    <>
      <tr className="border-b border-line/50">
        <td className="px-3 py-1.5">
          <input
            className="w-full rounded border border-transparent px-1.5 py-1 hover:border-line focus:border-brand focus:outline-none"
            placeholder="Descripción de la tarea"
            value={task.name}
            onChange={(e) => onPatch({ name: e.target.value })}
          />
        </td>
        <td className="px-2 py-1.5 text-center">
          <input
            type="checkbox"
            className="size-4 cursor-pointer accent-amber"
            checked={task.pert}
            onChange={(e) => onTogglePert(e.target.checked)}
            aria-label="Estimar con PERT"
          />
        </td>
        <td className="px-2 py-1.5">
          {task.pert ? (
            <span className="block text-right font-mono text-sm font-bold text-brand tabular-nums">
              {formatHours(taskHours(task))}
            </span>
          ) : (
            <NumberField className="py-1" value={task.hours} onChange={(hours) => onPatch({ hours })} />
          )}
        </td>
        <td className="px-2 py-1.5">
          <NumberField className="py-1" value={task.unitCost} onChange={(unitCost) => onPatch({ unitCost })} />
        </td>
        <td className="px-2 py-1.5 text-right font-mono text-sm font-bold tabular-nums whitespace-nowrap">
          {money(taskTotal(task))}
        </td>
        <td className="px-3 py-1.5">
          <input
            className="w-full rounded border border-transparent px-1.5 py-1 text-muted hover:border-line focus:border-brand focus:outline-none"
            placeholder="—"
            value={task.note}
            onChange={(e) => onPatch({ note: e.target.value })}
          />
        </td>
        <td className="px-2 py-1.5 text-center">
          <button
            type="button"
            className="cursor-pointer rounded px-1.5 font-bold text-line hover:bg-red-50 hover:text-danger"
            onClick={onDelete}
            aria-label="Quitar tarea"
          >
            ×
          </button>
        </td>
      </tr>
      {task.pert && (
        <tr className="border-b border-amber/20 bg-amber-soft">
          <td colSpan={7} className="px-3 py-2">
            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-amber">
              <label className="flex items-center gap-1.5">
                Optimista
                <NumberField className="w-20 border-amber/40 py-1" value={task.optimistic} onChange={(optimistic) => onPatch({ optimistic })} />
              </label>
              <label className="flex items-center gap-1.5">
                Probable
                <NumberField className="w-20 border-amber/40 py-1" value={task.likely} onChange={(likely) => onPatch({ likely })} />
              </label>
              <label className="flex items-center gap-1.5">
                Pesimista
                <NumberField className="w-20 border-amber/40 py-1" value={task.pessimistic} onChange={(pessimistic) => onPatch({ pessimistic })} />
              </label>
              <span className="font-mono">
                TPE = {formatHours(pertEstimate(task.optimistic, task.likely, task.pessimistic))} hs
              </span>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
