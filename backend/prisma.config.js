import path from 'node:path'
import { defineConfig } from 'prisma/config'
import { PrismaPg } from '@prisma/adapter-pg'
import dotenv from 'dotenv'

// Charger .env en local (ignoré sur Render — vars injectées directement)
dotenv.config()

const connectionString = process.env.DATABASE_URL

export default defineConfig({
  earlyAccess: true,
  schema: path.join('prisma', 'schema.prisma'),
  datasource: { url: connectionString },
  migrate: {
    async adapter() {
      return new PrismaPg({ connectionString })
    }
  },
  studio: {
    async adapter() {
      return new PrismaPg({ connectionString })
    }
  }
})
