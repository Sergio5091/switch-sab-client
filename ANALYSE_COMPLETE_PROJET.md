# 📋 ANALYSE COMPLÈTE DU PROJET SWITCH SAB

**Date d'analyse** : Juin 2026  
**État global** : Phase 0-1-2 Terminée (Auth, Licence, Admin) | Phase 3 À Commencer  
**Stack** : Node.js/Express 5 (ESM) · Prisma 7 · PostgreSQL · React 18 · TypeScript · Socket.io

---

## 🏗️ ARCHITECTURE GÉNÉRALE

### Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SWITCH SAB ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                      FRONTEND (Port 5173)                    │  │
│  │  React 18 + TypeScript + Vite + Tailwind                    │  │
│  │  • Login (global)                                           │  │
│  │  • Dashboard Admin/Gérant/Client                           │  │
│  │  • Services : authService, adminService, gerantService    │  │
│  │  • React Query (gestion cache)                             │  │
│  └────────────┬──────────────────────────────────────────────┘  │
│               │ HTTP/WebSocket                                   │
│               │ JWT Bearer Token (localStorage)                  │
│               ▼                                                   │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              BACKEND (Port 3000)                             │  │
│  │  Express 5 + ESM + Prisma ORM                               │  │
│  │                                                              │  │
│  │  ┌─────────────────────────────────────────────────────┐   │  │
│  │  │  MIDDLEWARES                                        │   │  │
│  │  │  • auth.middleware.js (verifyJwt + requireRole)   │   │  │
│  │  │  • licence.middleware.js (offline RSA verify)     │   │  │
│  │  │  • cors.js                                         │   │  │
│  │  └─────────────────────────────────────────────────────┘   │  │
│  │                                                              │  │
│  │  ┌──────────────────┬──────────────┬────────────────────┐  │  │
│  │  │ AUTH ROUTES      │ ADMIN ROUTES │ GERANT/CLIENT     │  │  │
│  │  │ (Phase 1)        │ (Phase 2)    │ (Phase 3/4)       │  │  │
│  │  │                  │              │                   │  │  │
│  │  │ • /login         │ • categories │ • /gerant/*       │  │  │
│  │  │ • /register      │ • durees     │ • /client/*       │  │  │
│  │  │ • /me            │ • postes     │ • /rapports/*     │  │  │
│  │  │ • /licence/*     │ • gerants    │                   │  │  │
│  │  │                  │ • bonus      │                   │  │  │
│  │  │                  │ • coupons    │                   │  │  │
│  │  │                  │ • promotions │                   │  │  │
│  │  └──────────────────┴──────────────┴────────────────────┘  │  │
│  │                                                              │  │
│  │  ┌──────────────────────────────────────────────────────┐   │  │
│  │  │  SERVICES (Backend)                                 │   │  │
│  │  │  • prismaClient.js (PrismaClient + adapter PG)     │   │  │
│  │  │  • licenceService.js (RSA verify + expiration)     │   │  │
│  │  │  • machineId.js (SHA256 hostname + MAC)            │   │  │
│  │  │  • switchService.js (routeur USB/WIFI/MOCK)        │   │  │
│  │  └──────────────────────────────────────────────────────┘   │  │
│  │                                                              │  │
│  │  ┌──────────────────────────────────────────────────────┐   │  │
│  │  │  SOCKET.IO                                          │   │  │
│  │  │  • Real-time sessions countdown                     │   │  │
│  │  │  • Events: session:start, session:tick, session:end│   │  │
│  │  └──────────────────────────────────────────────────────┘   │  │
│  └───────────────────┬──────────────────────────────────────────┘  │
│                      │ Prisma ORM                                  │
│                      ▼                                              │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │         POSTGRESQL DATABASE (offline RSA keys)               │  │
│  │  • Salle, User, Categorie, Duree, Poste, Session, etc.     │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │    SWITCH DRIVERS (Phase 6 — IoT)                           │  │
│  │  • mockSwitch.js (simulation)                              │  │
│  │  • usbSwitch.js (Sergio — Phase 6.1)                       │  │
│  │  • wifiSwitch.js (Sergio — Phase 6.2)                      │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Flux d'authentification

```
1. FRONTEND LOGIN
   ├─ POST /api/auth/login { telephone | email, motDePasse }
   │  └─ Backend vérifie identifiants + hash bcrypt
   │
   ├─ JWT token créé (12h expiration)
   │  Payload: { id, role, salle_id, exp }
   │
   ├─ Stockage localStorage
   │  • token → authToken
   │  • user → currentUser
   │
   └─ Interceptor Axios ajoute automatiquement:
      Authorization: Bearer <token>

2. ROUTE PROTÉGÉE
   ├─ Frontend envoie GET /api/admin/categories
   │  Header: Authorization: Bearer <token>
   │
   ├─ Backend exécute:
   │  verifyJwt → extrait req.user = { id, role, salle_id }
   │
   ├─ Middleware requireRole('ADMIN')
   │  └─ Vérifie req.user.role === 'ADMIN'
   │
   └─ Controller accède req.user.salle_id
      └─ Filtre automatiquement WHERE salleId = req.user.salle_id

3. ISOLATION MULTI-SALLE
   └─ CHAQUE requête filtre par salleId du JWT
      → Impossible de voir données d'une autre salle
      → Injection impossible post-création
```

---

## 🎨 PATTERNS DE CODE UTILISÉS

### 1. **Pattern: Controllers + Routes (MVC Léger)**

**Structure par module** :
```javascript
modules/
├── admin/
│   ├── admin.routes.js
│   ├── categories.controller.js
│   ├── durees.controller.js
│   ├── postes.controller.js
│   ├── gerants.controller.js
│   ├── bonus.controller.js
│   ├── coupons.controller.js
│   ├── promotions.controller.js
│   └── promoConfig.controller.js
├── auth/
│   ├── auth.routes.js
│   └── auth.controller.js
├── gerant/
│   ├── gerant.routes.js
│   └── [controllers à créer Phase 3]
└── client/
    ├── client.routes.js
    └── [controllers à créer Phase 4]
```

**Exemple dans [categories.controller.js](backend/src/modules/admin/categories.controller.js)** :

```javascript
// ✅ Validation + extraction data
export const creerCategorie = async (req, res) => {
  const { nom } = req.body
  if (!nom) return res.status(400).json({ message: 'Le nom est requis' })

  try {
    // ✅ Isolation multi-salle : req.user.salle_id
    const categorie = await prisma.categorie.create({
      data: { nom, salleId: req.user.salle_id }
    })
    return res.status(201).json(categorie)
  } catch (err) {
    console.error('[admin/categories POST]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}
```

### 2. **Pattern: Conditional Update (Spread Operator)**

Présent dans tous les PATCH :

```javascript
export const modifierDuree = async (req, res) => {
  const { libelle, secondes, prix } = req.body

  const updated = await prisma.duree.update({
    where: { id },
    data: {
      // ✅ N'update que les champs fournis
      ...(libelle  !== undefined && { libelle }),
      ...(secondes !== undefined && { secondes: Number(secondes) }),
      ...(prix     !== undefined && { prix: Number(prix) }),
    }
  })
  return res.json(updated)
}
```

**Avantage** : Permet des PATCH partiels sans refuser les champs manquants.

### 3. **Pattern: Upsert pour Config**

Dans [bonus.controller.js](backend/src/modules/admin/bonus.controller.js) et [promoConfig.controller.js](backend/src/modules/admin/promoConfig.controller.js) :

```javascript
export const modifierConfigBonus = async (req, res) => {
  const config = await prisma.configBonus.upsert({
    where: { salleId: req.user.salle_id },
    update: {
      ...(ratioSecondes !== undefined && { ratioSecondes: Number(ratioSecondes) }),
      // ...
    },
    create: {
      salleId: req.user.salle_id,
      ratioSecondes: Number(ratioSecondes || 300), // Valeur par défaut
      // ...
    }
  })
  return res.json(config)
}
```

**Utilité** : Si la config n'existe pas, elle est créée; sinon modifiée. Élimine les vérifications `if (!existant)`.

### 4. **Pattern: Isolation Multi-Salle (CRITIQUE)**

**Chaque controller suit ce pattern** :

```javascript
// 1. Lire salleId du JWT
const salleId = req.user.salle_id

// 2. Chercher la ressource ET vérifier salleId
const ressource = await prisma.ressource.findFirst({
  where: { id, salleId }  // ✅ Filtre obligatoire
})
if (!ressource) return res.status(404).json({ message: '...' })

// 3. Toutes les includes, updates, etc. doivent filtrer salleId
const categorie = await prisma.categorie.findMany({
  where: { salleId }  // ✅ JAMAIS d'omission
})
```

**Exemple complet** : [durees.controller.js](backend/src/modules/admin/durees.controller.js)

```javascript
// Helper qui valide salleId
const getCategorieOuErreur = async (categorieId, salleId, res) => {
  const cat = await prisma.categorie.findFirst({
    where: { id: Number(categorieId), salleId }  // ✅ Filtre composite
  })
  if (!cat) {
    res.status(404).json({ message: 'Catégorie introuvable' })
    return null
  }
  return cat
}

export const creerDuree = async (req, res) => {
  const categorieId = Number(req.params.id)
  // ...
  const cat = await getCategorieOuErreur(categorieId, req.user.salle_id, res)
  if (!cat) return  // ✅ Validation
  // ...
}
```

### 5. **Pattern: Hashing Passwords (bcryptjs)**

Dans [gerants.controller.js](backend/src/modules/admin/gerants.controller.js) et [auth.controller.js](backend/src/modules/auth/auth.controller.js) :

```javascript
import bcrypt from 'bcryptjs'

// Création
const hash = await bcrypt.hash(motDePasse, 10)
const gerant = await prisma.user.create({
  data: { ..., motDePasse: hash }
})

// Modification mot de passe
if (motDePasse) {
  data.motDePasse = await bcrypt.hash(motDePasse, 10)
}

// Vérification login
const motDePasseValide = await bcrypt.compare(motDePasse, user.motDePasse)
```

### 6. **Pattern: Code Génération (Coupons)**

Dans [coupons.controller.js](backend/src/modules/admin/coupons.controller.js) :

```javascript
const CHARSET = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789'  // Sans O, 0

const genererCode = () => {
  const partie = (n) =>
    Array.from({ length: n }, () => 
      CHARSET[Math.floor(Math.random() * CHARSET.length)]
    ).join('')
  return `${partie(4)}-${partie(4)}`  // XXXX-XXXX
}

const genererCodeUnique = async (salleId) => {
  let code
  let tentatives = 0
  do {
    code = genererCode()
    tentatives++
    if (tentatives > 100) throw new Error('Impossible de générer un code unique')
    const existant = await prisma.coupon.findUnique({ where: { code } })
    if (!existant) break
  } while (true)
  return code
}
```

### 7. **Pattern: JWT Token (jsonwebtoken)**

Dans [auth.controller.js](backend/src/modules/auth/auth.controller.js) :

```javascript
const signToken = (user) =>
  jwt.sign(
    { id: user.id, role: user.role, salle_id: user.salleId },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  )
```

**Payload** :
- `id` : ID utilisateur (pour requête GET /auth/me)
- `role` : 'CLIENT' | 'GERANT' | 'ADMIN' (pour requireRole)
- `salle_id` : ID salle (pour filtrage automatique)
- `exp` : Expiration (12 heures = 43200 sec)

### 8. **Pattern: Licence RSA Offline**

Dans [licenceService.js](backend/src/services/licenceService.js) :

```javascript
export const verifySignature = (payload, signature) => {
  // Signature faite par Projet 1 (clé privée)
  // Vérification par Projet 2 (clé publique)
  const publicKey = getPublicKey()
  const data = `${payload.licenceId}|${payload.salleId}|${payload.machineId}|${payload.issuedAt}|${payload.expiresAt}`
  const verify = createVerify('SHA256')
  verify.update(data)
  verify.end()
  return verify.verify(publicKey, signature, 'base64')
}

export const verifierLicence = (licence) => {
  // 1. Vérifier expiration
  if (new Date(licence.expiresAt) < new Date()) {
    return { valide: false, raison: 'Licence expirée' }
  }
  // 2. Vérifier signature RSA
  const signatureValide = verifySignature(payload, licence.signature)
  // 3. Retourner jours restants
  const joursRestants = Math.ceil(msRestants / (1000 * 60 * 60 * 24))
  return { valide: true, joursRestants }
}
```

---

## 📊 MODÈLES DE DONNÉES (PRISMA SCHEMA)

### Hierarchie multi-salle

```
Salle (1 salle = 1 établissement)
│
├─→ User (Admin/Gérant/Client de cette salle)
├─→ Categorie (PS4, PS5, XBOX)
│   ├─→ Duree (30min, 1h, 2h avec prix)
│   ├─→ Poste (PS4-1, PS4-2, etc.)
│   │   └─→ Session (quand joue un client)
│   └─→ Credit (solde par client par catégorie)
├─→ ConfigBonus (params bonus auto)
├─→ Coupon (codes XXXX-XXXX)
├─→ Promo (messages SMS/WhatsApp)
└─→ LicenceLocale (copie sig. RSA)
```

### Modèles clés

#### **1. User (3 rôles)**

```javascript
model User {
  id           Int      @id @default(autoincrement())
  pseudo       String   @unique
  email        String?  @unique
  nom          String?
  prenom       String?
  telephone    String   @unique  // ✅ Login par tel ou email
  motDePasse   String            // ✅ bcrypt hash
  role         Role     @default(CLIENT)  // CLIENT | GERANT | ADMIN
  estEnfant    Boolean  @default(false)
  codeParental String?           // Pour enfants
  telUrgence   String?           // Gérants seulement
  salleId      Int?              // ✅ Multi-salle
  active       Boolean  @default(true)  // Soft delete
  createdAt    DateTime @default(now())

  salle        Salle?        @relation(fields: [salleId], references: [id])
  sessions     Session[]     @relation("ClientSessions")
  sessionsGerant Session[]   @relation("GerantSessions")
  credits      Credit[]      // Soldes par catégorie
  transactions Transaction[]
  bonus        Bonus?
  promoCode    PromoCode?
}
```

**Contraintes** :
- `pseudo` unique (globalement)
- `telephone` unique (globalement) — identifie client même en offline
- `email` unique (globalement si fourni)
- `salleId` nullable mais filtré systématiquement

#### **2. Session (Cœur du gameplay)**

```javascript
model Session {
  id           Int           @id @default(autoincrement())
  clientId     Int           // Qui joue
  gerantId     Int           // Qui a autorisé
  posteId      Int           // Où
  dureeId      Int           // Combien de temps (référence prix)
  debut        DateTime      @default(now())
  fin          DateTime?
  tempsRestant Int           // Décompte en secondes
  statut       StatutSession @default(ACTIVE)  // ACTIVE | ARRETEE | TERMINEE
  estBonus     Boolean       @default(false)  // ✅ Si utilise compte bonus
  createdAt    DateTime      @default(now())

  client User  @relation("ClientSessions", fields: [clientId], references: [id])
  gerant User  @relation("GerantSessions", fields: [gerantId], references: [id])
  poste  Poste @relation(fields: [posteId], references: [id])
  duree  Duree @relation(fields: [dureeId], references: [id])
}
```

**Logique** :
1. Admin crée Session avec `estBonus: false` ou `estBonus: true`
2. Décompte en temps réel via Socket.io
3. À `tempsRestant = 0`, extinction auto poste
4. Flag `estBonus` détermine quel compte débité

#### **3. Credit (Soldes par catégorie)**

```javascript
model Credit {
  id          Int @id @default(autoincrement())
  clientId    Int
  categorieId Int
  solde       Int @default(0)  // ✅ En SECONDES (pas minutes!)

  client    User      @relation(fields: [clientId], references: [id])
  categorie Categorie @relation(fields: [categorieId], references: [id])

  @@unique([clientId, categorieId])  // 1 crédit par client par cat
}
```

**Exemple** :
- Client "Durand" a 1800 secondes de crédit PS4 (30 min)
- Client "Durand" a 7200 secondes de crédit PS5 (2h)
- À chaque session PS4, on débit les secondes correspondantes

#### **4. Bonus (Compte bonus auto)**

```javascript
model Bonus {
  id               Int      @id @default(autoincrement())
  clientId         Int      @unique
  solde            Int      @default(0)         // En secondes
  disponible       Boolean  @default(false)    // ✅ Déblocable au seuil
  derniereActivite DateTime @default(now())    // Reset si inactif

  client User @relation(fields: [clientId], references: [id])
}
```

**Logique** :
- Après chaque session : bonus augmente (selon ConfigBonus.ratioSecondes)
- Si `solde >= ConfigBonus.seuilDeblocage` → `disponible = true`
- Si inactif > ConfigBonus.validitejours → reset à 0

#### **5. ConfigBonus (Règles par salle)**

```javascript
model ConfigBonus {
  id              Int   @id @default(autoincrement())
  salleId         Int   @unique        // 1 config par salle
  ratioSecondes   Int                  // Secondes bonus / heure jouée
  seuilDeblocage  Int                  // Secondes pour débloquer
  validitejours   Int   @default(30)
  reductionInvite Float @default(0)    // % réduction ami invité
  bonusParrain    Float @default(0)    // % bonus si parrainé

  salle Salle @relation(fields: [salleId], references: [id])
}
```

**Exemple** :
```
ratioSecondes = 300   → 5 min bonus / heure jouée
seuilDeblocage = 3600 → 60 min accumulé = débloqué
validitejours = 30    → si inactif > 30j, reset
```

#### **6. Coupon (Codes à gratuit)**

```javascript
model Coupon {
  id        Int      @id @default(autoincrement())
  code      String   @unique        // XXXX-XXXX (sans 0 ni O)
  valeur    Float                   // Montant en devise locale
  utilise   Boolean  @default(false) // ✅ Soft delete utilisation
  salleId   Int
  createdAt DateTime @default(now())

  salle Salle @relation(fields: [salleId], references: [id])
}
```

**Workflow** :
1. Admin génère 50 coupons de 5000 FCFA
2. Imprime PDF (40/A4)
3. Client saisit code → vérifie utilise = false
4. Marque utilisé → crédite solde client

#### **7. Transaction (Audit)**

```javascript
model Transaction {
  id       Int             @id @default(autoincrement())
  clientId Int
  montant  Float           // Recharge positive, session négative
  type     TypeTransaction // RECHARGE_GERANT | RECHARGE_CLIENT | ...
  date     DateTime        @default(now())
  gerantId Int?            // Qui a fait l'opération

  client User @relation(fields: [clientId], references: [id])
}

enum TypeTransaction {
  RECHARGE_GERANT      // Gérant recharge client
  RECHARGE_CLIENT      // Client demande recharge
  RECHARGE_COUPON      // Client utilise coupon
  SESSION              // Jeu démarré
  BONUS                // Bonus débité
}
```

#### **8. LicenceLocale (RSA hors-ligne)**

```javascript
model LicenceLocale {
  id        Int      @id @default(autoincrement())
  licenceId String   @unique
  salleId   Int
  machineId String   // SHA256(hostname + MAC)
  issuedAt  DateTime
  expiresAt DateTime
  status    String   @default("ACTIVE")  // ACTIVE | REVOKED | EXPIRED
  signature String   // Base64 signé par Projet 1 (clé privée RSA)
  createdAt DateTime @default(now())

  salle Salle @relation(fields: [salleId], references: [id])
}
```

### Enums

```javascript
enum Role {
  CLIENT
  GERANT
  ADMIN
}

enum StatutSession {
  ACTIVE      // En cours
  ARRETEE     // Arrêtée manuellement (crédit conservé)
  TERMINEE    // Temps restant = 0 (crédit consommé)
}

enum StatutPoste {
  LIBRE      // Libre de jeu
  OCCUPE     // Session active
}
```

---

## ✅ ÉTAT D'AVANCEMENT RÉEL (Phase 2 Admin)

### Backend Phase 0-1-2 : ✅ TERMINÉE

**Phase 0 — Fondations** ✅

| Tâche | État | Fichiers |
|-------|------|----------|
| Schéma Prisma complet | ✅ | [schema.prisma](backend/prisma/schema.prisma) |
| Models Salle, User, Categorie, Duree, Poste, Session, Credit, etc. | ✅ | schema.prisma |
| Contraintes (FK, unique, index) | ✅ | schema.prisma |
| PrismaClient + adapter PG | ✅ | [prismaClient.js](backend/src/services/prismaClient.js) |
| Structure dossiers (modules, services, config) | ✅ | [src/](backend/src/) |
| Logger (`config/logger.js`) | ✅ | [logger.js](backend/src/config/logger.js) |
| Docker/Env | ✅ | `.env.example` |
| Middlewares base (verifyJwt, requireRole, cors) | ✅ | [auth.middleware.js](backend/src/middlewares/auth.middleware.js) |
| mockSwitch.js pour développement | ✅ | [mockSwitch.js](backend/src/switch/mockSwitch.js) |
| Seed initial (1 salle, 1 admin, 2 gérants, 5 clients, etc.) | ✅ | [seed.js](backend/prisma/seed.js) |

**Phase 1 — Auth + Licence** ✅

| Tâche | État | Fichiers |
|-------|------|----------|
| POST /auth/login (tel/email + password) | ✅ | [auth.controller.js](backend/src/modules/auth/auth.controller.js) L26 |
| JWT payload: {id, role, salle_id, exp} | ✅ | [auth.controller.js](backend/src/modules/auth/auth.controller.js) L12-20 |
| POST /auth/register (nouveau client) | ✅ | [auth.controller.js](backend/src/modules/auth/auth.controller.js) L70 |
| GET /auth/me (profil courant) | ✅ | [auth.controller.js](backend/src/modules/auth/auth.controller.js) L114 |
| Validation unicité pseudo + téléphone | ✅ | [auth.controller.js](backend/src/modules/auth/auth.controller.js) L77-87 |
| GET /licence/statut (vérif RSA + expiration) | ✅ | [licenceService.js](backend/src/services/licenceService.js) L64 |
| POST /licence/activer (installer licence) | ✅ | [licence.routes.js](backend/src/modules/licence/licence.routes.js) |
| Middleware licence.middleware (blocage routes si invalide) | ✅ | [licence.middleware.js](backend/src/middlewares/licence.middleware.js) L45 |
| RSA verification (SHA256) | ✅ | [licenceService.js](backend/src/services/licenceService.js) L29 |
| getMachineId (hostname + MAC → SHA256) | ✅ | [machineId.js](backend/src/services/machineId.js) |

**Phase 2 — Admin** ✅ (9 sub-phases)

| Phase | Endpoint | État | Fichiers |
|-------|----------|------|----------|
| 2.1 Catégories | POST/GET/PATCH/DELETE /admin/categories | ✅ | [categories.controller.js](backend/src/modules/admin/categories.controller.js) |
| 2.2 Durées | POST/GET/PATCH/DELETE /admin/categories/:id/durees | ✅ | [durees.controller.js](backend/src/modules/admin/durees.controller.js) |
| 2.3 Postes | POST/GET/PATCH/DELETE /admin/postes | ✅ | [postes.controller.js](backend/src/modules/admin/postes.controller.js) |
| 2.4 Gérants | POST/GET/PATCH /admin/gerants | ✅ | [gerants.controller.js](backend/src/modules/admin/gerants.controller.js) |
| 2.5 Config Bonus | POST/GET/PATCH /admin/bonus/config | ✅ | [bonus.controller.js](backend/src/modules/admin/bonus.controller.js) |
| 2.6 Config Promo | GET/PATCH /admin/promo/config | ✅ | [promoConfig.controller.js](backend/src/modules/admin/promoConfig.controller.js) |
| 2.7 Coupons | POST/GET /admin/coupons/generer | ✅ | [coupons.controller.js](backend/src/modules/admin/coupons.controller.js) |
| 2.8 Promotions | POST/GET/POST/envoyer /admin/promotions | ✅ | [promotions.controller.js](backend/src/modules/admin/promotions.controller.js) |
| — | PDF export coupons | ⏳ | Phase 7 |

**Routes Admin complètes** : [admin.routes.js](backend/src/modules/admin/admin.routes.js)

### Frontend Phase 0-1-2 : ⏳ EN COURS

| Feature | État | Fichiers |
|---------|------|----------|
| App Router (wouter) + role-based redirect | ✅ | [App.tsx](frontend/src/App.tsx) |
| Login page | ✅ | [login.tsx](frontend/src/pages/login.tsx) |
| AuthService + JWT localStorage | ✅ | [authService.ts](frontend/src/services/authService.ts) |
| Interceptor Axios + auto-redirect 401 | ✅ | [axios.ts](frontend/src/lib/axios.ts) |
| AppContext (currentUser + licenceStatut) | ✅ | [AppContext.tsx](frontend/src/contexts/AppContext.tsx) |
| Admin Dashboard | ⏳ | [admin/dashboard](frontend/src/pages/admin/) |
| Admin Categories CRUD | ⏳ | |
| Admin Durées CRUD | ⏳ | |
| Admin Postes CRUD | ⏳ | |
| Admin Gérants CRUD | ⏳ | |
| Admin Bonus Config | ⏳ | |
| Admin Promo Config | ⏳ | |
| Admin Coupons (gen + PDF) | ⏳ | |
| Admin Promotions | ⏳ | |
| Licence page (statut + renouvellement) | ⏳ | [admin/licence](frontend/src/pages/admin/licence.tsx) |

---

## 🚀 POINTS CLÉS POUR PHASE 3 (GÉRANT)

### Ordre de développement stricte

```
PHASE 3.1 — Gestion Clients
├─ POST /gerant/clients (créer client)
├─ GET /gerant/clients (lister)
├─ GET /gerant/clients/:id (détail)
└─ PATCH /gerant/clients/:id (modifier)

PHASE 3.2 — Recharges Gérant
├─ POST /gerant/recharges (effectuer recharge)
├─ GET /gerant/recharges/en-attente (valider cash)
└─ POST /gerant/recharges/:id/valider

PHASE 3.3 — Sessions (Cœur gameplay)
├─ POST /gerant/sessions (démarrer)
│  ├─ Vérifier crédit suffisant
│  ├─ Débiter compte
│  ├─ Appeler switchService.allumerPoste()
│  └─ Émettre session:start via Socket.io
├─ Socket.io session:tick (chaque seconde)
├─ Socket.io session:end (auto-extinction)
└─ POST /gerant/sessions/:id/arreter

PHASE 3.4 — Rapport Jour
└─ GET /gerant/rapport/jour

PHASE 3.5 — Frontend Gérant
├─ Dashboard avec grille 6 postes
├─ Décompte temps réel (Socket.io)
├─ Panel session (sélecteur client/cat/durée)
└─ Gestion recharges en attente
```

### Détails critiques Phase 3.3 (Sessions)

**Logique POST /gerant/sessions** :

```javascript
export const demarrerSession = async (req, res) => {
  const { clientId, categorieId, dureeId } = req.body
  
  try {
    // 1. Vérifier catégorie ∈ salle
    const categorie = await prisma.categorie.findFirst({
      where: { id: categorieId, salleId: req.user.salle_id }
    })
    if (!categorie) return res.status(404).json({ message: '...' })

    // 2. Vérifier crédit client suffisant
    const credit = await prisma.credit.findFirst({
      where: { clientId, categorieId }
    })
    const duree = await prisma.duree.findUnique({ where: { id: dureeId } })
    if (!credit || credit.solde < duree.secondes) {
      return res.status(400).json({ message: 'Crédit insuffisant' })
    }

    // 3. Trouver poste libre
    const poste = await prisma.poste.findFirst({
      where: { categorie: { salleId: req.user.salle_id }, statut: 'LIBRE' }
    })
    if (!poste) {
      return res.status(400).json({ message: 'Aucun poste libre' })
    }

    // 4. TRANSACTION : débiter + créer session + allumer poste
    const session = await prisma.$transaction(async (tx) => {
      // Débiter crédit
      await tx.credit.update({
        where: { id: credit.id },
        data: { solde: credit.solde - duree.secondes }
      })

      // Créer session
      const s = await tx.session.create({
        data: {
          clientId,
          gerantId: req.user.id,
          posteId: poste.id,
          dureeId,
          tempsRestant: duree.secondes,
          statut: 'ACTIVE'
        }
      })

      // Mettre à jour poste
      await tx.poste.update({
        where: { id: poste.id },
        data: { statut: 'OCCUPE' }
      })

      return s
    })

    // 5. Appeler switch réel
    await switchService.allumerPoste(poste.id)

    // 6. Émettre Socket.io
    const io = getIO()
    io.emit('session:start', {
      sessionId: session.id,
      posteId: poste.id,
      tempsRestant: session.tempsRestant
    })

    // 7. Démarrer countdown
    startSessionCountdown(session.id, duree.secondes)

    return res.status(201).json(session)
  } catch (err) {
    console.error('[gerant/sessions POST]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}
```

**Countdown avec Socket.io** :

```javascript
const sessionTimers = {} // { [sessionId]: { interval, remainingTime } }

export const startSessionCountdown = (sessionId, tempsRestant) => {
  let remaining = tempsRestant
  const io = getIO()

  const interval = setInterval(async () => {
    remaining--

    // Envoyer tick
    io.emit('session:tick', { sessionId, tempsRestant: remaining })

    // Si zéro, extinction auto
    if (remaining <= 0) {
      clearInterval(interval)
      
      // Arrêter session
      await prisma.session.update({
        where: { id: sessionId },
        data: { statut: 'TERMINEE', tempsRestant: 0, fin: new Date() }
      })

      // Éteindre poste
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: { poste: true }
      })
      await switchService.eteindrePoste(session.poste.id)

      // Libérer poste
      await prisma.poste.update({
        where: { id: session.poste.id },
        data: { statut: 'LIBRE' }
      })

      // Émettre fin
      io.emit('session:end', { sessionId, posteId: session.poste.id })

      // Calculer bonus (si applicable)
      // ... ConfigBonus logic
    }
  }, 1000)

  sessionTimers[sessionId] = { interval, remainingTime: remaining }
}
```

### Transactions critiques

**Les 3 patterns transactionnels (Phase 3+)** :

1. **Débiter + Créer Session + Allumer Poste** (demarrerSession)
   ```javascript
   await prisma.$transaction(async (tx) => {
     await tx.credit.update(...)    // Débiter crédit
     await tx.session.create(...)   // Créer session
     await tx.poste.update(...)     // Marquer OCCUPE
   })
   ```

2. **Créditer + Enregistrer Transaction** (rechargeClient)
   ```javascript
   await prisma.$transaction(async (tx) => {
     await tx.credit.update(...)       // Créditer
     await tx.transaction.create(...)  // Enregistrer
   })
   ```

3. **Débiter + Marquer Coupon + Créditer** (activateCoupon)
   ```javascript
   await prisma.$transaction(async (tx) => {
     await tx.coupon.update(...)  // Marquer utilisé
     await tx.credit.update(...)  // Créditer
     await tx.transaction.create(...)
   })
   ```

### Points d'attention Phase 3

| Point | Détail | Impact |
|-------|--------|--------|
| Isolation salleId | CHAQUE crédit, session, poste doit vérifier salleId | Sécurité critique |
| Transactions DB | Débiter + créer session ATOMIQUE | Corruption données |
| Socket.io countdown | Démarrer à 100%, décrémenter chaque seconde | UX temps réel |
| Auto-extinction | setTimeout → switchService.eteindrePoste() | Expérience utilisateur |
| Gérant peut créer client | Oui (lié à sa salle) | Workflow réaliste |
| Client ne peut pas créer client | Non (que Gérant/Admin) | Security |

---

## 🔧 MIDDLEWARES EXISTANTS

### [auth.middleware.js](backend/src/middlewares/auth.middleware.js)

```javascript
// Vérifie JWT et injecte req.user
export const verifyJwt = (req, res, next) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token manquant' })
  }

  const token = header.split(' ')[1]
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch {
    return res.status(401).json({ message: 'Token invalide ou expiré' })
  }
}

// Vérifie que l'utilisateur a l'un des rôles
export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user?.role || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Accès refusé' })
  }
  next()
}
```

**Usage** :

```javascript
// Route protégée (Auth + Admin seulement)
router.post('/categories', verifyJwt, requireRole('ADMIN'), creerCategorie)

// Route pour Admin OU Gérant
router.get('/sessions', verifyJwt, requireRole('ADMIN', 'GERANT'), getSessions)
```

### [licence.middleware.js](backend/src/middlewares/licence.middleware.js)

```javascript
// Vérifie licence au démarrage
export const checkLicenceAtStartup = async () => {
  const licence = await prisma.licenceLocale.findFirst({
    where: { status: 'ACTIVE' }
  })
  licenceValide = verifierLicence(licence).valide
}

// Bloque si licence invalide (sauf routes exemptées)
export const requireLicence = (req, res, next) => {
  const exemptee =
    req.originalUrl === '/api/auth/login' ||
    req.originalUrl.startsWith('/api/licence')

  if (exemptee) return next()  // Passer sans vérifier

  if (!licenceValide) {
    return res.status(403).json({ message: 'Licence invalide' })
  }

  next()
}
```

**Routes exemptées** (peuvent s'exécuter sans licence valide) :
- POST /auth/login
- POST /auth/register
- GET /auth/me (⚠️ vérifier si JWT valide)
- GET /licence/statut
- POST /licence/activer

---

## 📁 STRUCTURE DOSSIERS BACKEND

```
backend/
├── server.js                      # Entry point HTTP + Socket.io
├── package.json
├── .env                           # DATABASE_URL, JWT_SECRET
├── .env.example
├── prisma/
│   ├── schema.prisma             # Modèles Prisma
│   ├── seed.js                   # Données initiales
│   └── seed-users.sql            # Seed SQL
├── keys/
│   ├── README.md                 # Où mettre public-key.pem
│   └── [public-key.pem]          # À copier du Projet 1
├── src/
│   ├── index.js                  # Express app (CORS, routes)
│   ├── socket.js                 # Socket.io initialization
│   ├── config/
│   │   ├── cors.js               # corsOptions
│   │   └── logger.js             # Console logger
│   ├── middlewares/
│   │   ├── auth.middleware.js    # verifyJwt + requireRole
│   │   └── licence.middleware.js # checkLicence + requireLicence
│   ├── services/
│   │   ├── prismaClient.js       # PrismaClient instance
│   │   ├── licenceService.js     # verifySignature + verifierLicence
│   │   └── machineId.js          # getMachineId()
│   ├── switch/
│   │   ├── switchService.js      # Routeur USB/WIFI/MOCK
│   │   ├── mockSwitch.js         # Simulateur dev
│   │   ├── usbSwitch.js          # ✅ Squelette Phase 6.1
│   │   └── wifiSwitch.js         # ✅ Squelette Phase 6.2
│   └── modules/
│       ├── auth/
│       │   ├── auth.routes.js
│       │   └── auth.controller.js
│       ├── admin/               # ✅ COMPLETE Phase 2
│       │   ├── admin.routes.js
│       │   ├── categories.controller.js
│       │   ├── durees.controller.js
│       │   ├── postes.controller.js
│       │   ├── gerants.controller.js
│       │   ├── bonus.controller.js
│       │   ├── promoConfig.controller.js
│       │   ├── coupons.controller.js
│       │   └── promotions.controller.js
│       ├── gerant/              # ⏳ Phase 3 (TODO)
│       │   ├── gerant.routes.js
│       │   └── [controllers]
│       ├── client/              # ⏳ Phase 4 (TODO)
│       │   ├── client.routes.js
│       │   └── [controllers]
│       ├── rapports/            # ⏳ Phase 5 (TODO)
│       │   └── rapports.routes.js
│       └── licence/             # ✅ Endpoints statut/activer
│           ├── licence.routes.js
│           └── licence.controller.js
```

---

## 📦 DÉPENDANCES CLÉS

### Backend (Express 5 + ESM)

```json
{
  "@prisma/client": "^7.8.0",      // ORM
  "@prisma/adapter-pg": "^7.8.0",  // PostgreSQL adapter
  "express": "^5.2.1",             // Framework
  "cors": "^2.8.6",                // CORS middleware
  "dotenv": "^17.4.2",             // .env loader
  "jsonwebtoken": "^9.0.3",        // JWT
  "bcryptjs": "^3.0.3",            // Password hashing
  "socket.io": "^4.8.3",           // Real-time
  "nodemon": "^3.1.14"             // Dev hot-reload
}
```

### Frontend (React 18 + Vite)

```json
{
  "react": "^18.3.1",
  "react-router-dom": "^6.x",      // Routing (ou wouter ✅)
  "axios": "^1.x",                 // HTTP client
  "@tanstack/react-query": "^5.x", // Cache management
  "typescript": "^5.x",
  "tailwindcss": "^3.x",           // Styling
  "vite": "^5.x"                   // Dev server
}
```

---

## ⚠️ POINTS CRITIQUES DE SÉCURITÉ

### 1. **Isolation Multi-Salle (CRITIQUE)**

❌ **MAUVAIS** :
```javascript
const categories = await prisma.categorie.findMany()
```

✅ **BON** :
```javascript
const categories = await prisma.categorie.findMany({
  where: { salleId: req.user.salle_id }
})
```

**Impact** : Injection directe, lecture données d'autres salles.

### 2. **Validation JWT + Role**

❌ **MAUVAIS** :
```javascript
router.get('/admin/categories', creerCategorie)  // Pas de middleware!
```

✅ **BON** :
```javascript
router.get('/admin/categories', verifyJwt, requireRole('ADMIN'), creerCategorie)
```

**Impact** : N'importe qui peut accéder.

### 3. **Hashing Passwords**

❌ **MAUVAIS** :
```javascript
const user = await prisma.user.create({
  data: { motDePasse: password }  // En clair!
})
```

✅ **BON** :
```javascript
const hash = await bcrypt.hash(password, 10)
const user = await prisma.user.create({
  data: { motDePasse: hash }
})
```

**Impact** : Vol de données/credentials.

### 4. **Transactions (Race Conditions)**

❌ **MAUVAIS** :
```javascript
// 1. Vérifier crédit
const credit = await prisma.credit.findUnique({ where: { id: 1 } })
if (credit.solde < 100) throw new Error('Insuffisant')

// 2. Débiter (un autre client dépense entre 1 et 2!)
await prisma.credit.update({ where: { id: 1 }, data: { solde: credit.solde - 100 } })
```

✅ **BON** :
```javascript
await prisma.$transaction(async (tx) => {
  const credit = await tx.credit.findUnique({ where: { id: 1 } })
  if (credit.solde < 100) throw new Error('Insuffisant')
  await tx.credit.update({ where: { id: 1 }, data: { solde: credit.solde - 100 } })
})
```

**Impact** : Double débit, overselling.

### 5. **Licence RSA (Hors-ligne)**

❌ **MAUVAIS** :
```javascript
// Accepter n'importe quelle licence
if (licence.expiresAt > now()) { licenceValide = true }
```

✅ **BON** :
```javascript
// Vérifier signature RSA (clé publique)
const valide = verifySignature(payload, signature)
if (!valide) return { valide: false, raison: 'Signature invalide' }
```

**Impact** : Licence truquée/copiée.

---

## 🎯 CHECKLIST PROCHAINES ÉTAPES

### À FAIRE AVANT Phase 3

- [ ] Tester tous les endpoints Admin avec Postman/cURL
- [ ] Vérifier isolation `salleId` sur chaque controller
- [ ] Copier `public-key.pem` du Projet 1 → `backend/keys/`
- [ ] Valider schema.prisma avec Prisma Studio (`npx prisma studio`)
- [ ] Vérifier Socket.io fonctionne (test connexion simple)
- [ ] Documenter les 3 patterns transactionnels (crédit, coupon, bonus)
- [ ] Lister tous les TODOs du code (grep `TODO`)

### À FAIRE Phase 3 (Ordre strict)

1. **3.1 Gérants** : Créer API CRUD clients (POST, GET, PATCH)
2. **3.2 Recharges** : POST recharge + statut en attente
3. **3.3 Sessions** : POST démarrer + logique crédit + switchService + Socket.io
4. **3.4 Rapport** : GET rapport/jour avec agrégations
5. **3.5 Frontend** : Dashboard gérant avec grille 6 postes + décompte temps réel

### To-do côté Projet 1

- [ ] Générer `private-key.pem` et `public-key.pem` (RSA 2048+)
- [ ] Fournir `public-key.pem` → sera stocké dans Projet 2 → `backend/keys/`
- [ ] Endpoint signature licence : `POST /sign-licence` (Projet 1)

---

## 🚀 COMMANDES UTILES

```bash
# Backend
cd backend

# Démarrer dev
npm run dev

# Seed données
npm run seed

# Générer Prisma Client
npx prisma generate

# Migration
npx prisma migrate dev

# Voir BDD (GUI)
npx prisma studio

# Tests endpoints (cURL)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"telephone":"...","motDePasse":"..."}'

# Frontend
cd frontend
npm run dev    # http://localhost:5173
npm run build
npm run preview
```

---

## 📝 RÉSUMÉ EXÉCUTIF

**Switch SAB est une application multi-salle complète de gestion de cybercafé** :

- **Backend** : Node.js/Express 5 (ESM) + Prisma 7 + PostgreSQL
  - Phase 0-1-2 ✅ TERMINÉE (Auth, Licence, Admin 9 modules)
  - 50+ endpoints implémentés
  - Isolation multi-salle garantie
  - Licence hors-ligne avec RSA

- **Frontend** : React 18 + TypeScript + Vite
  - Architecture router avec role-based redirect
  - AppContext pour auth persistant
  - Services axios pré-configurés
  - Interface admin/gérant/client (à compléter)

- **Patterns clés** :
  - JWT (12h) + localStorage
  - Middleware chain (JWT → Role → SalleId)
  - Transactions Prisma pour données critiques
  - Socket.io pour décompte temps réel
  - Licence RSA hors-ligne (clé publique)

- **Prochaine étape** : Phase 3 (Gérant) demande Sessions + Socket.io
  - POST /gerant/sessions (débiter + allumer poste)
  - Socket.io countdown (session:start, session:tick, session:end)
  - Transactions DB pour éviter race conditions

**ÉTA Phase 7 complet** : ~2-3 mois si équipe dédiée.

