import { describe, expect, it } from 'vitest'
import { quoteToInvoiceLines } from './quote-to-invoice'
import type { QuoteAdjustments, QuoteSection } from './types'

let counter = 0
const nextId = () => `id-${++counter}`

function section(name: string, hours: number, unitCost: number): QuoteSection {
  return {
    id: nextId(),
    name,
    rate: unitCost,
    tasks: [
      {
        id: nextId(),
        name: 'Tarea',
        note: '',
        pert: false,
        optimistic: 0,
        likely: 0,
        pessimistic: 0,
        hours,
        unitCost,
      },
    ],
  }
}

function adjustments(overrides: Partial<QuoteAdjustments> = {}): QuoteAdjustments {
  return { managementMode: 'fixed', managementValue: 0, discount: 0, taxRate: 0, ...overrides }
}

describe('quoteToInvoiceLines', () => {
  it('convierte cada sección en una línea con horas como cantidad y tarifa efectiva como precio', () => {
    const sections = [section('Backend', 10, 20), section('Frontend', 5, 18)]
    const lines = quoteToInvoiceLines(sections, adjustments(), nextId)

    expect(lines).toHaveLength(2)
    expect(lines[0]).toMatchObject({ description: 'Backend', quantity: 10, unitPrice: 20 })
    expect(lines[1]).toMatchObject({ description: 'Frontend', quantity: 5, unitPrice: 18 })
  })

  it('omite secciones vacías o en cero', () => {
    const sections = [section('Backend', 10, 20), section('Vacía', 0, 0)]
    const lines = quoteToInvoiceLines(sections, adjustments(), nextId)
    expect(lines).toHaveLength(1)
  })

  it('agrega una línea de gestión cuando hay monto de gestión', () => {
    const sections = [section('Backend', 10, 100)]
    const adj = adjustments({ managementMode: 'percent', managementValue: 20 })
    const lines = quoteToInvoiceLines(sections, adj, nextId)

    expect(lines).toHaveLength(2)
    expect(lines[1]).toMatchObject({ description: 'Costos de gestión', quantity: 1, unitPrice: 200 })
  })

  it('el total de las líneas reproduce la base de la cotización', () => {
    const sections = [section('Backend', 7, 33), section('Frontend', 3, 21)]
    const adj = adjustments({ managementMode: 'fixed', managementValue: 150 })
    const lines = quoteToInvoiceLines(sections, adj, nextId)
    const total = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0)
    expect(total).toBeCloseTo(7 * 33 + 3 * 21 + 150)
  })
})
