import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { Router } from 'express'
import type { NextFunction, Request, Response } from 'express'
import mongoose, { Schema } from 'mongoose'

const scryptAsync = promisify(scrypt) as (password: string, salt: string, keylen: number) => Promise<Buffer>

const DEFAULT_PASSWORD = '1234'
const SESSION_DAYS = 30
const MIN_PASSWORD_LENGTH = 4

const Auth = mongoose.model(
  'Auth',
  new Schema({
    id: { type: String, required: true, unique: true },
    salt: { type: String, required: true },
    hash: { type: String, required: true },
    updatedAt: { type: String, required: true },
  }),
)

const Session = mongoose.model(
  'Session',
  new Schema({
    token: { type: String, required: true, unique: true },
    createdAt: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  }),
)

async function hashPassword(password: string): Promise<{ salt: string; hash: string }> {
  const salt = randomBytes(16).toString('hex')
  const hash = (await scryptAsync(password, salt, 64)).toString('hex')
  return { salt, hash }
}

async function verifyPassword(password: string, salt: string, expectedHash: string): Promise<boolean> {
  const hash = await scryptAsync(password, salt, 64)
  const expected = Buffer.from(expectedHash, 'hex')
  return hash.length === expected.length && timingSafeEqual(hash, expected)
}

/** Crea el registro de auth con la password inicial si todavía no existe. */
async function ensureAuth() {
  const existing = await Auth.findOne({ id: 'auth' })
  if (existing) return existing
  const { salt, hash } = await hashPassword(DEFAULT_PASSWORD)
  return Auth.create({ id: 'auth', salt, hash, updatedAt: new Date().toISOString() })
}

async function createSession(): Promise<string> {
  const token = randomBytes(32).toString('hex')
  await Session.create({
    token,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000),
  })
  return token
}

function bearerToken(req: Request): string | null {
  const header = req.headers.authorization
  return header?.startsWith('Bearer ') ? header.slice(7) : null
}

export async function requireSession(req: Request, res: Response, next: NextFunction) {
  const token = bearerToken(req)
  if (!token) return res.status(401).json({ error: 'Sesión requerida' })
  const session = await Session.findOne({ token })
  if (!session || session.expiresAt.getTime() < Date.now()) {
    return res.status(401).json({ error: 'Sesión inválida o vencida' })
  }
  next()
}

export function authRouter(): Router {
  const router = Router()

  router.post('/login', async (req, res) => {
    const { password } = req.body ?? {}
    const auth = await ensureAuth()
    if (typeof password !== 'string' || !(await verifyPassword(password, auth.salt, auth.hash))) {
      return res.status(401).json({ error: 'Password incorrecta' })
    }
    res.json({ token: await createSession() })
  })

  router.post('/logout', requireSession, async (req, res) => {
    await Session.deleteOne({ token: bearerToken(req) })
    res.json({ ok: true })
  })

  router.post('/change-password', requireSession, async (req, res) => {
    const { currentPassword, newPassword } = req.body ?? {}
    if (typeof newPassword !== 'string' || newPassword.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ error: `La password nueva debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres` })
    }
    const auth = await ensureAuth()
    if (typeof currentPassword !== 'string' || !(await verifyPassword(currentPassword, auth.salt, auth.hash))) {
      return res.status(401).json({ error: 'La password actual no coincide' })
    }
    const { salt, hash } = await hashPassword(newPassword)
    auth.set({ salt, hash, updatedAt: new Date().toISOString() })
    await auth.save()
    // Revocar TODAS las sesiones: si la password se filtró, acá muere el acceso ajeno
    await Session.deleteMany({})
    res.json({ token: await createSession() })
  })

  return router
}
