# Changelog — Flux d'installation et découplage licence/salle

## Contexte

Lors d'une première installation sur un Raspberry Pi, la vérification de licence échouait
systématiquement car le `salleId` contenu dans le fichier JSON de licence ne correspondait
pas à l'`id` auto-incrémenté de la table `Salle` (contrainte FK violée).

De plus, il n'existait aucun workflow guidé pour configurer la salle avant d'activer la licence.

---

## Modifications backend

### 1. `prisma/schema.prisma`

**Suppression de la relation FK entre `LicenceLocale` et `Salle`.**

Avant :
```prisma
model Salle {
  ...
  licences    LicenceLocale[]
}

model LicenceLocale {
  ...
  salleId   Int
  salle     Salle @relation(fields: [salleId], references: [id])
}
```

Après :
```prisma
model Salle {
  // plus de: licences LicenceLocale[]
}

model LicenceLocale {
  ...
  salleId   Int  // référence Super Admin — pas de FK sur Salle
}
```

Le `salleId` reste stocké dans `LicenceLocale` à titre de référence de traçabilité
pour le Super Admin. Il ne pilote plus aucune contrainte en base locale.

**Impact :** le format du fichier JSON de licence reste inchangé. Aucune modification
côté génération de licence chez le Super Admin.

---

### 2. `src/services/licenceService.js`

Suppression du `include: { salle: true }` dans `getLicenceActive()` — la relation
n'existant plus dans le schéma, l'include était devenu invalide.

```js
// Avant
return prisma.licenceLocale.findFirst({
  where: { status: 'ACTIVE' },
  include: { salle: true }
})

// Après
return prisma.licenceLocale.findFirst({
  where: { status: 'ACTIVE' }
})
```

---

### 3. `src/modules/setup/setup.controller.js` *(nouveau)*

Deux endpoints pour le wizard de première installation :

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/api/setup/statut` | Indique si une salle est déjà configurée (`{ salleConfiguree: boolean }`) |
| `POST` | `/api/setup/salle` | Crée la salle initiale. Échoue avec 409 si une salle existe déjà. |

Champs attendus pour `POST /api/setup/salle` :
```json
{
  "nom": "Gaming Zone Cotonou",
  "pays": "Bénin",
  "ville": "Cotonou",
  "quartier": "Akpakpa",
  "telephone": "+229 0197000000",
  "switchType": "WIFI",
  "switchConfig": "192.168.1.100"
}
```

---

### 4. `src/modules/setup/setup.routes.js` *(nouveau)*

Routeur Express pour les deux endpoints setup.

---

### 5. `src/index.js`

- Import et montage de `setupRoutes` sur `/api/setup`

---

### 6. `src/middlewares/licence.middleware.js`

Ajout de `/api/setup` dans la liste des routes exemptées du middleware `requireLicence`,
afin que la création de salle soit possible avant toute activation de licence.

```js
const exemptee =
  originalUrl === '/api/auth/login'      ||
  originalUrl === '/api/auth/register'   ||
  originalUrl.startsWith('/api/licence') ||
  originalUrl.startsWith('/api/setup')   // ← ajouté
```

---

## Modifications frontend

### 7. `src/contexts/AppContext.tsx`

- Ajout de l'état `salleConfiguree: boolean | null`
- Ajout de la méthode `checkSetupStatut()` — appelle `GET /api/setup/statut`
- Dans `login()` : si le rôle est `admin`, vérifie d'abord si la salle est configurée
  avant de vérifier le statut de la licence
- Le retour de `login()` inclut désormais `salleRequired: boolean`

---

### 8. `src/pages/login.tsx`

Priorité de redirection après connexion admin :

```
salleRequired: true   → /setup/salle
licenceRequired: true → /admin/licence
sinon                 → /admin/dashboard
```

---

### 9. `src/pages/setup/salle.tsx` *(nouveau)*

Page de configuration de la salle — première étape du wizard d'installation.

- Formulaire : nom, pays, ville, quartier, téléphone, type de switch (WIFI/USB), config switch
- Indicateur visuel des 2 étapes (Salle → Licence)
- Appelle `POST /api/setup/salle`
- Après succès → redirect automatique vers `/admin/licence` (étape 2)
- Protection : si l'utilisateur connecté n'est pas admin, redirect vers `/login`

---

### 10. `src/App.tsx`

Ajout de la route `/setup/salle` pointant vers `SetupSallePage`.

---

## Flux d'installation complet

```
Première installation
─────────────────────
1. Seed exécuté sur le serveur → compte admin créé en BDD
2. Admin ouvre l'app → page /login
3. Login avec identifiants seed
   → salleRequired: true → redirect /setup/salle
4. Formulaire salle rempli → POST /api/setup/salle
   → redirect /admin/licence
5. Chargement du fichier JSON de licence → POST /api/licence/activer
   → redirect /admin/dashboard ✅

Renouvellement de licence (expiration)
───────────────────────────────────────
1. Admin se connecte
   → salleRequired: false (salle déjà créée)
   → licenceRequired: true → redirect /admin/licence directement
2. Chargement du nouveau JSON → app débloquée ✅

Fonctionnement normal
──────────────────────
1. Admin se connecte
   → salleRequired: false, licenceRequired: false
   → redirect /admin/dashboard ✅
```

---

## Migration base de données

Après ces modifications, supprimer la base existante et relancer depuis zéro :

```bash
cd backend
npx prisma migrate dev --name init
node prisma/seed.js
```

Ou sur une base existante (migration incrémentale) :

```bash
cd backend
npx prisma migrate dev --name remove_licence_salle_fk
```
