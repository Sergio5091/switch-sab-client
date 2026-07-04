# Switch SAB Client — Description complète du projet

> **Projet 2** — Application installée dans chaque salle de jeux physique.
> Gère les opérations quotidiennes : sessions de jeu, clients, recharges, coupons, bonus, rapports, et contrôle des TV via switch physique.

---

## 1. Vue d'ensemble

| | Détail |
|---|---|
| **Nom du dépôt** | `switch-sab-client` |
| **Rôle** | Application locale installée dans chaque salle |
| **Utilisateurs** | Admin, Gérant, Client |
| **Fonctionne hors-ligne** | ✅ (après activation de la licence) |
| **Lien avec Projet 1** | Reçoit une licence RSA signée par le Projet 1, la vérifie en local |

---

## 2. Stack technique

### Backend
| Technologie | Usage |
|---|---|
| Node.js / Express 5 | Serveur HTTP (ESM — `"type": "module"`) |
| PostgreSQL + Prisma 7 | Base de données via `@prisma/adapter-pg` |
| JWT (jsonwebtoken + bcryptjs) | Authentification |
| Socket.io 4 | Décompte temps réel des sessions |
| node-cron | Rapport journalier automatique par email |
| nodemailer | Envoi des rapports par email |
| libphonenumber-js | Normalisation des numéros de téléphone |
| Port | **3002** (défaut) |

### Frontend
| Technologie | Usage |
|---|---|
| React 18 + Vite + TypeScript | SPA |
| Wouter | Routing léger |
| Tailwind CSS v4 + shadcn/ui + Radix UI | UI components |
| Axios | Appels API avec intercepteur JWT |
| Socket.io-client | Connexion WebSocket pour les décomptes |
| Recharts | Graphiques rapports |
| react-hook-form + Zod | Formulaires avec validation |
| qrcode.react + html5-qrcode | QR codes coupons et scan |
| sonner | Notifications toast |
| Port | **5174** (Vite, `VITE_API_URL=http://localhost:3002/api`) |

---

## 3. Structure des dossiers

```
switch-sab-client/
├── backend/
│   ├── keys/
│   │   └── public-key.pem          ← Clé publique RSA (copie depuis Projet 1)
│   ├── prisma/
│   │   ├── schema.prisma            ← Schéma complet (15+ tables)
│   │   ├── seed.js                  ← Données de test
│   │   └── seed-users.sql           ← Seed SQL alternatif
│   ├── scripts/                     ← Utilitaires CLI (activation licence, diagnostic...)
│   ├── src/
│   │   ├── config/
│   │   │   ├── cors.js
│   │   │   └── logger.js
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.js   ← verifyJwt + requireRole
│   │   │   └── licence.middleware.js← Bloque les routes si licence invalide
│   │   ├── modules/
│   │   │   ├── auth/               ← Login, register, me
│   │   │   ├── admin/              ← Catégories, durées, postes, gérants, bonus, coupons, promo
│   │   │   ├── gerant/             ← Clients, sessions, recharges, rapport
│   │   │   ├── client/             ← Solde, coupons, postes disponibles, session self-service
│   │   │   ├── rapports/           ← Rapports admin avec filtres et export
│   │   │   ├── licence/            ← Activation et statut de la licence locale
│   │   │   └── setup/              ← Première installation (configuration salle)
│   │   ├── services/
│   │   │   ├── prismaClient.js
│   │   │   ├── licenceService.js   ← Vérification RSA + hash anti-fraude
│   │   │   ├── sessionScheduler.js ← Reprise des timers au redémarrage
│   │   │   ├── rapportScheduler.js ← node-cron rapport journalier
│   │   │   ├── mailService.js      ← Envoi emails via nodemailer
│   │   │   ├── rapportMailService.js
│   │   │   ├── machineId.js        ← Identifiant unique de la machine
│   │   │   └── phoneService.js     ← Normalisation numéros de téléphone
│   │   ├── switch/
│   │   │   ├── mockSwitch.js       ← Simulateur (6 postes, développement)
│   │   │   ├── switchService.js    ← Routeur automatique USB/WIFI/MOCK
│   │   │   ├── usbSwitch.js        ← Driver USB (à compléter par Sergio)
│   │   │   └── wifiSwitch.js       ← Driver WIFI (à compléter par Sergio)
│   │   ├── index.js                ← App Express avec toutes les routes
│   │   └── socket.js               ← Initialisation Socket.io + helpers d'émission
│   ├── server.js                   ← Point d'entrée HTTP
│   ├── package.json
│   └── .env
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/ui/          ← Composants shadcn/ui générés
│   │   ├── contexts/
│   │   │   ├── AppContext.tsx      ← État global (user, licence, salle...)
│   │   │   └── ThemeContext.tsx    ← Dark/light mode
│   │   ├── hooks/
│   │   │   ├── use-mobile.tsx
│   │   │   └── use-toast.ts
│   │   ├── layouts/
│   │   │   ├── AdminLayout.tsx     ← Layout avec sidebar Admin
│   │   │   └── ClientLayout.tsx    ← Layout mobile-first Client
│   │   ├── lib/
│   │   │   ├── axios.ts            ← Instance Axios (baseURL + intercepteurs)
│   │   │   └── utils.ts            ← cn() et utilitaires
│   │   ├── pages/
│   │   │   ├── login.tsx
│   │   │   ├── setup/salle.tsx     ← Première installation
│   │   │   ├── admin/              ← 12 pages Admin
│   │   │   ├── gerant/             ← 6 pages Gérant
│   │   │   └── client/             ← 4 pages Client
│   │   ├── services/
│   │   │   ├── api.ts              ← Réexporte axiosInstance
│   │   │   ├── authService.ts
│   │   │   ├── adminService.ts
│   │   │   ├── gerantService.ts
│   │   │   ├── clientService.ts
│   │   │   └── index.ts
│   │   ├── App.tsx                 ← Routing Wouter + guards par rôle
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   └── .env
│
├── node_modules/                   ← `concurrently` pour lancer les deux en parallèle
├── package.json                    ← Scripts racine (dev, start)
└── DESCRIPTION_PROJET.md           ← Ce fichier
```

---

## 4. Base de données — Schéma complet

15 modèles Prisma, tous liés à une `Salle` unique par installation.

```
Salle ──┬── User[] (ADMIN, GERANT, CLIENT)
        ├── Categorie[] ──┬── Duree[]
        │                └── Poste[]
        ├── Promo[]
        ├── ConfigBonus (1:1)
        └── Coupon[]

User ───┬── Session[] (comme client)
        ├── Session[] (comme gérant)
        ├── Credit[] (solde secondes par catégorie)
        ├── Transaction[]
        ├── Bonus (1:1)
        └── PromoCode (1:1)

Session ──── Poste, Duree, User(client), User(gérant)

LicenceLocale ← copiée depuis Projet 1, vérifiée hors-ligne
```

### Tables clés

| Table | Rôle |
|---|---|
| `Salle` | Configuration de la salle (switch, email, indicatif pays) |
| `User` | Tous les utilisateurs (ADMIN, GERANT, CLIENT) — champ `solde` pour FCFA |
| `Categorie` | PS4, PS5, XBOX… |
| `Duree` | 30min / 1H / 2H avec prix en FCFA |
| `Poste` | TV physique — statut LIBRE/OCCUPE |
| `Session` | Session de jeu active — `tempsRestant` en secondes |
| `Credit` | Solde en secondes par client et par catégorie |
| `Bonus` | Secondes de bonus accumulées (séparé du crédit) |
| `Transaction` | Historique recharges et sessions |
| `Coupon` | Code alphanumérique sans O ni 0 (ex: `A3B7-XR2P`) |
| `ConfigBonus` | Règles bonus et parrainage configurées par l'Admin |
| `PromoCode` | Code parrain unique par client |
| `LicenceLocale` | Licence copiée depuis Projet 1, avec hash anti-fraude |

---

## 5. API Routes complètes

Toutes les routes sont préfixées `/api`.

### Auth
```
POST /api/auth/login          → { email/telephone, motDePasse } → { token, user }
POST /api/auth/register       → Créer compte client self-service
GET  /api/auth/me             → Utilisateur courant (JWT requis)
```

### Admin (rôle ADMIN)
```
# Salle
GET    /api/admin/salle
PATCH  /api/admin/salle

# Dashboard
GET    /api/admin/dashboard

# Catégories
GET    /api/admin/categories
POST   /api/admin/categories
PATCH  /api/admin/categories/:id
DELETE /api/admin/categories/:id

# Durées
GET    /api/admin/categories/:id/durees
POST   /api/admin/categories/:id/durees
PATCH  /api/admin/durees/:id
DELETE /api/admin/durees/:id

# Postes TV
GET    /api/admin/postes
POST   /api/admin/postes
PATCH  /api/admin/postes/:id
DELETE /api/admin/postes/:id

# Gérants
GET    /api/admin/gerants
POST   /api/admin/gerants
PATCH  /api/admin/gerants/:id

# Config bonus
GET    /api/admin/bonus/config
POST   /api/admin/bonus/config
PATCH  /api/admin/bonus/config

# Config promo (parrainage)
GET    /api/admin/promo/config
PATCH  /api/admin/promo/config

# Coupons
GET    /api/admin/coupons
POST   /api/admin/coupons/generer   → { nombre, valeur }
GET    /api/admin/coupons/pdf       → PDF 40 coupons / A4

# Promotions SMS/WhatsApp
GET    /api/admin/promotions
POST   /api/admin/promotions
POST   /api/admin/promotions/:id/envoyer
```

### Gérant (rôle GERANT)
```
# Clients
GET    /api/gerant/clients
POST   /api/gerant/clients
GET    /api/gerant/clients/:id
PATCH  /api/gerant/clients/:id

# Recharges
POST   /api/gerant/recharges             → Recharger le compte d'un client
GET    /api/gerant/recharges/en-attente  → Recharges client à valider
POST   /api/gerant/recharges/:id/valider → Valider après encaissement cash

# Sessions
POST   /api/gerant/sessions              → Démarrer une session (allume TV)
POST   /api/gerant/sessions/:id/arreter  → Arrêter avant la fin (éteint TV)

# Coupons
POST   /api/gerant/coupons/utiliser      → Client utilise un coupon

# Rapport du jour
GET    /api/gerant/rapport/jour
```

### Client (rôle CLIENT)
```
GET    /api/client/solde                 → Solde monétaire + crédits par catégorie + bonus
POST   /api/client/coupons/activer       → Utiliser un coupon (crédite solde FCFA)
GET    /api/client/postes-disponibles    → Postes libres par catégorie
POST   /api/client/sessions              → Démarrer session self-service
GET    /api/client/mon-code-promo        → Code parrain personnel
GET    /api/client/session-active        → Session en cours
```

### Rapports (rôle ADMIN)
```
GET    /api/rapports?debut=&fin=&gerantId=&posteId=&clientId=&periode=
GET    /api/rapports/export              → Export CSV/PDF
```

### Licence
```
GET    /api/licence/statut               → Jours restants + statut
POST   /api/licence/activer              → Installer une licence JSON depuis Projet 1
```

### Setup (première installation)
```
POST   /api/setup/salle                  → Configurer la salle (nom, email, switchType...)
GET    /api/setup/statut                 → Salle déjà configurée ?
```

---

## 6. Système de licence hors-ligne

### Comment ça fonctionne

```
Projet 1 (cloud)                    Projet 2 (local)
────────────────                    ────────────────
Clé privée RSA                      keys/public-key.pem (copie)
  │                                    │
  ├── Signe le payload:                └── Vérifie la signature
  │   licenceId|salleId|               └── Calcule le hash anti-fraude
  │   machineId|issuedAt|expiresAt     └── Vérifie l'expiration
  │
  └── Génère licence.json ─────────► POST /api/licence/activer
```

### Payload signé
```
licenceId|salleId|machineId|issuedAt|expiresAt
```

### Double protection anti-fraude
1. **Signature RSA** : vérifie que la licence a bien été émise par le Projet 1
2. **Hash SHA-256** : vérifie que personne n'a modifié la ligne en base de données

### Au démarrage du serveur
```javascript
await checkLicenceAtStartup()  // vérifie licence + hash en base
// Si invalide → bloque toutes les routes (sauf /auth/login et /licence/*)
```

### Middleware `requireLicence`
Routes exemptées de la vérification licence :
- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET|POST /api/licence/*`
- `GET|POST /api/setup/*`

---

## 7. Sessions temps réel — Socket.io

### Flux d'une session

```
Gérant POST /api/gerant/sessions
  │
  ├── Vérifie que le client a le crédit catégorie
  ├── Déduit les secondes du Credit
  ├── Crée Session (statut ACTIVE)
  ├── Marque Poste (statut OCCUPE)
  ├── allumerPoste(posteId) via switchService
  ├── Lance le décompte (setInterval chaque seconde)
  │     → emit 'session:tick' { sessionId, posteId, tempsRestant }
  └── À tempsRestant = 0 :
        → emit 'session:end' { sessionId, posteId }
        → eteindrePoste(posteId)
        → Session statut TERMINEE
        → Poste statut LIBRE
        → Calcul et attribution bonus
```

### Événements WebSocket

| Événement | Sens | Données |
|---|---|---|
| `session:start` | serveur → client | `{ sessionId, posteId, tempsRestant }` |
| `session:tick` | serveur → client | `{ sessionId, posteId, tempsRestant }` |
| `session:end` | serveur → client | `{ sessionId, posteId }` |
| `session:stop` | serveur → client | `{ sessionId, posteId, tempsRestantConserve }` |
| `session:subscribe` | client → serveur | `{ sessionId }` |
| `session:unsubscribe` | client → serveur | `{ sessionId }` |

### Reprise au redémarrage
Au redémarrage du serveur, `sessionScheduler.js` :
1. Cherche toutes les `Session` avec `statut = 'ACTIVE'` en base
2. Calcule le délai restant (`fin - now`)
3. Si délai > 0 : replanifie le timer
4. Si délai ≤ 0 : termine la session immédiatement

---

## 8. Switch physique — Architecture IoT

### Pattern stratégie

```javascript
// switchService.js lit salle.switchType en BDD et route automatiquement
const getDriver = async () => {
  const salle = await prisma.salle.findFirst()
  switch (salle.switchType) {
    case 'USB':  return usbSwitch
    case 'WIFI': return wifiSwitch
    default:     return mockSwitch   // développement
  }
}

// Alessio appelle uniquement ces deux fonctions :
await allumerPoste(posteId)
await eteindrePoste(posteId)
```

### État actuel des drivers

| Driver | Fichier | Statut |
|---|---|---|
| Mock | `mockSwitch.js` | ✅ Opérationnel (6 postes simulés) |
| USB | `usbSwitch.js` | ⏳ À compléter par Sergio |
| WIFI | `wifiSwitch.js` | ⏳ À compléter par Sergio |

### Interface à implémenter (Phase 6)
```javascript
// Chaque driver doit exporter :
export const allumerPoste  = async (posteId) => { ... }
export const eteindrePoste = async (posteId) => { ... }
export const getStatutPoste = async (posteId) => { ... }
export const getAllStatuts  = async () => { ... }
```

---

## 9. Système des 3 soldes client

Chaque client possède 3 compteurs séparés :

| Compteur | Table | Unité | Usage |
|---|---|---|---|
| **Solde monétaire** | `User.solde` | FCFA | Alimenté par coupons uniquement |
| **Crédit par catégorie** | `Credit` | Secondes | Alimenté par le gérant (recharge) |
| **Bonus** | `Bonus` | Secondes | Calculé automatiquement après sessions |

### Règle bonus
Configurée par l'Admin dans `ConfigBonus` :
- `ratioSecondes` : secondes bonus gagnées par heure jouée
- `seuilDeblocage` : secondes à accumuler avant que le bonus devienne disponible
- `validitejours` : délai d'inactivité avant remise à zéro (30j par défaut)

### Parrainage
Configuré dans `ConfigBonus` :
- `bonusParrain` : FCFA crédités au parrain à l'inscription d'un filleul
- `bonusFilleul` : FCFA crédités au nouveau client qui utilise un code parrain
- Chaque client a un `PromoCode` unique (son code parrain à partager)

---

## 10. Rapport journalier automatique

Le scheduler `rapportScheduler.js` tourne avec `node-cron` et envoie chaque matin (ex: 8h) un résumé de la veille par email au propriétaire de la salle (`Salle.email`).

Contenu du rapport :
- Sessions du jour : nombre, durée totale, montant total
- Répartition par catégorie (PS4, PS5, XBOX…)
- Gérant le plus actif
- Nouveaux clients

---

## 11. Frontend — Pages et navigation

### Routing par rôle

```
/login                    → LoginGuard (redirige si déjà connecté)
/setup/salle              → Première installation (Admin uniquement, si pas configuré)

/admin/dashboard          → Dashboard Admin (stats salle)
/admin/categories         → Gestion catégories
/admin/categories/:id/durees → Durées et prix
/admin/postes             → Postes TV
/admin/gerants            → Gérants
/admin/bonus              → Config système bonus
/admin/promo              → Config parrainage
/admin/coupons            → Génération coupons
/admin/promotions         → Envoi SMS/WhatsApp
/admin/rapports           → Rapports filtrables
/admin/salle              → Paramètres salle
/admin/licence            → Activation licence (accessible même si licence invalide)

/gerant/dashboard         → Grille des postes (vue principale)
/gerant/session/new       → Démarrer une session
/gerant/clients           → Gestion clients
/gerant/recharges         → Valider recharges en attente
/gerant/coupons           → Utiliser un coupon
/gerant/rapport           → Rapport du jour

/client/home              → Postes disponibles + solde
/client/session           → Session en cours (décompte)
/client/coupon            → Saisir un code coupon
```

### Protections des routes

```typescript
// ProtectedRoute vérifie :
// 1. currentUser non null (sinon → /login)
// 2. currentUser.role dans les rôles autorisés
// 3. licenceStatut === 'ACTIVE' (sinon → /admin/licence)

// Cas particulier : FraudeAlert
// Si hash en base != hash calculé → overlay bloquant avec alerte fraude
```

### AppContext

Le contexte global gère :
- `currentUser` : utilisateur connecté
- `licenceStatut` : statut et jours restants
- `salleConfiguree` : boolean première installation
- `fraudeDetectee` + `messageFraude` : overlay anti-fraude
- `isLoading` : état d'initialisation

---

## 12. Variables d'environnement

### Backend (`backend/.env`)
```env
PORT=3002
NODE_ENV=development
FRONTEND_URL=http://localhost:5174
DATABASE_URL=postgresql://user:pass@localhost:5432/switchsab_app
JWT_SECRET=<secret_fort>
JWT_EXPIRES_IN=7d
LICENCE_PUBLIC_KEY_PATH=./keys/public-key.pem

# Switch IoT
USE_MOCK_SWITCH=true   # forcer le mock en développement

# Email rapports
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<email>
SMTP_PASS=<mot_de_passe>
SMTP_FROM=Switch SAB <email>
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL=http://localhost:3002/api
```

---

## 13. Lancer le projet

### Depuis la racine `switch-sab-client/`
```bash
npm run dev        # Lance backend (3002) + frontend (5174) en parallèle via concurrently
npm run start      # Mode production
```

### Séparément
```bash
# Backend
cd backend
npm run dev        # nodemon server.js

# Frontend
cd frontend
npm run dev        # Vite HMR
```

### Première installation
1. Configurer `backend/.env` avec `DATABASE_URL`
2. `cd backend && npx prisma migrate dev`
3. `cd backend && npm run seed`
4. Lancer le projet
5. Se connecter en tant qu'Admin
6. Aller sur `/setup/salle` pour configurer la salle
7. Activer la licence (fichier JSON généré par le Projet 1) sur `/admin/licence`

### Comptes seed par défaut
```
Admin   → admin@switchsab.local   / admin123
Gérant1 → gerant1@switchsab.local / gerant123
Client  → kofi / client123
```

---

## 14. Différences avec le Projet 1

| Aspect | Projet 1 (`switch-sab`) | Projet 2 (`switch-sab-client`) |
|---|---|---|
| Rôles | Super Admin uniquement | Admin, Gérant, Client |
| Tables BDD | 3 (Salle, Licence, User) | 15+ |
| Port backend | 3000 | 3002 |
| Port frontend | 5173 | 5174 |
| Clé RSA | Privée + publique (génère les licences) | Publique seulement (vérifie) |
| Internet | Requis | Non requis après licence |
| Socket.io | ❌ | ✅ (décompte sessions) |
| IoT switch | ❌ | ✅ (USB/WIFI/Mock) |
| node-cron | ❌ | ✅ (rapports journaliers) |
| Déploiement | Cloud (Render/Vercel) | Local (salle physique) |
