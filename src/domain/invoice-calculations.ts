import type { InvoiceLine } from './types'

export function invoiceLineTotal(line: InvoiceLine): number {
  return line.quantity * line.unitPrice
}

export function invoiceSubtotal(lines: InvoiceLine[]): number {
  return lines.reduce((sum, line) => sum + invoiceLineTotal(line), 0)
}

export function invoiceTaxAmount(lines: InvoiceLine[], discount: number, taxRate: number): number {
  const taxable = Math.max(0, invoiceSubtotal(lines) - discount)
  return (taxable * taxRate) / 100
}

export function invoiceTotal(lines: InvoiceLine[], discount: number, taxRate: number): number {
  return invoiceSubtotal(lines) - discount + invoiceTaxAmount(lines, discount, taxRate)
}
