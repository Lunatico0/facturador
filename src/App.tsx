import { Navigate, NavLink, Route, Routes } from 'react-router-dom'
import ClientsPage from './pages/ClientsPage'
import InvoiceEditorPage from './pages/InvoiceEditorPage'
import InvoicesPage from './pages/InvoicesPage'
import QuoteEditorPage from './pages/QuoteEditorPage'
import QuotesPage from './pages/QuotesPage'
import SettingsPage from './pages/SettingsPage'

const navItems = [
  { to: '/cotizaciones', label: 'Cotizaciones', icon: '▤' },
  { to: '/facturas', label: 'Facturas', icon: '⎘' },
  { to: '/clientes', label: 'Clientes', icon: '☰' },
  { to: '/configuracion', label: 'Configuración', icon: '⚙' },
]

export default function App() {
  return (
    <div className="flex min-h-screen">
      <aside className="no-print fixed inset-y-0 left-0 z-10 flex w-56 flex-col border-r border-line bg-white">
        <div className="border-b border-line px-5 py-5">
          <p className="text-lg font-bold tracking-tight">Cotizador</p>
          <p className="text-xs font-semibold text-brand">CodeByPittana.dev</p>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                  isActive ? 'bg-brand-soft text-brand' : 'text-muted hover:bg-paper hover:text-ink'
                }`
              }
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <p className="mt-auto px-5 py-4 text-[11px] leading-snug text-muted">
          Datos en MongoDB con historial de cambios. Backups desde Configuración.
        </p>
      </aside>

      <main className="ml-56 min-w-0 flex-1 px-8 py-8 print:m-0 print:p-0">
        <Routes>
          <Route path="/" element={<Navigate to="/cotizaciones" replace />} />
          <Route path="/cotizaciones" element={<QuotesPage />} />
          <Route path="/cotizaciones/:id" element={<QuoteEditorPage />} />
          <Route path="/facturas" element={<InvoicesPage />} />
          <Route path="/facturas/:id" element={<InvoiceEditorPage />} />
          <Route path="/clientes" element={<ClientsPage />} />
          <Route path="/configuracion" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  )
}
