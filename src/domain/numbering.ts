export function nextDocumentNumber(prefix: string, existing: string[]): string {
  const pattern = new RegExp(`^${prefix}-(\\d+)$`)
  const max = existing.reduce((acc, value) => {
    const match = pattern.exec(value)
    return match ? Math.max(acc, parseInt(match[1], 10)) : acc
  }, 0)
  return `${prefix}-${String(max + 1).padStart(4, '0')}`
}
