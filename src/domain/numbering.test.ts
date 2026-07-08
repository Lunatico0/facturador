import { describe, expect, it } from 'vitest'
import { nextDocumentNumber } from './numbering'

describe('nextDocumentNumber', () => {
  it('arranca en 0001 sin números previos', () => {
    expect(nextDocumentNumber('COT', [])).toBe('COT-0001')
  })

  it('incrementa a partir del máximo existente', () => {
    expect(nextDocumentNumber('FC', ['FC-0001', 'FC-0007', 'FC-0003'])).toBe('FC-0008')
  })

  it('ignora números con otro prefijo', () => {
    expect(nextDocumentNumber('FC', ['COT-0009', 'FC-0002'])).toBe('FC-0003')
  })

  it('ignora números malformados', () => {
    expect(nextDocumentNumber('FC', ['FC-abc', 'basura', 'FC-0004'])).toBe('FC-0005')
  })

  it('mantiene el padding con números grandes', () => {
    expect(nextDocumentNumber('FC', ['FC-12345'])).toBe('FC-12346')
  })
})
