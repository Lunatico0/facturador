import { api } from './api'

export async function exportBackup(): Promise<void> {
  const data = await api.backup.export()
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `cotizador-backup-${String(data.exportedAt).slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

export async function importBackup(file: File): Promise<void> {
  const text = await file.text()
  const data = JSON.parse(text) as unknown
  await api.backup.import(data)
}
