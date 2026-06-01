# Guide de Configuration et Dépannage

## ✅ Configuration rapide

### 1. Backend - Port 3000

```bash
cd backend
npm install
npx prisma migrate dev
npm run seed
npm run dev
```

**Vérifier que le backend fonctionne :**
```bash
curl http://localhost:3000
# Devrait retourner: { "message": "Switch SAB App — API opérationnelle ✅" }
```

### 2. Frontend - Port 5173

```bash
cd frontend
npm install
npm run dev
```

**Le frontend doit accéder au backend sur `http://localhost:3000/api`**

---

## 🔐 Identifiants de test

Le backend a maintenant des utilisateurs pré-créés :

| Rôle | Email | Mot de passe |
|------|-------|-------------|
| Admin | `admin@switch.bj` | `admin123` |
| Gérant | `gerant@switch.bj` | `admin123` |
| Client | `client@switch.bj` | `admin123` |

---

## 🚀 Architecture d'authentification

### Frontend Flow:
1. **Page Login** → appelle `authService.login(email, password)`
2. **authService** → appelle axios vers `POST /api/auth/login`
3. **Interceptor axios** → ajoute le token JWT automatiquement à chaque requête
4. **AppContext** → stocke l'utilisateur et le token en localStorage
5. **Router** → redirige selon le rôle

### Backend Flow:
1. **POST /auth/login** → valide les identifiants
2. Génère un JWT token valide pour 12h
3. Retourne `{ token, user }`
4. Chaque route protégée vérifie le JWT

---

## 🔍 Problèmes courants et solutions

### ❌ "Erreur de connexion. Vérifiez que le serveur est démarré."

**Causes possibles :**
1. Backend n'est pas démarré
   ```bash
   # Vérifier en terminal backend:
   npm run dev
   # Devrait afficher: "Server is running on port 3000"
   ```

2. Port 3000 déjà utilisé
   ```bash
   # Chercher le processus qui utilise le port:
   # Sur Windows:
   netstat -ano | findstr :3000
   # Sur Mac/Linux:
   lsof -i :3000
   ```

3. `.env` frontend a le mauvais port
   ```bash
   # Vérifier dans frontend/.env:
   cat frontend/.env
   # Doit contenir: VITE_API_URL=http://localhost:3000/api
   # PAS http://localhost:3001/api
   ```

### ❌ "Email ou mot de passe incorrect"

**Causes possibles :**
1. Les utilisateurs de test ne sont pas créés
   ```bash
   # Relancer le seed:
   cd backend
   npm run seed
   ```

2. Le format du mot de passe n'est pas correct
   ```bash
   # Vérifier que le backend reçoit: motDePasse (pas password)
   # Voir: backend/src/modules/auth/auth.controller.js
   ```

### ❌ "Cannot read property 'email' of null"

**Cause :** La base de données est vide
```bash
cd backend
npx prisma migrate dev
npm run seed
```

---

## 🛠 Configuration des services

### Si vous avez besoin de modifier les endpoints:

1. **Backend URL** → `frontend/.env` → `VITE_API_URL`
2. **JWT Secret** → `backend/.env` → `JWT_SECRET` (doit être identique entre les deux)
3. **Durée du token** → `backend/src/modules/auth/auth.controller.js` → `expiresIn: '12h'`

### Services disponibles:

- `/api/auth/login` - Login
- `/api/auth/register` - Register (si implémenté)
- `/api/auth/me` - Get current user
- `/api/admin/*` - Admin routes (nécessite role="admin")
- `/api/gerant/*` - Gérant routes (nécessite role="gerant")
- `/api/client/*` - Client routes (nécessite role="client")

---

## 📋 Checklist avant de commencer

- [ ] Backend démarré sur port 3000
- [ ] Frontend démarré sur port 5173
- [ ] `.env` frontend avec `VITE_API_URL=http://localhost:3000/api`
- [ ] Database PostgreSQL configurée
- [ ] Seed lancé (`npm run seed`)
- [ ] Utilisateurs de test créés
- [ ] Pas d'erreur CORS (vérifier `backend/config/cors.js`)
- [ ] Pas d'erreur 401 (vérifier JWT_SECRET dans `.env`)

---

## 🧪 Test avec cURL

```bash
# 1. Test backend disponible
curl http://localhost:3000

# 2. Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@switch.bj",
    "motDePasse": "admin123"
  }'

# 3. Résultat attendu:
# {
#   "token": "eyJhbGciOiJIUzI1NiIs...",
#   "user": {
#     "id": 1,
#     "pseudo": "admin",
#     "email": "admin@switch.bj",
#     "role": "ADMIN",
#     ...
#   }
# }

# 4. Utiliser le token pour une route protégée
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  http://localhost:3000/api/auth/me
```

---

## 📞 Support

Si vous avez toujours des problèmes:
1. Vérifiez les logs du backend (`npm run dev`)
2. Vérifiez les erreurs dans la console du navigateur (F12)
3. Vérifiez le Network tab pour voir les requêtes réelles
4. Vérifiez que les variables d'environnement sont correctes
