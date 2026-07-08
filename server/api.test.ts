import type { Express } from 'express'
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildApp } from './app'

let mongod: MongoMemoryServer
let app: Express

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  await mongoose.connect(mongod.getUri('cotizador-test'))
  app = buildApp()
}, 180_000)

afterAll(async () => {
  await mongoose.disconnect()
  await mongod.stop()
})

function makeQuote(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    number: 'COT-0001',
    clientId: null,
    client: { name: 'ACME', address: '', taxId: '', phone: '', email: '' },
    title: 'Proyecto de prueba',
    date: '2026-07-08',
    validity: '7 días',
    currency: 'US$',
    sections: [
      {
        id: 's1',
        name: 'Backend',
        rate: 20,
        tasks: [
          {
            id: 't1',
            name: 'Endpoints',
            note: '',
            pert: false,
            optimistic: 0,
            likely: 0,
            pessimistic: 0,
            hours: 10,
            unitCost: 20,
          },
        ],
      },
    ],
    adjustments: { managementMode: 'fixed', managementValue: 0, discount: 0, taxRate: 0 },
    status: 'draft',
    createdAt: '2026-07-08T10:00:00.000Z',
    updatedAt: '2026-07-08T10:00:00.000Z',
    ...overrides,
  }
}

describe('perfil', () => {
  it('devuelve null cuando no hay perfil (el frontend siembra el default)', async () => {
    const res = await request(app).get('/api/profile')
    expect(res.status).toBe(200)
    expect(res.body).toBeNull()
  })

  it('guarda y devuelve el perfil', async () => {
    const profile = {
      id: 'default',
      name: 'CodeByPittana.dev',
      address: '',
      taxId: '20-1',
      phone: '',
      email: '',
      website: '',
      logo: 'data:image/svg+xml;base64,abc',
      currency: 'US$',
      defaultTaxRate: 0,
      defaultValidity: '7 días',
      invoiceFootnote: '',
    }
    await request(app).put('/api/profile').send(profile).expect(200)
    const res = await request(app).get('/api/profile')
    expect(res.body.name).toBe('CodeByPittana.dev')
    expect(res.body.logo).toBe('data:image/svg+xml;base64,abc')
    expect(res.body._id).toBeUndefined()
  })
})

describe('CRUD de cotizaciones', () => {
  it('PUT crea (upsert) y GET la devuelve sin campos internos de Mongo', async () => {
    await request(app).put('/api/quotes/q1').send(makeQuote('q1')).expect(200)
    const res = await request(app).get('/api/quotes/q1')
    expect(res.body.number).toBe('COT-0001')
    expect(res.body.sections[0].tasks[0].hours).toBe(10)
    expect(res.body._id).toBeUndefined()
    expect(res.body.__v).toBeUndefined()
  })

  it('GET lista ordenada por creación descendente', async () => {
    await request(app)
      .put('/api/quotes/q2')
      .send(makeQuote('q2', { number: 'COT-0002', createdAt: '2026-07-09T10:00:00.000Z' }))
      .expect(200)
    const res = await request(app).get('/api/quotes')
    expect(res.body.map((q: { id: string }) => q.id)).toEqual(['q2', 'q1'])
  })

  it('DELETE elimina la cotización', async () => {
    await request(app).delete('/api/quotes/q2').expect(200)
    await request(app).get('/api/quotes/q2').expect(404)
  })
})

describe('trazabilidad (revisions)', () => {
  it('registra una revisión create al crear', async () => {
    const res = await request(app).get('/api/quotes/q1/revisions')
    expect(res.status).toBe(200)
    expect(res.body.length).toBe(1)
    expect(res.body[0].action).toBe('create')
    expect(res.body[0].snapshot.number).toBe('COT-0001')
  })

  it('registra una revisión update cuando el contenido cambia', async () => {
    await request(app)
      .put('/api/quotes/q1')
      .send(makeQuote('q1', { title: 'Proyecto renombrado', updatedAt: '2026-07-08T11:00:00.000Z' }))
      .expect(200)
    const res = await request(app).get('/api/quotes/q1/revisions')
    expect(res.body.length).toBe(2)
    expect(res.body[0].action).toBe('update')
    expect(res.body[0].snapshot.title).toBe('Proyecto renombrado')
  })

  it('NO registra revisión si solo cambió updatedAt (guardado sin cambios reales)', async () => {
    await request(app)
      .put('/api/quotes/q1')
      .send(makeQuote('q1', { title: 'Proyecto renombrado', updatedAt: '2026-07-08T12:00:00.000Z' }))
      .expect(200)
    const res = await request(app).get('/api/quotes/q1/revisions')
    expect(res.body.length).toBe(2)
  })

  it('registra revisión delete con el último snapshot', async () => {
    await request(app).delete('/api/quotes/q1').expect(200)
    const res = await request(app).get('/api/quotes/q1/revisions')
    expect(res.body[0].action).toBe('delete')
    expect(res.body[0].snapshot.title).toBe('Proyecto renombrado')
  })
})

describe('backup', () => {
  it('exporta todo e importa reemplazando', async () => {
    await request(app).put('/api/clients/c1').send({
      id: 'c1',
      name: 'Bruno',
      company: 'B&C',
      address: '',
      taxId: '',
      phone: '',
      email: '',
      notes: '',
      createdAt: '2026-07-08T10:00:00.000Z',
    }).expect(200)

    const backup = await request(app).get('/api/backup')
    expect(backup.body.app).toBe('cotizador')
    expect(backup.body.clients.length).toBe(1)

    await request(app).delete('/api/clients/c1').expect(200)
    expect((await request(app).get('/api/clients')).body.length).toBe(0)

    await request(app).post('/api/backup').send(backup.body).expect(200)
    const clients = await request(app).get('/api/clients')
    expect(clients.body.length).toBe(1)
    expect(clients.body[0].name).toBe('Bruno')
  })

  it('rechaza un backup inválido', async () => {
    await request(app).post('/api/backup').send({ app: 'otra-cosa' }).expect(400)
  })
})
