import type { QuoteAdjustments, QuoteSection, TaskEstimate } from './types'

export function pertEstimate(optimistic: number, likely: number, pessimistic: number): number {
  return (optimistic + 4 * likely + pessimistic) / 6
}

export function taskHours(task: TaskEstimate): number {
  return task.pert ? pertEstimate(task.optimistic, task.likely, task.pessimistic) : task.hours
}

export function taskTotal(task: TaskEstimate): number {
  return taskHours(task) * task.unitCost
}

export function sectionHours(section: QuoteSection): number {
  return section.tasks.reduce((sum, task) => sum + taskHours(task), 0)
}

export function sectionTotal(section: QuoteSection): number {
  return section.tasks.reduce((sum, task) => sum + taskTotal(task), 0)
}

export function quoteSubtotal(sections: QuoteSection[]): number {
  return sections.reduce((sum, section) => sum + sectionTotal(section), 0)
}

export function managementAmount(subtotal: number, adjustments: QuoteAdjustments): number {
  return adjustments.managementMode === 'percent'
    ? (subtotal * adjustments.managementValue) / 100
    : adjustments.managementValue
}

export function quoteBase(sections: QuoteSection[], adjustments: QuoteAdjustments): number {
  const subtotal = quoteSubtotal(sections)
  return subtotal + managementAmount(subtotal, adjustments)
}

export function quoteTaxAmount(base: number, adjustments: QuoteAdjustments): number {
  const taxable = Math.max(0, base - adjustments.discount)
  return (taxable * adjustments.taxRate) / 100
}

export function quoteTotal(sections: QuoteSection[], adjustments: QuoteAdjustments): number {
  const base = quoteBase(sections, adjustments)
  return base - adjustments.discount + quoteTaxAmount(base, adjustments)
}
