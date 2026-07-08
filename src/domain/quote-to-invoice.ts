import { managementAmount, quoteSubtotal, sectionHours, sectionTotal } from './quote-calculations'
import type { InvoiceLine, QuoteAdjustments, QuoteSection } from './types'

export function quoteToInvoiceLines(
  sections: QuoteSection[],
  adjustments: QuoteAdjustments,
  nextId: () => string,
): InvoiceLine[] {
  const lines: InvoiceLine[] = []

  for (const section of sections) {
    const hours = sectionHours(section)
    const total = sectionTotal(section)
    if (hours === 0 && total === 0) continue
    lines.push({
      id: nextId(),
      description: section.name,
      quantity: hours > 0 ? hours : 1,
      unitPrice: hours > 0 ? total / hours : total,
    })
  }

  const management = managementAmount(quoteSubtotal(sections), adjustments)
  if (management > 0) {
    lines.push({ id: nextId(), description: 'Costos de gestión', quantity: 1, unitPrice: management })
  }

  return lines
}
