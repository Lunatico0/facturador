import { describe, expect, it } from 'vitest'
import { formatHours, formatMoney } from './format'

describe('formatMoney', () => {
  it('antepone el símbolo y separa miles estilo es-AR', () => {
    expect(formatMoney(1234.5, 'US$')).toBe('US$ 1.234,5')
  })

  it('redondea a dos decimales', () => {
    expect(formatMoney(10.006, '$')).toBe('$ 10,01')
  })

  it('maneja cero', () => {
    expect(formatMoney(0, '$')).toBe('$ 0')
  })
})

describe('formatHours', () => {
  it('redondea a dos decimales', () => {
    expect(formatHours(5.3333333)).toBe('5,33')
  })

  it('no muestra decimales innecesarios', () => {
    expect(formatHours(8)).toBe('8')
  })
})
