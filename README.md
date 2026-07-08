# Cotizador — CodeByPittana.dev

App para cotizar proyectos freelance y facturar. Frontend React + Vite; backend Express + MongoDB con **trazabilidad**: cada cambio en perfil, clientes, cotizaciones y facturas queda registrado en la colección `revisions` con fecha, acción y snapshot completo.

## Setup

1. Crear `.env` en la raíz con:

```
MONGO_URI=mongodb://localhost:27017/cotizador
PORT=4000
```

2. `npm install` y `npm run dev` (levanta web + API juntos).
3. Entrar con la password inicial **1234** y cambiarla YA en Configuración → Seguridad.

## Login y seguridad

- Toda la API exige sesión (token Bearer). El login inicial es con la password `1234`, hasheada con scrypt — cambiala en el primer uso.
- Cambiar la password revoca **todas** las sesiones abiertas (útil ante sospecha de filtración).
- Las sesiones expiran a los 30 días (TTL en Mongo).

## Deploy en Vercel

1. Importar el repo `Lunatico0/facturador` en Vercel (framework: Vite, detectado solo).
2. En Settings → Environment Variables agregar `MONGO_URI` (tiene que ser un Mongo accesible desde internet, ej. Atlas — localhost no sirve).
3. Deploy. La API corre como función serverless (`api/index.ts`); el frontend es estático.
4. Primer login con `1234` → cambiar la password inmediatamente.

Nota: los dominios `.vercel.app` solo admiten un nivel de subdominio — `invoice.codebypittana.vercel.app` no es posible. Opciones: nombre de proyecto propio (`invoice-codebypittana.vercel.app`) o dominio custom (`invoice.codebypittana.dev`).

## Funcionalidades

- **Cotizaciones**: secciones con tareas, tarifa por hora, estimación PERT de tres puntos (TPE = (O + 4M + P) / 6), gestión/contingencia (fija o %), descuento e IVA. Numeración automática `COT-0001`.
- **Facturador**: factura desde cero o generada desde una cotización (una línea por sección + gestión). Numeración `FC-0001`, estados borrador/enviada/pagada, vencimiento y notas.
- **Documentos imprimibles**: presupuesto y factura A4 con logo, datos del emisor y del cliente. "Imprimir / PDF" usa el diálogo del navegador (guardar como PDF).
- **Clientes**: CRUD; al asignar un cliente el documento guarda una copia de sus datos (editarlo después no altera documentos ya emitidos).
- **Trazabilidad**: botón "Ver historial de cambios" en cotizaciones y facturas — cada revisión con fecha, acción y total. El servidor no registra revisiones si el contenido no cambió (solo `updatedAt` no cuenta).
- **Backup**: exportar/importar toda la base (incluidas revisiones) a JSON desde Configuración.

## Comandos

```bash
npm run dev       # web (5173) + API (4000) juntos — requiere MONGO_URI en .env
npm run dev:web   # solo frontend
npm run dev:api   # solo API contra tu Mongo
npm run dev:demo  # web + API con Mongo EN MEMORIA (datos efímeros, ideal para probar)
npm test          # tests: dominio + integración de la API (Mongo en memoria)
npm run build     # build de producción
```

## Arquitectura

```
server/
  index.ts      # bootstrap: .env, conexión a Mongo, listen
  app.ts        # Express: CRUD genérico + perfil + backup
  models.ts     # esquemas Mongoose (validación en el borde)
  revisions.ts  # audit trail: comparación estable de snapshots
src/
  domain/       # lógica pura, testeada: cálculos, numeración, conversión cotización→factura
  data/         # api.ts (cliente HTTP), factories, backup
  lib/          # hooks: useResource, useAutosave (debounce + flush al desmontar)
  pages/        # rutas: cotizaciones, facturas, clientes, configuración
  components/   # UI compartida + documentos imprimibles + RevisionHistory
```

Reglas del proyecto:
- La matemática vive en `domain/` como funciones puras con tests; los componentes solo renderizan.
- Nunca side effects dentro de updaters de `setState` (deben ser puros); el guardado pasa por `useAutosave`.
- El frontend habla con la API vía el proxy de Vite (`/api` → `localhost:4000`); no hay CORS que configurar.
