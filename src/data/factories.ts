import { quoteToInvoiceLines } from '../domain/quote-to-invoice'
import type {
  BusinessProfile,
  Client,
  Invoice,
  PartyInfo,
  Quote,
  QuoteSection,
  TaskEstimate,
} from '../domain/types'

export const uid = () => crypto.randomUUID()

const today = () => new Date().toISOString().slice(0, 10)

export function defaultProfile(): BusinessProfile {
  return {
    id: 'default',
    name: 'CodeByPittana.dev',
    address: '',
    taxId: '',
    phone: '',
    email: '',
    website: '',
    logo: '',
    currency: 'US$',
    defaultTaxRate: 0,
    defaultValidity: '7 días',
    invoiceFootnote: '',
  }
}

export function emptyParty(): PartyInfo {
  return { name: '', address: '', taxId: '', phone: '', email: '' }
}

export function clientToParty(client: Client): PartyInfo {
  return {
    name: client.company || client.name,
    address: client.address,
    taxId: client.taxId,
    phone: client.phone,
    email: client.email,
  }
}

export function newClient(): Client {
  return {
    id: uid(),
    name: '',
    company: '',
    address: '',
    taxId: '',
    phone: '',
    email: '',
    notes: '',
    createdAt: new Date().toISOString(),
  }
}

export function newTask(unitCost: number, name = ''): TaskEstimate {
  return {
    id: uid(),
    name,
    note: '',
    pert: false,
    optimistic: 0,
    likely: 0,
    pessimistic: 0,
    hours: 0,
    unitCost,
  }
}

export function newSection(name = 'Nueva sección', rate = 15): QuoteSection {
  return { id: uid(), name, rate, tasks: [newTask(rate)] }
}

function task(name: string, hours: number, unitCost: number): TaskEstimate {
  return { ...newTask(unitCost, name), hours }
}

export function templateSections(): QuoteSection[] {
  return [
    {
      id: uid(),
      name: 'Análisis y Diseño',
      rate: 15,
      tasks: [
        task('Relevamiento de requisitos con el cliente', 6, 15),
        task('Definición de casos de uso / user stories', 2, 15),
        task('Diseño de arquitectura básica', 4, 15),
        task('Bocetos de interfaz gráfica', 2, 15),
        task('Validación del alcance y aprobación del cliente', 1, 15),
      ],
    },
    {
      id: uid(),
      name: 'Desarrollo Backend',
      rate: 20,
      tasks: [
        task('Configuración del entorno y repositorio', 2, 20),
        task('Definición del modelo de datos y base de datos', 3, 20),
        task('Implementación de endpoints', 3, 20),
        task('Lógica de negocio', 8, 20),
        task('Pruebas unitarias básicas', 2, 20),
      ],
    },
    {
      id: uid(),
      name: 'Desarrollo Frontend',
      rate: 18,
      tasks: [
        task('Configuración del proyecto y dependencias', 1, 18),
        task('Maquetado inicial de vistas', 4, 18),
        task('Integración con backend (API calls)', 4, 18),
        task('Manejo de estados, formularios y validaciones', 2, 18),
        task('Ajustes de diseño y usabilidad', 1, 18),
      ],
    },
    {
      id: uid(),
      name: 'Testing',
      rate: 15,
      tasks: [
        task('Creación de casos de prueba', 0.5, 15),
        task('Pruebas funcionales de módulos', 2, 15),
        task('Corrección de bugs detectados', 2.5, 15),
      ],
    },
    {
      id: uid(),
      name: 'Deploy y Configuración',
      rate: 18,
      tasks: [
        task('Configuración de servidores / nube', 1, 18),
        task('Despliegue del backend', 3, 18),
        task('Despliegue del frontend', 3, 18),
        task('Backup y configuraciones varias', 2, 18),
      ],
    },
    {
      id: uid(),
      name: 'Hosting y Licencias',
      rate: 250,
      tasks: [task('Servicio de VPS', 1, 250)],
    },
  ]
}

export function newQuote(number: string, profile: BusinessProfile, useTemplate: boolean): Quote {
  const now = new Date().toISOString()
  return {
    id: uid(),
    number,
    clientId: null,
    client: emptyParty(),
    title: '',
    date: today(),
    validity: profile.defaultValidity,
    currency: profile.currency,
    sections: useTemplate ? templateSections() : [newSection()],
    adjustments: {
      managementMode: 'fixed',
      managementValue: 0,
      discount: 0,
      taxRate: profile.defaultTaxRate,
    },
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  }
}

export function newInvoice(number: string, profile: BusinessProfile): Invoice {
  const now = new Date().toISOString()
  return {
    id: uid(),
    number,
    quoteId: null,
    clientId: null,
    client: emptyParty(),
    date: today(),
    dueDate: '',
    currency: profile.currency,
    lines: [{ id: uid(), description: '', quantity: 1, unitPrice: 0 }],
    discount: 0,
    taxRate: profile.defaultTaxRate,
    notes: '',
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  }
}

export function invoiceFromQuote(quote: Quote, number: string): Invoice {
  const now = new Date().toISOString()
  return {
    id: uid(),
    number,
    quoteId: quote.id,
    clientId: quote.clientId,
    client: { ...quote.client },
    date: today(),
    dueDate: '',
    currency: quote.currency,
    lines: quoteToInvoiceLines(quote.sections, quote.adjustments, uid),
    discount: quote.adjustments.discount,
    taxRate: quote.adjustments.taxRate,
    notes: quote.title ? `Corresponde al presupuesto ${quote.number} — ${quote.title}` : `Corresponde al presupuesto ${quote.number}`,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  }
}
