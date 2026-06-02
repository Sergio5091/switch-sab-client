# 🚀 PHASE 3 — GÉRANT — GUIDE DE DÉPLOIEMENT ET UTILISATION

---

## 📦 PRÉREQUIS

### **Backend**
- Node.js 18+
- PostgreSQL 13+
- Prisma 7+
- Socket.io 4+

### **Frontend** (Phase 3.7)
- React 18+
- TypeScript
- Vite
- Socket.io client

---

## ⚙️ INSTALLATION & DÉMARRAGE

### **1. Cloner et dépendances**
```bash
cd switch-sab-client/backend
npm install
```

### **2. Configuration .env**
```
# Base de données
DATABASE_URL="postgresql://user:password@localhost:5432/switch_sab"

# JWT
JWT_SECRET="your-super-secret-key-here"

# Licence
LICENCE_PUBLIC_KEY_PATH="./keys/public-key.pem"

# Switch
SWITCH_TYPE="MOCK"  # ou "USB" / "WIFI" (Phase 6)

# Frontend
FRONTEND_URL="http://localhost:5173"

# Port
PORT=3000
```

### **3. Initialiser base de données**
```bash
# Migrations Prisma
npx prisma migrate dev --name init

# Seed de données (1 salle + users + catégories)
npx prisma db seed
```

### **4. Démarrer backend**
```bash
npm start

# Output:
# 🚀 Serveur démarré sur le port 3000
# Socket.io initialisé
```

### **5. Démarrer frontend** (après Phase 3.7)
```bash
cd frontend
npm run dev

# Output:
# Local:   http://localhost:5173
```

---

## 🎮 UTILISATION QUOTIDIENNE

### **Scénario 1 : Créer et recharger un client**

```bash
# Terminal 1: Backend
npm start

# Terminal 2: Postman/curl
# 1️⃣ Login gérant
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"gerant@example.com","motDePasse":"Test@123"}'

# 2️⃣ Créer client
curl -X POST http://localhost:3000/api/gerant/clients \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "pseudo":"Ahmed_Gaming",
    "telephone":"22900123456"
  }'

# 3️⃣ Recharger client
curl -X POST http://localhost:3000/api/gerant/recharges \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId":12,
    "categorieId":1,
    "dureeId":2,
    "montant":10000
  }'

# 4️⃣ Démarrer session
curl -X POST http://localhost:3000/api/gerant/sessions \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId":12,
    "categorieId":1,
    "dureeId":2,
    "useBonus":false
  }'

# 5️⃣ Consulter rapport du jour
curl -X GET http://localhost:3000/api/gerant/rapport/jour \
  -H "Authorization: Bearer <token>"
```

### **Scénario 2 : Gestion multi-gérants**

```
Base de données (seed) fournit :
├── 1 Admin (admin@switch.local)
├── 2 Gérants (gerant1@, gerant2@)
├── 5 Clients (client1@, client2@, ...)
└── 6 Postes (PS4-1, PS4-2, PS5-1, PS5-2, XBOX-1, XBOX-2)

Chaque gérant ne voit que les clients de sa salle (isolation).
```

---

## 📊 ARCHITECTURE RUNTIME

```
┌─────────────────────────────────────────┐
│        Frontend (React + Vite)          │
│    http://localhost:5173                │
│                                         │
│  • Dashboard Gérant                    │
│  • Grille 6 postes                     │
│  • Timer Socket.io                     │
└────────────────┬────────────────────────┘
                 │ HTTP + WebSocket
                 ▼
┌─────────────────────────────────────────┐
│   Backend (Express + Socket.io)         │
│    http://localhost:3000                │
│    ws://localhost:3000 (Socket.io)     │
│                                         │
│  • 15 endpoints gerant                 │
│  • Transactions DB atomiques            │
│  • Timers en mémoire                   │
└────────────────┬────────────────────────┘
                 │ Prisma ORM
                 ▼
┌─────────────────────────────────────────┐
│    PostgreSQL Database                  │
│    localhost:5432/switch_sab            │
│                                         │
│  • Users (Admin, Gerants, Clients)     │
│  • Sessions (gameplay)                 │
│  • Credits (soldes)                    │
│  • Bonus                               │
│  • Transactions (audit)                │
└─────────────────────────────────────────┘
```

---

## 🔍 DEBUGGING & LOGS

### **Logs Backend**
```bash
# Tail les logs en temps réel
npm start 2>&1 | tee backend.log

# Filtrer par type
npm start 2>&1 | grep "session"
npm start 2>&1 | grep "ERROR"
npm start 2>&1 | grep "Socket.io"
```

### **Logs Base de Données**
```bash
# Connexion directe
psql -U postgres -d switch_sab

# Requête utile : sessions aujourd'hui
SELECT * FROM "Session" 
WHERE DATE(debut) = CURRENT_DATE 
ORDER BY debut DESC;

# Requête : crédits actuels d'un client
SELECT c.*, cat.nom as categorie 
FROM "Credit" c 
JOIN "Categorie" cat ON c."categorieId" = cat.id 
WHERE c."clientId" = 12;
```

### **Logs Socket.io**
```bash
# Browser console (Ctrl+Shift+J)
socket.on('session:start', (data) => console.log('[START]', data))
socket.on('session:tick', (data) => console.log('[TICK]', data.tempsRestant))
socket.on('session:end', (data) => console.log('[END]', data))
socket.on('session:stop', (data) => console.log('[STOP]', data))
```

---

## 🛠️ TROUBLESHOOTING

| Problème | Cause | Solution |
|----------|-------|----------|
| **Session ne démarre pas** | Crédit insuffisant | Recharger client via POST /recharges |
| **Poste pas allumé** | Switch driver fail | Vérifier mockSwitch ou USB/WIFI |
| **Timer ne s'affiche pas** | Socket.io not connected | Vérifier FRONTEND_URL dans .env |
| **Erreur JWT** | Token expiré | Re-login pour nouveau token |
| **Bonus ne se calcule pas** | ConfigBonus pas définie | POST /admin/bonus/config |
| **Race condition 2 sessions** | Poste occupé 2x | Transactions DB règlent (rare) |

---

## 📈 MONITORING (Production)

### **Health checks** (à ajouter Phase 7)
```javascript
GET /health
→ 200 OK: { status: "healthy", uptime: 3600, connections: 5 }
```

### **Métriques à tracker**
- Sessions actives actuellement
- Moyenne durée sessions
- Taux d'erreur recharges
- Latence Socket.io

### **Alertes recommandées**
- ⚠️ Backend crash
- ⚠️ DB connection lost
- ⚠️ Licence expirée
- ⚠️ Poste offline

---

## 🔐 SÉCURITÉ (Production Checklist)

- [ ] **HTTPS** activé (certificat SSL)
- [ ] **JWT_SECRET** changé (long + aléatoire)
- [ ] **DB password** changé
- [ ] **CORS** restreint aux domaines autoriés
- [ ] **Rate limiting** sur /login
- [ ] **CSRF protection** ajoutée
- [ ] **Headers sécurité** (Helmet.js)
- [ ] **Logs** sauvegardés (not stdout)
- [ ] **Backups** programmés quotidiens
- [ ] **Monitoring** activé (erreurs, performance)

---

## 📋 CHECKLIST DÉPLOIEMENT

### **Pre-flight**
- [ ] Tests Phase 3 complets ✅ (voir PHASE3_TEST_GUIDE.md)
- [ ] Variables d'environnement définies
- [ ] DB initialisée + seed
- [ ] Migrations Prisma exécutées
- [ ] Frontend Phase 3.7 complète ✅ (Mathieu)
- [ ] Drivers switch testés ✅ (Sergio - Phase 6)

### **Déploiement**
- [ ] Pull latest code
- [ ] npm install
- [ ] npm build (si applicable)
- [ ] npm start (ou systemd/PM2)
- [ ] Vérifier logs (pas d'erreur)
- [ ] Test quick: POST /gerant/clients → 201
- [ ] Test Socket.io: open console frontend → connection OK

### **Post-deployment**
- [ ] Monitoring activé
- [ ] Backups testés
- [ ] Rollback plan prêt
- [ ] Équipe notifiée
- [ ] Performance baselines établis

---

## 🚀 PROCHAINES PHASES

### **Phase 3.7 — Interface Gérant Frontend (Mathieu)**
- Dashboard avec grille 6 postes
- Real-time countdown (Socket.io)
- Gestion clients (CRUD)
- Recharges en attente
- Rapport du jour (graphique)

**Endpoints à intégrer** : 15 endpoints gerant + 4 Socket.io events

### **Phase 4 — Client (Self-service)**
- POST /client/sessions → démarrer (soi-même)
- POST /client/coupons/activer → codes
- GET /client/postes-disponibles
- PromoCode + code promo ami

**Bloc** : Phase 3.7 doit être complète

### **Phase 6 — Drivers IoT (Sergio)**
- usbSwitch.js → relay physique USB
- wifiSwitch.js → API WIFI
- getStatutPoste() → feedback
- Gestion erreurs réseau

**Dépend de** : Phase 3 (appels switchService)

---

## 📞 SUPPORT & CONTACT

| Rôle | Personne | Contact |
|------|----------|---------|
| **Backend Phase 3** | Alessio | Backend Phase 3 100% ✅ |
| **Frontend Phase 3.7** | Mathieu | À commencer (specs prêtes) |
| **IoT Drivers Phase 6** | Sergio | Peut commencer (mockSwitch OK) |
| **Admin/Déploiement** | TBD | Infrastructure |

---

## 🎓 RESSOURCES DOCUMENTAIRES

| Document | Contenu |
|----------|---------|
| [ANALYSE_COMPLETE_PROJET.md](ANALYSE_COMPLETE_PROJET.md) | Architecture + patterns complets |
| [PHASE3_GERANT_IMPLEMENTATION.md](PHASE3_GERANT_IMPLEMENTATION.md) | Détails techniques Phase 3 |
| [PHASE3_RESUME.md](PHASE3_RESUME.md) | Résumé exécutif + highlights |
| [PHASE3_TEST_GUIDE.md](PHASE3_TEST_GUIDE.md) | Guide tests détaillé |
| [gerant.routes.js](backend/src/modules/gerant/gerant.routes.js) | Endpoints specification |

---

## 📝 NOTES FINALES

✅ **Phase 3 Backend** : 100% complète et testée
✅ **Architecture** : Transactions atomiques + Socket.io temps réel
✅ **Sécurité** : Isolation multi-salle + JWT + bcrypt
✅ **Documentation** : Complète + exemples

**Prêt pour** : Frontend Phase 3.7 + Phase 4 (Client)

---

**Version** : 1.0  
**Date** : Juin 2026  
**Mainteneur** : Alessio (Backend Lead)
