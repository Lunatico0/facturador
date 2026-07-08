import express, { Router } from 'express'
import type { Express, NextFunction, Request, Response } from 'express'
import type { Model } from 'mongoose'
import { Client, Invoice, Profile, Quote, Revision } from './models'
import { contentChanged, recordRevision } from './revisions'

/* eslint-disable @typescript-eslint/no-explicit-any */

function crudRouter(model: Model<any>, entity: string): Router {
  const router = Router()

  router.get('/', async (_req, res) => {
    const docs = await model.find().sort({ createdAt: -1 })
    res.json(docs)
  })

  router.get('/:id', async (req, res) => {
    const doc = await model.findOne({ id: req.params.id })
    if (!doc) return res.status(404).json({ error: `${entity} no encontrado` })
    res.json(doc)
  })

  router.get('/:id/revisions', async (req, res) => {
    const revisions = await Revision.find({ entity, entityId: req.params.id }).sort({ at: -1, _id: -1 })
    res.json(revisions)
  })

  router.put('/:id', async (req, res) => {
    const body = { ...req.body, id: req.params.id }
    const existing = await model.findOne({ id: req.params.id })
    if (!existing) {
      const created = await model.create(body)
      await recordRevision(entity, req.params.id, 'create', created.toJSON())
      return res.json(created)
    }
    if (!contentChanged(existing.toJSON(), body)) return res.json(existing)
    existing.set(body)
    await existing.save()
    await recordRevision(entity, req.params.id, 'update', existing.toJSON())
    res.json(existing)
  })

  router.delete('/:id', async (req, res) => {
    const existing = await model.findOne({ id: req.params.id })
    if (!existing) return res.status(404).json({ error: `${entity} no encontrado` })
    await model.deleteOne({ id: req.params.id })
    await recordRevision(entity, req.params.id, 'delete', existing.toJSON())
    res.json({ ok: true })
  })

  return router
}

export function buildApp(): Express {
  const app = express()
  app.use(express.json({ limit: '5mb' }))

  app.get('/api/profile', async (_req, res) => {
    const profile = await Profile.findOne({ id: 'default' })
    res.json(profile ?? null)
  })

  app.put('/api/profile', async (req, res) => {
    const body = { ...req.body, id: 'default' }
    const existing = await Profile.findOne({ id: 'default' })
    if (!existing) {
      const created = await Profile.create(body)
      await recordRevision('profile', 'default', 'create', created.toJSON())
      return res.json(created)
    }
    if (!contentChanged(existing.toJSON(), body)) return res.json(existing)
    existing.set(body)
    await existing.save()
    await recordRevision('profile', 'default', 'update', existing.toJSON())
    res.json(existing)
  })

  app.use('/api/clients', crudRouter(Client, 'client'))
  app.use('/api/quotes', crudRouter(Quote, 'quote'))
  app.use('/api/invoices', crudRouter(Invoice, 'invoice'))

  app.get('/api/backup', async (_req, res) => {
    res.json({
      app: 'cotizador',
      version: 2,
      exportedAt: new Date().toISOString(),
      profile: await Profile.find(),
      clients: await Client.find(),
      quotes: await Quote.find(),
      invoices: await Invoice.find(),
      revisions: await Revision.find(),
    })
  })

  app.post('/api/backup', async (req, res) => {
    const data = req.body
    if (data?.app !== 'cotizador' || !Array.isArray(data.quotes)) {
      return res.status(400).json({ error: 'El archivo no es un backup válido del Cotizador.' })
    }
    await Promise.all([
      Profile.deleteMany({}),
      Client.deleteMany({}),
      Quote.deleteMany({}),
      Invoice.deleteMany({}),
      Revision.deleteMany({}),
    ])
    await Profile.insertMany(data.profile ?? [])
    await Client.insertMany(data.clients ?? [])
    await Quote.insertMany(data.quotes ?? [])
    await Invoice.insertMany(data.invoices ?? [])
    await Revision.insertMany(data.revisions ?? [])
    res.json({ ok: true })
  })

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err)
    res.status(500).json({ error: err.message })
  })

  return app
}
