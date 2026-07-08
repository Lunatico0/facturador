/**
 * Levanta la API con un MongoDB efímero en memoria.
 * Útil para probar la app sin tocar la base real: npm run dev:demo
 * Los datos se pierden al cerrar el proceso.
 */
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import { buildApp } from './app'

const port = Number(process.env.PORT ?? 4000)

const mongod = await MongoMemoryServer.create()
await mongoose.connect(mongod.getUri('cotizador-demo'))

buildApp().listen(port, () => {
  console.log(`API (Mongo EN MEMORIA — datos efímeros) en http://localhost:${port}`)
})
