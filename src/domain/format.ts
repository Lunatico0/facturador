export function formatMoney(amount: number, symbol: string): string {
  const rounded = Math.round(amount * 100) / 100
  return `${symbol} ${rounded.toLocaleString('es-AR', { maximumFractionDigits: 2 })}`
}

export function formatHours(hours: number): string {
  const rounded = Math.round(hours * 100) / 100
  return rounded.toLocaleString('es-AR', { maximumFractionDigits: 2 })
}
