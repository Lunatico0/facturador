import { useState } from 'react'
import type { Revision } from '../domain/types'

const actionLabels: Record<Revision['action'], string> = {
  create: 'Creación',
  update: 'Modificación',
  delete: 'Eliminación',
}

export default function RevisionHistory<T>({
  load,
  describe,
}: {
  load: () => Promise<Revision<T>[]>
  describe: (snapshot: T) => string
}) {
  const [revisions, setRevisions] = useState<Revision<T>[] | null>(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function toggle() {
    const next = !open
    setOpen(next)
    if (next) {
      try {
        setRevisions(await load())
        setError(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo cargar el historial.')
      }
    }
  }

  return (
    <section className="no-print card mb-8 p-5">
      <button type="button" className="btn btn-mini" onClick={toggle}>
        {open ? 'Ocultar historial' : 'Ver historial de cambios'}
      </button>
      {open && error && <p className="mt-3 text-sm text-danger">{error}</p>}
      {open && revisions && (
        <ul className="mt-4 flex flex-col gap-1.5 text-sm">
          {revisions.map((rev, i) => (
            <li key={`${rev.at}-${i}`} className="flex flex-wrap items-baseline gap-x-3 border-b border-line/50 pb-1.5 last:border-0">
              <span className="font-mono text-xs text-muted tabular-nums">
                {new Date(rev.at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
              </span>
              <span className={`text-xs font-semibold ${rev.action === 'delete' ? 'text-danger' : 'text-brand'}`}>
                {actionLabels[rev.action]}
              </span>
              <span className="text-muted">{describe(rev.snapshot)}</span>
            </li>
          ))}
          {revisions.length === 0 && <li className="text-muted">Sin cambios registrados todavía.</li>}
        </ul>
      )}
    </section>
  )
}
