import { describe, expect, it } from 'vitest'
import {
  invoiceLineTotal,
  invoiceSubtotal,
  invoiceTaxAmount,
  invoiceTotal,
} from './invoice-calculations'
import type { InvoiceLine } from './types'

function line(quantity: number, unitPrice: number, id = 'l1'): InvoiceLine {
  return { id, description: 'Item', quantity, unitPrice }
}

describe('invoiceLineTotal', () => {
  it('multiplica cantidad por precio unitario', () => {
    expect(invoiceLineTotal(line(3, 100))).toBe(300)
  })
})

describe('invoiceSubtotal', () => {
  it('suma los totales de todas las líneas', () => {
    expect(invoiceSubtotal([line(1, 100, 'a'), line(2, 50, 'b')])).toBe(200)
  })

  it('devuelve 0 sin líneas', () => {
    expect(invoiceSubtotal([])).toBe(0)
  })
})

describe('invoiceTaxAmount', () => {
  it('aplica IVA sobre subtotal menos descuento', () => {
    expect(invoiceTaxAmount([line(1, 1100)], 100, 21)).toBeCloseTo(210)
  })

  it('no genera IVA negativo con descuento mayor al subtotal', () => {
    expect(invoiceTaxAmount([line(1, 100)], 500, 21)).toBe(0)
  })
})

describe('invoiceTotal', () => {
  it('integra subtotal - descuento + IVA', () => {
    expect(invoiceTotal([line(1, 1100)], 100, 21)).toBeCloseTo(1210)
  })

  it('sin descuento ni IVA devuelve el subtotal', () => {
    expect(invoiceTotal([line(2, 75)], 0, 0)).toBe(150)
  })
})
