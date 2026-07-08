import { useEffect, useRef, useState } from 'react'
import { api } from '../data/api'
import { exportBackup, importBackup } from '../data/backup'
import { defaultProfile } from '../data/factories'
import { useAutosave } from '../lib/hooks'
import type { BusinessProfile } from '../domain/types'
import { Field, NumberField, PageHeader } from '../components/ui'

const MAX_LOGO_BYTES = 500_000

export default function SettingsPage() {
  const [profile, setProfile] = useState<BusinessProfile | null>(null)
  const [status, setStatus] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const importRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Si todavía no hay perfil en la base, arrancamos con el default
    // (el autoguardado lo persiste en cuanto haya un cambio).
    api.profile
      .get()
      .then((stored) => setProfile(stored ?? defaultProfile()))
      .catch(() => setStatus('No se pudo conectar con la API.'))
  }, [])

  useAutosave(profile, api.profile.save)

  function update(patch: Partial<BusinessProfile>) {
    setProfile((p) => (p ? { ...p, ...patch } : p))
  }

  function flash(message: string) {
    setStatus(message)
    setTimeout(() => setStatus(''), 4000)
  }

  function onLogoSelected(file: File | undefined) {
    if (!file) return
    if (file.size > MAX_LOGO_BYTES) {
      flash('El logo supera los 500 KB. Usá una imagen más liviana (PNG/SVG comprimido).')
      return
    }
    const reader = new FileReader()
    reader.onload = () => update({ logo: String(reader.result) })
    reader.readAsDataURL(file)
  }

  async function onImportSelected(file: File | undefined) {
    if (!file) return
    if (!window.confirm('Importar un backup REEMPLAZA todos los datos actuales. ¿Continuar?')) return
    try {
      await importBackup(file)
      setProfile((await api.profile.get()) ?? defaultProfile())
      flash('Backup importado correctamente.')
    } catch (error) {
      flash(error instanceof Error ? error.message : 'No se pudo importar el archivo.')
    }
  }

  if (!profile) return <p className="text-sm text-muted">Cargando…</p>

  return (
    <div className="max-w-3xl">
      <PageHeader title="Configuración">
        {status && <span className="text-sm font-semibold text-brand">{status}</span>}
      </PageHeader>

      <section className="card mb-6 p-6">
        <h2 className="mb-4 text-sm font-bold tracking-wide text-muted uppercase">Mis datos (emisor)</h2>
        <p className="mb-4 text-sm text-muted">
          Estos datos y el logo aparecen en el encabezado de cada presupuesto y factura.
        </p>
        <div className="mb-5 flex items-center gap-5">
          {profile.logo ? (
            <img src={profile.logo} alt="Logo" className="h-20 w-40 rounded-md border border-line bg-white object-contain p-1" />
          ) : (
            <div className="flex h-20 w-40 items-center justify-center rounded-md border border-dashed border-line text-xs text-muted">
              Sin logo
            </div>
          )}
          <div className="flex flex-col gap-2">
            <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
              {profile.logo ? 'Cambiar logo' : 'Subir logo'}
            </button>
            {profile.logo && (
              <button type="button" className="btn btn-danger btn-mini" onClick={() => update({ logo: '' })}>
                Quitar logo
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              hidden
              onChange={(e) => {
                onLogoSelected(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre / Marca">
            <input className="inp" value={profile.name} onChange={(e) => update({ name: e.target.value })} />
          </Field>
          <Field label="CUIT / ID fiscal">
            <input className="inp" value={profile.taxId} onChange={(e) => update({ taxId: e.target.value })} />
          </Field>
          <Field label="Dirección" className="sm:col-span-2">
            <input className="inp" value={profile.address} onChange={(e) => update({ address: e.target.value })} />
          </Field>
          <Field label="Teléfono">
            <input className="inp" value={profile.phone} onChange={(e) => update({ phone: e.target.value })} />
          </Field>
          <Field label="Mail">
            <input className="inp" value={profile.email} onChange={(e) => update({ email: e.target.value })} />
          </Field>
          <Field label="Sitio web">
            <input className="inp" value={profile.website} onChange={(e) => update({ website: e.target.value })} />
          </Field>
        </div>
      </section>

      <section className="card mb-6 p-6">
        <h2 className="mb-4 text-sm font-bold tracking-wide text-muted uppercase">Valores por defecto</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Moneda (símbolo)">
            <input className="inp" value={profile.currency} onChange={(e) => update({ currency: e.target.value })} />
          </Field>
          <Field label="IVA por defecto (%)">
            <NumberField value={profile.defaultTaxRate} onChange={(v) => update({ defaultTaxRate: v })} />
          </Field>
          <Field label="Validez de cotización">
            <input className="inp" value={profile.defaultValidity} onChange={(e) => update({ defaultValidity: e.target.value })} />
          </Field>
          <Field label="Nota al pie de facturas (datos de pago, condiciones…)" className="sm:col-span-3">
            <textarea
              className="inp min-h-20 resize-y"
              value={profile.invoiceFootnote}
              onChange={(e) => update({ invoiceFootnote: e.target.value })}
            />
          </Field>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="mb-4 text-sm font-bold tracking-wide text-muted uppercase">Respaldo de datos</h2>
        <p className="mb-4 text-sm text-muted">
          Los datos viven en MongoDB con historial de cambios incluido. El backup exporta todo (perfil, clientes,
          cotizaciones, facturas y revisiones) a un JSON; importarlo reemplaza la base completa.
        </p>
        <div className="flex gap-2">
          <button type="button" className="btn btn-primary" onClick={() => exportBackup()}>
            Exportar backup
          </button>
          <button type="button" className="btn" onClick={() => importRef.current?.click()}>
            Importar backup
          </button>
          <input
            ref={importRef}
            type="file"
            accept=".json"
            hidden
            onChange={(e) => {
              onImportSelected(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </div>
      </section>
    </div>
  )
}
