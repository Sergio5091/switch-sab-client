# Switch SAB App Salle — Journal de développement

**Projet 2** — Application installée dans chaque salle de jeux physique  
**Stack** : Node.js / Express (ESM) · PostgreSQL / Prisma · React / Vite / TypeScript · Tailwind · Socket.io  
**Équipe** : Alessio (backend) · Mathieu (frontend) · Sergio (IoT/Zigbee)

---

## Phase 0 — Fondations

### Schéma Prisma
- Modèles créés : `Salle`, `User`, `Categorie`, `Duree`, `Poste`, `Session`, `Credit`, `Transaction`, `Coupon`, `Bonus`, `ConfigBonus`, `PromoCode`, `Promo`, `LicenceLocale`
- Champs ajoutés vs la version initiale : `Salle.disabled`, `User.email/nom/prenom/active`, `ConfigBonus.salleId`, `Coupon.salleId`, `Poste.zigbeeName`, `User.solde`
- Enum `Role` : `CLIENT`, `GERANT`, `ADMIN` (SUPERADMIN retiré — Projet 2 uniquement)
- `LicenceLocale` remplace le modèle `Licence` — vérification RSA hors-ligne
- `datasource db` : `url = env("DATABASE_URL")` ajouté (fix déploiement)

### Structure backend
```
src/
├── config/         cors.js (multi-URL split) · logger.js
├── middlewares/    auth.middleware.js (verifyJwt + requireRole) · licence.middleware.js
├── services/       prismaClient.js · licenceService.js · machineId.js · sessionScheduler.js · rapportScheduler.js · mailService.js · rapportMailService.js · phoneService.js
├── modules/
│   ├── auth/       controller + routes
│   ├── admin/      categories · durees · postes · gerants · bonus · coupons · promotions · salle · zigbee · dashboard
│   ├── gerant/     clients · recharges · sessions · rapport
│   ├── client/     home · sessions · coupon · acheter-credit · leaderboard
│   ├── licence/    controller + routes
│   ├── rapports/   routes
│   └── setup/      routes (première installation)
└── switch/         mockSwitch · switchService · usbSwitch · wifiSwitch · zigbeeSwitch
```

### Fichiers de config
- `prisma.config.js` : remplacé `readFileSync` par `dotenv.config()` (fix Render)
- `package.json` : ajout `"build": "prisma generate"` (fix Render)
- `.env.example` : documenté avec toutes les variables (MQTT, SMTP, TZ, etc.)
- `.gitignore` : `keys/*.pem` protégés, `prisma/migrations/` ignoré

---

## Phase 1 — Auth + Licence

### Authentification
- `POST /api/auth/login` — accepte `identifiant` (pseudo ou email) + `motDePasse`
- JWT payload : `{ id, role, salle_id, exp }` — expire 12h
- `POST /api/auth/register` — création compte CLIENT
- `GET /api/auth/me` — utilisateur courant (token frais depuis BDD)
- Comptes verrouillés : erreur 403 si `user.active = false`

### Licence RSA hors-ligne
- `GET /api/licence/statut` — retourne `{ statut, machineId, joursRestants }`
- `POST /api/licence/activer` — installe une licence JSON signée
- `machineId` généré depuis hostname + adresse MAC (SHA256, 16 chars)
- Vérification RSA : clé publique depuis `LICENCE_PUBLIC_KEY_PEM` (base64, priorité) ou fichier `keys/public-key.pem`
- Hash anti-fraude SHA256 sur tous les champs sensibles — détecte modification en BDD
- Script de test : `scripts/gen-temp.js` — génère paire de clés + licence signée localement

### Middleware licence
- `requireLicence` bloque toutes les routes sauf `/api/auth/login`, `/api/auth/register`, `/api/licence/*`
- `checkLicenceAtStartup()` — vérifie au démarrage du serveur
- `reloadLicence()` — rechargement à chaud après activation

---

## Phase 2 — Admin

### Catégories
- CRUD complet (`POST`, `GET`, `PATCH`, `DELETE`)
- **Unicité** : pas deux catégories avec le même nom (insensible à la casse) — vérifié aussi sur UPDATE
- Après création : dialog frontend "Ajouter les tarifs" avec redirect vers `/admin/categories/:id/durees`

### Durées et prix
- CRUD par catégorie
- Toutes les vérifications d'appartenance à la salle

### Postes
- CRUD complet
- Champ `zigbeeName` : friendly_name de la prise Zigbee associée
- Interface : bouton "Appairer une prise" avec états idle / waiting / success / error

### Gérants
- Création avec hash bcrypt du mot de passe
- Modification / désactivation

### Configuration bonus
- `ratioSecondes`, `seuilDeblocage`, `validitejours`, `reductionInvite`, `bonusParrain`, `bonusFilleul`
- Une config par salle

### Coupons
- Génération en masse : charset sans O ni 0 — format `XXXX-XXXX`
- Filtre par statut (actif / utilisé)
- Export PDF (Phase 7)

### Promotions
- Création, liste, envoi (Twilio Phase 2.8)
- Export contacts VCF pour WhatsApp

### Zigbee — appairage
- `POST /api/admin/zigbee/appairer/:posteId` — ouvre permit_join 120s, détecte la prise, renomme, lie en BDD, bascule `switchType` → `ZIGBEE`
- `DELETE /api/admin/zigbee/desappairer/:posteId` — retire le lien
- `POST /api/admin/zigbee/identifier/:posteId` — fait clignoter la LED

---

## Phase 3 — Gérant

### Clients
- CRUD : création (pseudo + téléphone), détail avec soldes, modification

### Recharges
- `POST /api/gerant/recharges` — crédite des **secondes** sur la catégorie choisie (pas FCFA)
- Création automatique du `Credit` si première recharge sur cette catégorie
- `GET /api/gerant/recharges` — historique complet avec soldes actuels par catégorie
- `GET /api/gerant/recharges/en-attente` — recharges clients en attente
- `POST /api/gerant/recharges/:id/valider` — valider après encaissement

### Sessions
- **Démarrage rapide** : si le client a du crédit, boutons `▶ PS4 — 60min` directement (sans formulaire)
- Formulaire complet disponible en accordéon pour les autres cas
- Sélection automatique de la meilleure durée selon le solde disponible
- `POST /api/gerant/sessions` — vérifie crédit, crée session, allume switch, démarre timer
- `POST /api/gerant/sessions/:id/arreter` — arrêt manuel, conserve le temps restant
- `POST /api/gerant/sessions/:id/prolonger` — prolonge une session active
- Historique des sessions du jour avec statut + temps restant dans la page de nouvelle session

### Switch — allumage physique
```
demarrerSession()
    ↓
switchService.allumerPoste(posteId)
    ↓ (si ZIGBEE)
zigbeeSwitch.allumerPoste() → MQTT: { state: 'ON' }
zigbeeSwitch.verrouillerPoste() → { child_lock: 'LOCK' }
zigbeeSwitch.programmerArret(secondes) → { countdown: N }
    ↓
scheduleSessionEnd(id, posteId, ms) → setTimeout
    ↓ (à l'expiration)
endSessionAuto()
    ↓
switchService.eteindrePoste() → MQTT: { state: 'OFF' }
zigbeeSwitch.deverrouillerPoste() → { child_lock: 'UNLOCK' }
zigbeeSwitch.annulerCountdown() → { countdown: 0 }
    ↓
io.emit('session:end')
```

### Socket.io — temps réel
| Événement | Déclencheur |
|---|---|
| `session:start` | Démarrage session |
| `session:end` | Fin automatique |
| `session:stop` | Arrêt manuel |
| `session:prolonged` | Prolongation |

### Rapport du jour
- Recharges uniquement (pas les sessions — visible dans `/gerant/session/new`)
- Stats : total sessions, total recharges, par catégorie, par client
- Export CSV
- Temps restant masqué dans le rapport (affiché dans le dashboard)

---

## Phase 4 — Client

### Soldes
- **Solde coupon** (FCFA) : alimenté par coupons uniquement — déduit quand le client achète des minutes
- **Crédit par catégorie** (secondes) : alimenté par recharges gérant ou achat avec solde coupon
- **Bonus** (secondes) : accumulé par fidélité après chaque session

### Coupon
- `POST /api/client/coupon` — active un code coupon → crédite FCFA sur solde
- Charset sans O ni 0, vérification validité + marquage utilisé

### Achat de minutes avec solde coupon
- `POST /api/client/acheter-credit` — déduit FCFA du solde, crédite secondes sur catégorie
- Bouton "Acheter des minutes" affiché seulement si solde > 0

### Sessions self-service
- Client démarre sa propre session depuis son interface
- Même logique switch que côté gérant

### Interface client (mobile-first)
- Solde coupon FCFA (avec bouton "Acheter des minutes" si > 0)
- Bonus minutes
- Crédit par catégorie (uniquement ceux > 0)
- Timer en temps réel pendant session active
- Sessions récentes

---

## Phase 5 — Rapports admin

- Routes avec filtres : `?debut`, `?fin`, `?gerant_id`, `?poste_id`, `?client_id`, `?periode`
- Export CSV / PDF

---

## IoT Switch — Architecture

### Pattern stratégie
`switchService.js` route vers le bon driver selon `salle.switchType` :
- `MOCK` : simulateur mémoire (dev/cloud)
- `ZIGBEE` : prises Zigbee via MQTT/Zigbee2MQTT (Pi physique)
- `USB` : driver USB série (Phase 6.1 Sergio)
- `WIFI` : driver HTTP local (Phase 6.2 Sergio)

### Driver Zigbee (`zigbeeSwitch.js`)
- Client MQTT singleton avec reconnexion automatique
- `allumerPoste` / `eteindrePoste` → `state: ON/OFF`
- `verrouillerPoste` / `deverrouillerPoste` → `child_lock: LOCK/UNLOCK`
- `programmerArret` → `countdown: N` (sécurité si backend crash — max 43200s)
- `annulerCountdown` → `countdown: 0`
- `configurerCoupure` → `power_outage_memory: off` (une seule fois à l'appairage)
- `identifierPoste` → `identify: identify` (fait clignoter la LED)
- `getStatutPoste` / `getAllStatuts` → lecture état retained MQTT

### Variables d'env Pi
```
MQTT_URL=mqtt://localhost:1883
ZIGBEE2MQTT_TOPIC=zigbee2mqtt
USE_MOCK_SWITCH=false
```

---

## Déploiement

### Backend — Render
| Variable | Valeur |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Internal URL Render |
| `JWT_SECRET` | secret fort |
| `FRONTEND_URL` | URLs Vercel séparées par virgule |
| `LICENCE_PUBLIC_KEY_PEM` | base64 de la clé publique |
| `PORT` | `3001` |

- Build Command : `npm install && npm run build && npx prisma db push`
- Start Command : `npm run start`
- BDD : PostgreSQL Render free tier (ou Supabase)

### Frontend — Vercel
| Variable | Valeur |
|---|---|
| `VITE_API_URL` | `https://switch-sab-client.onrender.com/api` |

- Root Directory : `frontend`
- `vercel.json` : rewrites SPA créé
- `.env.production` : VITE_API_URL configuré

### Anti-sleep (Render free)
- UptimeRobot sur `https://switch-sab-client.onrender.com/api` toutes les 5 min

---

## Corrections de bugs notables

| Bug | Cause | Fix |
|---|---|---|
| Boucle login/licence | `licenceStatut null` traité comme invalide | Attendre que le statut soit chargé avant de rediriger |
| `Cannot GET /api/auth/login` | Routes montées sans `/api/` prefix | Ajout du préfixe `/api/` sur tous les `app.use()` |
| `Token manquant` | `localStorage.removeItem('currentUser')` mauvaise clé | Corrigé en `switch_sab_user` |
| Recharge crédite le solde FCFA au lieu des minutes | `RECHARGE_GERANT` inclus dans le calcul `soldeMonetaire` | Filtré sur `RECHARGE_COUPON` uniquement |
| Seed échoue sur Render | `DATABASE_URL` doublé dans `.env` | Fix du `.env` |
| `prisma migrate deploy` échoue | BDD non vide sans migration enregistrée | Utilisation de `prisma db push` à la place |
| `sessionScheduler` crash | `import { default: switchService }` — pas d'export default | Corrigé en `import * as switchService` |
| `schema.prisma` sans `url` | `datasource db` sans champ `url` | Ajout de `url = env("DATABASE_URL")` |
| esbuild crash sur Windows | Bug connu Node.js + esbuild | `rm -rf node_modules/.vite && npm run dev` |

---

## Comptes de test (seed)

| Rôle | Identifiant | Téléphone | Mot de passe |
|---|---|---|---|
| Admin | `admin` | `+22900000001` | `admin123` |
| Gérant 1 | `gerant1` | `+22900000002` | `gerant123` |
| Gérant 2 | `gerant2` | `+22900000003` | `gerant123` |
| Client | `kofi` / `amina` / `yann` / `fatou` / `marcus` | `+2290000000X` | `client123` |

---

## URLs de production

| Service | URL |
|---|---|
| Frontend | https://switch-sab-client.vercel.app |
| Backend API | https://switch-sab-client.onrender.com/api |
| Monitoring | UptimeRobot — ping toutes les 5 min |
