import { Revision } from './models.js'

/**
 * Serialización determinista (claves ordenadas) para comparar snapshots:
 * el orden de claves difiere entre el body del cliente y el documento de Mongo.
 */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`)
    return `{${entries.join(',')}}`
  }
  return JSON.stringify(value)
}

/** updatedAt cambia en cada guardado; no cuenta como cambio de contenido. */
export function contentChanged(before: unknown, after: unknown): boolean {
  const strip = (v: unknown) => {
    if (v === null || typeof v !== 'object') return v
    const { updatedAt: _updatedAt, ...rest } = v as Record<string, unknown>
    return rest
  }
  return stableStringify(strip(before)) !== stableStringify(strip(after))
}

export async function recordRevision(
  entity: string,
  entityId: string,
  action: 'create' | 'update' | 'delete',
  snapshot: unknown,
): Promise<void> {
  await Revision.create({ entity, entityId, action, at: new Date().toISOString(), snapshot })
}
