import path from 'node:path'
import { defineConfig } from 'prisma/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { readFileSync } from 'fs'

const envFile = readFileSync(path.join(process.cwd(), '.env'), 'utf-8')
const env = {}
envFile.split('\n').forEach(line => {
  const trimmed = line.trim()
  if (trimmed && !trimmed.startsWith('#')) {
    const idx = trimmed.indexOf('=')
    if (idx > -1) {
      env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim()
    }
  }
})

const connectionString = env.DATABASE_URL

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
