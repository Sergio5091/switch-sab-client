import path from 'node:path'
import { defineConfig } from 'prisma/config'
import { PrismaPg } from '@prisma/adapter-pg'
import dotenv from 'dotenv'

<<<<<<< HEAD
// Charger .env en local (ignoré sur Render car les vars sont injectées directement)
=======
// Charger .env en local (ignoré sur Render — vars injectées directement)
>>>>>>> origin/dev/ok
dotenv.config()

const connectionString = process.env.DATABASE_URL

export default defineConfig({
  earlyAccess: true,
  schema: path.join('prisma', 'schema.prisma'),
  datasource: { url: connectionString },
  migrate: {
    async adapter() {
      // Le schéma PostgreSQL est passé via search_path dans l'URL
      // ex: ?schema=app2&sslmode=require
      return new PrismaPg({ connectionString })
    }
  },
  studio: {
    async adapter() {
      return new PrismaPg({ connectionString })
    }
  }
})
