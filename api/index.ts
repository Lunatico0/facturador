/**
 * Entrada serverless para Vercel: envuelve la app Express.
 * La conexión a Mongo se cachea a nivel de módulo — las invocaciones
 * siguientes de la misma instancia la reutilizan en lugar de reconectar.
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import mongoose from 'mongoose'
import { buildApp } from '../server/app'

const app = buildApp()
let connection: Promise<typeof mongoose> | null = null

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const uri = process.env.MONGO_URI
  if (!uri) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Falta configurar MONGO_URI en las variables de entorno de Vercel.' }))
    return
  }
  connection ??= mongoose.connect(uri)
  await connection
  app(req, res)
}
