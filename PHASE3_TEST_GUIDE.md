# 🧪 PHASE 3 — GUIDE DE TEST RAPIDE

**Utiliser Postman ou équivalent pour tester les endpoints**

---

## 🔐 AUTHENTIFICATION D'ABORD

Utilisateur de test (seed) :
```
Email: admin@switch.local
Mot de passe: Admin@123
Rôle: ADMIN (le seed crée aussi 2 gérants)
```

Ou créer un gérant via :
```
POST /api/admin/gerants
{
  "pseudo": "gerant_test",
  "telephone": "22900000001",
  "motDePasse": "Test@123"
}
```

**Login** :
```javascript
POST /api/auth/login
Body: {
  "email": "admin@switch.local",
  "motDePasse": "Admin@123"
}

Response: {
  "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": { "id": 1, "role": "ADMIN", ... }
}
```

**Utiliser token dans tous les appels** :
```
Header: Authorization: Bearer <token>
```

---

## 🎯 TESTS PAR ENDPOINT

### 1️⃣ **CLIENTS**

#### **POST /gerant/clients** → Créer client
```javascript
POST http://localhost:3000/api/gerant/clients
Headers: { Authorization: Bearer <token> }
Body: {
  "pseudo": "Ahmed_Test",
  "telephone": "22900123456",
  "estEnfant": false,
  "codeParental": null
}

Expected 201: {
  "id": 12,
  "pseudo": "Ahmed_Test",
  "telephone": "22900123456",
  "motDePasseTemporaire": "a7k3J9p2"  // ← À communiquer au client
}
```

**Vérifier** :
- ✅ Crédit créé pour chaque catégorie (3 par défaut : PS4, PS5, XBOX)
- ✅ Bonus créé avec solde = 0, disponible = false

#### **GET /gerant/clients** → Lister
```javascript
GET http://localhost:3000/api/gerant/clients
Headers: { Authorization: Bearer <token> }

Expected 200: [
  {
    "id": 12,
    "pseudo": "Ahmed_Test",
    "telephone": "22900123456",
    "credits": [
      { "solde": 0, "categorie": { "nom": "PS4" } },
      { "solde": 0, "categorie": { "nom": "PS5" } },
      ...
    ],
    "bonus": { "solde": 0, "disponible": false }
  },
  ...
]
```

#### **GET /gerant/clients/:id** → Détail
```javascript
GET http://localhost:3000/api/gerant/clients/12
Headers: { Authorization: Bearer <token> }

Expected 200: {
  "id": 12,
  "pseudo": "Ahmed_Test",
  "credits": [...],
  "bonus": {...},
  "sessions": [
    { "debut": "...", "statut": "ACTIVE", "tempsRestant": 3450 },
    ...
  ]
}
```

#### **PATCH /gerant/clients/:id** → Modifier
```javascript
PATCH http://localhost:3000/api/gerant/clients/12
Headers: { Authorization: Bearer <token> }
Body: {
  "pseudo": "Ahmed_Premium",
  "email": "ahmed@test.com"
  // Autres champs omis = non modifiés
}

Expected 200: { "pseudo": "Ahmed_Premium", "email": "ahmed@test.com", ... }
```

---

### 2️⃣ **RECHARGES**

#### **POST /gerant/recharges** → Effectuer recharge
```javascript
POST http://localhost:3000/api/gerant/recharges
Headers: { Authorization: Bearer <token> }
Body: {
  "clientId": 12,
  "categorieId": 1,  // PS4 (vérifier ID via /admin/categories)
  "dureeId": 2,      // 1h (vérifier ID via /admin/categories/1/durees)
  "montant": 10000
}

Expected 201: {
  "message": "Recharge effectuée",
  "creditUpdated": {
    "ancienSolde": 0,
    "nouveauSolde": 3600  // 1h = 3600 secondes
  }
}
```

**Vérifier** :
- ✅ Crédit du client augmenté de duree.secondes
- ✅ Transaction enregistrée (type: RECHARGE_GERANT)

#### **GET /gerant/recharges/en-attente** → Demandes
```javascript
GET http://localhost:3000/api/gerant/recharges/en-attente
Headers: { Authorization: Bearer <token> }

Expected 200: [
  {
    "id": 1,
    "clientId": 5,
    "client": { "pseudo": "Client5", "telephone": "..." },
    "montant": 5000,
    "date": "2026-06-02T10:30:00Z",
    "type": "RECHARGE_CLIENT"
  }
]
// Sera vide si pas de demandes
```

#### **POST /gerant/recharges/:id/valider** → Valider
```javascript
POST http://localhost:3000/api/gerant/recharges/1/valider
Headers: { Authorization: Bearer <token> }

Expected 200: {
  "message": "Recharge validée",
  "secondesGagnes": 1800,  // Exemple : 5000 FCFA → 1800s
  "nouveauSolde": 1800
}
```

---

### 3️⃣ **SESSIONS** ⭐ PARTIE CRITIQUE

#### **POST /gerant/sessions** → Démarrer session
```javascript
POST http://localhost:3000/api/gerant/sessions
Headers: { Authorization: Bearer <token> }
Body: {
  "clientId": 12,
  "categorieId": 1,  // PS4
  "dureeId": 2,      // 1h
  "useBonus": false  // Utiliser bonus ou crédit catégorie
}

Expected 201: {
  "message": "Session démarrée",
  "session": {
    "id": 5,
    "clientId": 12,
    "clientPseudo": "Ahmed_Test",
    "posteId": 1,
    "tempsRestant": 3600,
    "statut": "ACTIVE",
    "estBonus": false,
    "debut": "2026-06-02T12:30:45.123Z"
  }
}
```

**Vérifier IMMÉDIATEMENT** :
1. Base de données :
   ```sql
   -- Crédit débité
   SELECT * FROM "Credit" WHERE id = (
     SELECT id FROM "Credit" WHERE "clientId" = 12 AND "categorieId" = 1
   );
   -- Doit afficher solde = 0 (3600 - 3600)
   
   -- Session créée
   SELECT * FROM "Session" WHERE id = 5;
   -- Doit afficher statut = 'ACTIVE'
   
   -- Poste occupé
   SELECT * FROM "Poste" WHERE id = 1;
   -- Doit afficher statut = 'OCCUPE'
   ```

2. Frontend (via Socket.io) :
   ```javascript
   // Doit recevoir dans la console du navigateur :
   session:start {
     sessionId: 5,
     posteId: 1,
     clientId: 12,
     tempsRestant: 3600,
     estBonus: false
   }
   ```

3. Switch mock :
   ```
   // Vérifier logs backend
   // "Poste 1 allumé" (mockSwitch)
   ```

#### **Socket.io : session:tick** → Countdown (TEST EN CONTINU)
```
// Ouvrir console navigateur et exécuter :
socket.on('session:tick', (data) => {
  console.log(`[TICK] Session ${data.sessionId}: ${data.tempsRestant}s`)
})

// Dans les logs, voir :
[TICK] Session 5: 3599s
[TICK] Session 5: 3598s
[TICK] Session 5: 3597s
... (chaque 1 seconde)
```

**Attendre quelques secondes**, puis vérifier DB :
```sql
-- Chaque 10s, tempsRestant doit être mis à jour en DB
SELECT "tempsRestant", "updatedAt" FROM "Session" WHERE id = 5;
```

#### **GET /gerant/sessions** → Lister sessions actives
```javascript
GET http://localhost:3000/api/gerant/sessions
Headers: { Authorization: Bearer <token> }

Expected 200: [
  {
    "id": 5,
    "client": { "pseudo": "Ahmed_Test", "telephone": "..." },
    "poste": { "nom": "PS4-1" },
    "duree": { "libelle": "1H", "secondes": 3600 },
    "tempsRestant": 3580,  // ~ 59:40 restant
    "statut": "ACTIVE",
    "estBonus": false,
    "debut": "2026-06-02T12:30:45.123Z"
  }
]
```

#### **GET /gerant/sessions/:id** → Détail
```javascript
GET http://localhost:3000/api/gerant/sessions/5
Headers: { Authorization: Bearer <token> }

Expected 200: {
  "id": 5,
  "client": { "pseudo": "Ahmed_Test", "estEnfant": false },
  "poste": { "id": 1, "nom": "PS4-1", "statut": "OCCUPE" },
  "duree": { "libelle": "1H", "secondes": 3600 },
  "tempsRestant": 3580,
  "statut": "ACTIVE",
  "gerant": { "pseudo": "gerant_test" }
}
```

#### **POST /gerant/sessions/:id/arreter** → Arrêt manuel
```javascript
// Attendre ~10-20 secondes après POST /sessions
// Puis arrêter manuellement

POST http://localhost:3000/api/gerant/sessions/5/arreter
Headers: { Authorization: Bearer <token> }

Expected 200: {
  "message": "Session arrêtée",
  "tempsRestantConserve": 3450  // Temps conservé pour client
}
```

**Vérifier** :
- ✅ Session statut = ARRETEE
- ✅ Poste statut = LIBRE (disponible pour autre)
- ✅ Socket.io reçoit `session:stop`
- ✅ Timer en mémoire supprimé

#### **Socket.io : session:end** → Fin automatique (TEST APRÈS 10 MIN)
```
// Laisser tourner la session ~10 minutes
// À tempsRestant = 0, doit recevoir :

socket.on('session:end', (data) => {
  console.log(`Session ${data.sessionId} terminée sur poste ${data.posteId}`)
})
```

**Vérifier** :
- ✅ Session statut = TERMINEE
- ✅ Poste statut = LIBRE
- ✅ Bonus augmenté (si ConfigBonus.ratioSecondes > 0)
- ✅ Socket.io end reçu

---

### 4️⃣ **RAPPORTS**

#### **GET /gerant/rapport/jour** → Rapport du jour
```javascript
GET http://localhost:3000/api/gerant/rapport/jour
Headers: { Authorization: Bearer <token> }

Expected 200: {
  "date": "2026-06-02",
  "gerant": "gerant_test",
  "resume": {
    "totalSessions": 3,
    "totalMontant": 30000,
    "totalSecondes": "180m",  // 3h = 180 min
    "sessionNormale": 2,
    "sessionBonus": 1
  },
  "parCategorie": {
    "PS4": { "nombre": 2, "montant": 20000, "secondes": 3600 },
    "PS5": { "nombre": 1, "montant": 10000, "secondes": 3600 }
  },
  "parClient": {
    "Ahmed_Test": { "nombre": 2, "montant": 20000, ... },
    "Fatou_Test": { "nombre": 1, "montant": 10000, ... }
  },
  "detail": [...]
}
```

#### **GET /gerant/rapport/periode** → Période custom
```javascript
GET http://localhost:3000/api/gerant/rapport/periode?debut=2026-06-01&fin=2026-06-03
Headers: { Authorization: Bearer <token> }

Expected 200: {
  "periode": "2026-06-01 à 2026-06-03",
  "resume": { ... },
  "detail": [ ... ]
}
```

---

## 🚨 TESTS D'ERREUR (Vérifier messages d'erreur)

### **Crédit insuffisant**
```javascript
POST /gerant/sessions
Body: { 
  "clientId": 12, 
  "categorieId": 1, 
  "dureeId": 1  // Durée plus longue que crédit
}

Expected 400: {
  "message": "Crédit insuffisant pour cette catégorie"
}
```

### **Poste déjà occupé**
```javascript
// Lancer 2 sessions simultanées sur même catégorie (max 1 poste)
POST /gerant/sessions (1e fois → OK)
POST /gerant/sessions (2e fois)

Expected 400: {
  "message": "Aucun poste libre dans cette catégorie"
}
```

### **Client inexistant**
```javascript
POST /gerant/recharges
Body: { 
  "clientId": 999  // ID inexistant
}

Expected 404: {
  "message": "Client introuvable"
}
```

### **Non authentifié**
```javascript
GET /gerant/clients
// Sans header Authorization

Expected 401: {
  "message": "Token manquant"
}
```

---

## 📋 CHECKLIST DE TEST COMPLET

### **Phase 1 : Préparation**
- [ ] Démarrer backend (npm start)
- [ ] Vérifier DB connectée
- [ ] Seed exécuté ✅
- [ ] Obtenir token admin via login

### **Phase 2 : Clients**
- [ ] POST créer Ahmed → 201 ✅
- [ ] POST créer Fatou → 201 ✅
- [ ] GET lister → 2+ clients ✅
- [ ] GET détail Ahmed → crédits = 0 ✅
- [ ] PATCH Ahmed → pseudo changé ✅

### **Phase 3 : Recharges**
- [ ] POST recharge Ahmed 1h PS4 → ✅
- [ ] Vérifier crédit = 3600s ✅
- [ ] GET recharges en-attente → empty ✅

### **Phase 4 : Sessions** ⭐
- [ ] POST démarrer → 201 ✅
- [ ] Vérifie DB (crédit débité, poste OCCUPE) ✅
- [ ] Socket.io reçoit session:start ✅
- [ ] socket:tick continue 1s/1s ✅
- [ ] GET sessions → affiche session ✅
- [ ] POST arrêter (après 20s) → 200 ✅
- [ ] Vérifie DB (statut ARRETEE, poste LIBRE) ✅
- [ ] Socket.io reçoit session:stop ✅

### **Phase 5 : Fin auto**
- [ ] Créer session 30s PS4 ✅
- [ ] Attendre fin (~30s) ✅
- [ ] Socket.io reçoit session:end ✅
- [ ] Bonus augmenté ✅

### **Phase 6 : Rapports**
- [ ] GET rapport/jour → 2+ sessions ✅
- [ ] Statistiques corrects ✅
- [ ] GET rapport/periode → 2+ sessions ✅

---

## 💡 TIPS

1. **Postman** : Créer collection avec tous les endpoints
2. **Logs backend** : `npm start` affiche tout en console
3. **Socket.io** : Utiliser DevTools (onglet Network → WS)
4. **DB** : `psql -U postgres -d switch_sab` pour requêtes manuelles
5. **Timeout** : Augmenter si tests lents (réseau lent)

---

**Généré** : Juin 2026
