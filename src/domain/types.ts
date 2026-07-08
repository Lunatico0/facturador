export interface TaskEstimate {
  id: string
  name: string
  note: string
  pert: boolean
  optimistic: number
  likely: number
  pessimistic: number
  hours: number
  unitCost: number
}

export interface QuoteSection {
  id: string
  name: string
  rate: number
  tasks: TaskEstimate[]
}

export type ManagementMode = 'fixed' | 'percent'

export interface QuoteAdjustments {
  managementMode: ManagementMode
  managementValue: number
  discount: number
  taxRate: number
}

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected'

export interface PartyInfo {
  name: string
  address: string
  taxId: string
  phone: string
  email: string
}

export interface Quote {
  id: string
  number: string
  clientId: string | null
  client: PartyInfo
  title: string
  date: string
  validity: string
  currency: string
  sections: QuoteSection[]
  adjustments: QuoteAdjustments
  status: QuoteStatus
  createdAt: string
  updatedAt: string
}

export interface InvoiceLine {
  id: string
  description: string
  quantity: number
  unitPrice: number
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid'

export interface Invoice {
  id: string
  number: string
  quoteId: string | null
  clientId: string | null
  client: PartyInfo
  date: string
  dueDate: string
  currency: string
  lines: InvoiceLine[]
  discount: number
  taxRate: number
  notes: string
  status: InvoiceStatus
  createdAt: string
  updatedAt: string
}

export interface Client {
  id: string
  name: string
  company: string
  address: string
  taxId: string
  phone: string
  email: string
  notes: string
  createdAt: string
}

export interface Revision<T = unknown> {
  entity: string
  entityId: string
  action: 'create' | 'update' | 'delete'
  at: string
  snapshot: T
}

export interface BusinessProfile {
  id: string
  name: string
  address: string
  taxId: string
  phone: string
  email: string
  website: string
  logo: string
  currency: string
  defaultTaxRate: number
  defaultValidity: string
  invoiceFootnote: string
}
