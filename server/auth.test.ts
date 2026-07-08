import type { Express } from 'express'
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildApp } from './app.js'

let mongod: MongoMemoryServer
let app: Express

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  await mongoose.connect(mongod.getUri('cotizador-auth-test'))
  app = buildApp()
}, 180_000)

afterAll(async () => {
  await mongoose.disconnect()
  await mongod.stop()
})

describe('login', () => {
  it('rechaza el acceso a la API sin token', async () => {
    await request(app).get('/api/quotes').expect(401)
  })

  it('rechaza una password incorrecta', async () => {
    await request(app).post('/api/auth/login').send({ password: 'incorrecta' }).expect(401)
  })

  it('acepta la password inicial 1234 y devuelve un token', async () => {
    const res = await request(app).post('/api/auth/login').send({ password: '1234' }).expect(200)
    expect(typeof res.body.token).toBe('string')
    expect(res.body.token.length).toBeGreaterThan(30)
  })

  it('con token válido la API responde', async () => {
    const { token } = (await request(app).post('/api/auth/login').send({ password: '1234' })).body
    await request(app).get('/api/quotes').set('Authorization', `Bearer ${token}`).expect(200)
  })

  it('con token inventado responde 401', async () => {
    await request(app).get('/api/quotes').set('Authorization', 'Bearer token-falso').expect(401)
  })
})

describe('cambio de password', () => {
  it('rechaza el cambio si la password actual no coincide', async () => {
    const { token } = (await request(app).post('/api/auth/login').send({ password: '1234' })).body
    await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'incorrecta', newPassword: 'nueva-segura' })
      .expect(401)
  })

  it('rechaza passwords nuevas demasiado cortas', async () => {
    const { token } = (await request(app).post('/api/auth/login').send({ password: '1234' })).body
    await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: '1234', newPassword: 'ab' })
      .expect(400)
  })

  it('cambia la password, revoca las sesiones viejas y devuelve token nuevo', async () => {
    const oldToken = (await request(app).post('/api/auth/login').send({ password: '1234' })).body.token
    const otherSession = (await request(app).post('/api/auth/login').send({ password: '1234' })).body.token

    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${oldToken}`)
      .send({ currentPassword: '1234', newPassword: 'password-nueva' })
      .expect(200)

    // Las sesiones anteriores quedaron revocadas
    await request(app).get('/api/quotes').set('Authorization', `Bearer ${oldToken}`).expect(401)
    await request(app).get('/api/quotes').set('Authorization', `Bearer ${otherSession}`).expect(401)

    // El token devuelto por el cambio sigue siendo válido (no te desloguea a vos)
    await request(app).get('/api/quotes').set('Authorization', `Bearer ${res.body.token}`).expect(200)

    // La password vieja ya no sirve; la nueva sí
    await request(app).post('/api/auth/login').send({ password: '1234' }).expect(401)
    await request(app).post('/api/auth/login').send({ password: 'password-nueva' }).expect(200)
  })
})

describe('logout', () => {
  it('invalida el token de la sesión', async () => {
    const { token } = (await request(app).post('/api/auth/login').send({ password: 'password-nueva' })).body
    await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${token}`).expect(200)
    await request(app).get('/api/quotes').set('Authorization', `Bearer ${token}`).expect(401)
  })
})
