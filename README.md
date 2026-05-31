# Switch SAB Local

Application de gestion de salle de jeux — Admin / Gérant / Client.

## Stack
- Backend : Node.js + Express 5 (ESM) + Prisma 7 + PostgreSQL
- Frontend : React 18 + TypeScript + Vite + Tailwind CSS 3

## Lancer le projet

```bash
# Terminal 1 — Backend
cd backend
npx prisma generate
npm run seed
npm run dev

# Terminal 2 — Frontend
cd frontend
npm run dev
```

- Backend  → http://localhost:3000
- Frontend → http://localhost:5173
