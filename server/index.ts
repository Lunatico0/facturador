import 'dotenv/config'
import mongoose from 'mongoose'
import { buildApp } from './app'

const uri = process.env.MONGO_URI
if (!uri) {
  console.error('Falta MONGO_URI. Copiá .env.example a .env y pegá tu connection string.')
  process.exit(1)
}

const port = Number(process.env.PORT ?? 4000)

mongoose
  .connect(uri)
  .then(() => {
    buildApp().listen(port, () => {
      console.log(`API del Cotizador escuchando en http://localhost:${port}`)
    })
  })
  .catch((error) => {
    console.error('No se pudo conectar a MongoDB:', error.message)
    process.exit(1)
  })
