import { describe, expect, it } from 'vitest'
import {
  managementAmount,
  pertEstimate,
  quoteBase,
  quoteSubtotal,
  quoteTaxAmount,
  quoteTotal,
  sectionHours,
  sectionTotal,
  taskHours,
  taskTotal,
} from './quote-calculations'
import type { QuoteAdjustments, QuoteSection, TaskEstimate } from './types'

function makeTask(overrides: Partial<TaskEstimate> = {}): TaskEstimate {
  return {
    id: 't1',
    name: 'Tarea',
    note: '',
    pert: false,
    optimistic: 0,
    likely: 0,
    pessimistic: 0,
    hours: 0,
    unitCost: 0,
    ...overrides,
  }
}

function makeSection(tasks: TaskEstimate[], rate = 20): QuoteSection {
  return { id: 's1', name: 'Sección', rate, tasks }
}

function makeAdjustments(overrides: Partial<QuoteAdjustments> = {}): QuoteAdjustments {
  return { managementMode: 'fixed', managementValue: 0, discount: 0, taxRate: 0, ...overrides }
}

describe('pertEstimate', () => {
  it('aplica la fórmula (O + 4M + P) / 6', () => {
    expect(pertEstimate(2, 4, 12)).toBeCloseTo(5)
  })

  it('devuelve 0 cuando todos los valores son 0', () => {
    expect(pertEstimate(0, 0, 0)).toBe(0)
  })
})

describe('taskHours', () => {
  it('usa las horas directas cuando PERT está apagado', () => {
    expect(taskHours(makeTask({ hours: 8 }))).toBe(8)
  })

  it('usa la estimación PERT cuando está activado', () => {
    const task = makeTask({ pert: true, optimistic: 2, likely: 4, pessimistic: 12, hours: 99 })
    expect(taskHours(task)).toBeCloseTo(5)
  })
})

describe('taskTotal', () => {
  it('multiplica horas por costo unitario', () => {
    expect(taskTotal(makeTask({ hours: 3, unitCost: 20 }))).toBe(60)
  })

  it('usa horas PERT cuando corresponde', () => {
    const task = makeTask({ pert: true, optimistic: 2, likely: 4, pessimistic: 12, unitCost: 10 })
    expect(taskTotal(task)).toBeCloseTo(50)
  })
})

describe('sectionHours / sectionTotal', () => {
  const section = makeSection([
    makeTask({ id: 'a', hours: 2, unitCost: 20 }),
    makeTask({ id: 'b', hours: 3, unitCost: 10 }),
  ])

  it('suma las horas de todas las tareas', () => {
    expect(sectionHours(section)).toBe(5)
  })

  it('suma los totales de todas las tareas', () => {
    expect(sectionTotal(section)).toBe(70)
  })

  it('devuelve 0 para una sección vacía', () => {
    expect(sectionTotal(makeSection([]))).toBe(0)
  })
})

describe('quoteSubtotal', () => {
  it('suma los totales de todas las secciones', () => {
    const sections = [
      makeSection([makeTask({ hours: 2, unitCost: 20 })]),
      makeSection([makeTask({ hours: 1, unitCost: 50 })]),
    ]
    expect(quoteSubtotal(sections)).toBe(90)
  })
})

describe('managementAmount', () => {
  it('devuelve el monto fijo en modo fixed', () => {
    expect(managementAmount(1000, makeAdjustments({ managementMode: 'fixed', managementValue: 300 }))).toBe(300)
  })

  it('calcula el porcentaje del subtotal en modo percent', () => {
    expect(managementAmount(1000, makeAdjustments({ managementMode: 'percent', managementValue: 25 }))).toBe(250)
  })
})

describe('quoteTaxAmount', () => {
  it('aplica el IVA sobre la base menos el descuento', () => {
    const adj = makeAdjustments({ discount: 100, taxRate: 21 })
    expect(quoteTaxAmount(1100, adj)).toBeCloseTo(210)
  })

  it('no genera IVA negativo si el descuento supera la base', () => {
    const adj = makeAdjustments({ discount: 2000, taxRate: 21 })
    expect(quoteTaxAmount(1000, adj)).toBe(0)
  })
})

describe('quoteTotal', () => {
  it('integra subtotal + gestión - descuento + IVA', () => {
    const sections = [makeSection([makeTask({ hours: 50, unitCost: 20 })])]
    const adj = makeAdjustments({
      managementMode: 'percent',
      managementValue: 10,
      discount: 100,
      taxRate: 21,
    })
    // subtotal 1000, gestión 100, base 1100, base gravable 1000, IVA 210
    expect(quoteBase(sections, adj)).toBe(1100)
    expect(quoteTotal(sections, adj)).toBeCloseTo(1210)
  })

  it('sin ajustes devuelve el subtotal', () => {
    const sections = [makeSection([makeTask({ hours: 10, unitCost: 15 })])]
    expect(quoteTotal(sections, makeAdjustments())).toBe(150)
  })
})
