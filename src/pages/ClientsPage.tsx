import { useState } from 'react'
import { api } from '../data/api'
import { newClient } from '../data/factories'
import { useResource } from '../lib/hooks'
import type { Client } from '../domain/types'
import { Field, PageHeader } from '../components/ui'

export default function ClientsPage() {
  const { data, error, reload } = useResource(api.clients.list)
  const clients = data ? [...data].sort((a, b) => a.name.localeCompare(b.name)) : undefined
  const [draft, setDraft] = useState<Client | null>(null)

  const set = (patch: Partial<Client>) => setDraft((d) => (d ? { ...d, ...patch } : d))

  async function saveDraft() {
    if (!draft || !draft.name.trim()) return
    await api.clients.save(draft)
    setDraft(null)
    reload()
  }

  async function removeClient(client: Client) {
    if (!window.confirm(`¿Eliminar a "${client.name}"? Las cotizaciones y facturas existentes conservan sus datos.`)) return
    await api.clients.remove(client.id)
    if (draft?.id === client.id) setDraft(null)
    reload()
  }

  if (error) return <p className="text-sm text-danger">No se pudo conectar con la API: {error}</p>

  return (
    <div className="max-w-5xl">
      <PageHeader title="Clientes">
        <button type="button" className="btn btn-primary" onClick={() => setDraft(newClient())}>
          + Nuevo cliente
        </button>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="card overflow-hidden">
          {clients && clients.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-brand-soft/50 text-left text-xs tracking-wide text-muted uppercase">
                  <th className="px-4 py-2.5 font-semibold">Nombre</th>
                  <th className="px-4 py-2.5 font-semibold">Empresa</th>
                  <th className="px-4 py-2.5 font-semibold">CUIT / ID fiscal</th>
                  <th className="px-4 py-2.5 font-semibold">Mail</th>
                  <th className="w-20 px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr
                    key={client.id}
                    className="cursor-pointer border-b border-line/60 last:border-0 hover:bg-paper"
                    onClick={() => setDraft({ ...client })}
                  >
                    <td className="px-4 py-2.5 font-semibold">{client.name}</td>
                    <td className="px-4 py-2.5 text-muted">{client.company || '—'}</td>
                    <td className="px-4 py-2.5 text-muted">{client.taxId || '—'}</td>
                    <td className="px-4 py-2.5 text-muted">{client.email || '—'}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        className="btn btn-mini btn-danger"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeClient(client)
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
              Todavía no cargaste clientes. Creá el primero y quedará disponible en cotizaciones y facturas.
            </p>
          )}
        </div>

        {draft && (
          <div className="card h-fit p-5">
            <h2 className="mb-4 text-sm font-bold tracking-wide text-muted uppercase">
              {clients?.some((c) => c.id === draft.id) ? 'Editar cliente' : 'Nuevo cliente'}
            </h2>
            <div className="flex flex-col gap-3">
              <Field label="Nombre de contacto *">
                <input className="inp" value={draft.name} onChange={(e) => set({ name: e.target.value })} />
              </Field>
              <Field label="Empresa">
                <input className="inp" value={draft.company} onChange={(e) => set({ company: e.target.value })} />
              </Field>
              <Field label="Dirección">
                <input className="inp" value={draft.address} onChange={(e) => set({ address: e.target.value })} />
              </Field>
              <Field label="CUIT / ID fiscal">
                <input className="inp" value={draft.taxId} onChange={(e) => set({ taxId: e.target.value })} />
              </Field>
              <Field label="Teléfono">
                <input className="inp" value={draft.phone} onChange={(e) => set({ phone: e.target.value })} />
              </Field>
              <Field label="Mail">
                <input className="inp" value={draft.email} onChange={(e) => set({ email: e.target.value })} />
              </Field>
              <Field label="Notas">
                <textarea
                  className="inp min-h-20 resize-y"
                  value={draft.notes}
                  onChange={(e) => set({ notes: e.target.value })}
                />
              </Field>
              <div className="mt-1 flex gap-2">
                <button type="button" className="btn btn-primary flex-1" onClick={saveDraft} disabled={!draft.name.trim()}>
                  Guardar
                </button>
                <button type="button" className="btn" onClick={() => setDraft(null)}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
