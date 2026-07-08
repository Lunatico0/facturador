import { useState } from 'react'
import type { FormEvent } from 'react'
import { api, setToken } from '../data/api'

export default function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!password || busy) return
    setBusy(true)
    setError(null)
    try {
      const { token } = await api.auth.login(password)
      setToken(token)
      onLogin()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <form onSubmit={submit} className="card w-full max-w-sm p-8">
        <h1 className="text-xl font-bold tracking-tight">Cotizador</h1>
        <p className="mb-6 text-sm font-semibold text-brand">CodeByPittana.dev</p>
        <label className="block">
          <span className="lbl">Password</span>
          <input
            type="password"
            className="inp"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <p className="mt-3 text-sm font-semibold text-danger">{error}</p>}
        <button type="submit" className="btn btn-primary mt-5 w-full" disabled={busy || !password}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
