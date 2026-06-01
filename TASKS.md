# Switch SAB — App Salle (Projet 2) — Plan de tâches

**Stack** : React · Node.js/Express · PostgreSQL · Prisma · Socket.io  
**Équipe** : Alessio (backend) · Mathieu (frontend) · Sergio (IoT/switch)

---

## ⚠️ Notes critiques

- **Ordre obligatoire** : Admin → Gérant → Client. Ne pas commencer le frontend d'un rôle sans que son backend soit terminé et testé.
- **Switch physique** : si Sergio est en retard, utiliser `mockSwitch.js` pour ne pas bloquer.
- **Licence hors-ligne** : vérification RSA avec clé publique uniquement. La clé privée reste dans le Projet 1.
- **Isolation multi-salle** : toutes les requêtes filtrent par `salleId` extrait du JWT. Impossible à corriger après coup.
- **Temps réel** : le décompte et l'extinction automatique nécessitent Socket.io. À anticiper dès la Phase 3.
- **3 soldes par client** : crédit par catégorie (secondes), bonus (secondes), code promo. Trois modules séparés.
- **Coupons PDF** : 40 par A4, 3cm×2cm. Prévoir PDFKit ou Puppeteer.

---

## PHASE 0 — Fondations ✅

### 0.1 — Schéma base de données
- [x] Modéliser toutes les tables (Salle, User, Categorie, Duree, Poste, Session, Credit, Transaction, Coupon, Bonus, ConfigBonus, PromoCode, Promo, LicenceLocale)
- [x] `salleId` comme clé étrangère sur toutes les tables métier
- [x] Contraintes d'intégrité (FK, unicité, index)
- [x] Schéma Prisma finalisé

### 0.2 — Structure backend
- [x] Projet Node.js/Express (ESM)
- [x] Connexion PostgreSQL via Prisma + adapter PG
- [x] Structure dossiers : `modules/`, `middlewares/`, `services/`, `switch/`, `config/`
- [x] Variables d'environnement (`.env.example`)
- [x] Logger (`config/logger.js`)
- [x] `prismaClient.js` centralisé

### 0.3 — Middlewares de base
- [x] `auth.middleware.js` → `verifyJwt` + `requireRole`
- [x] `licence.middleware.js` → vérification licence au démarrage + blocage routes

### 0.4 — Module switch
- [x] `mockSwitch.js` — simulateur 6 postes
- [x] `switchService.js` — routeur USB/WIFI automatique
- [x] `usbSwitch.js` — squelette Phase 6.1 (Sergio)
- [x] `wifiSwitch.js` — squelette Phase 6.2 (Sergio)

### 0.5 — Seed initial
- [x] Salle Switch SAB Cotonou
- [x] 1 Admin, 2 Gérants, 5 Clients
- [x] Catégories PS4 / PS5 / XBOX avec durées et prix
- [x] 6 postes (2 par catégorie)
- [x] ConfigBonus par salle

---

## PHASE 1 — Auth + Licence

### 1.1 — Authentification (Alessio)
- [x] `POST /auth/login` → `{ telephone | email, motDePasse }` → JWT
- [x] JWT payload : `{ id, role, salle_id, exp }`
- [x] `POST /auth/register` → créer compte client (pseudo, téléphone)
- [x] `GET /auth/me` → utilisateur courant (protégé JWT)
- [x] Validation unicité pseudo et téléphone

### 1.2 — Licence hors-ligne (Alessio)
- [ ] Copier `public-key.pem` depuis Projet 1 → `keys/public-key.pem`
- [ ] Implémenter `verifyLicencePayload(payload, signature)` avec RSA
- [ ] `GET /licence/statut` → jours restants + statut
- [ ] `POST /licence/activer` → installer une nouvelle licence (JSON signé)
- [ ] Finaliser `licence.middleware.js` avec vérification RSA réelle

### 1.3 — Interface Auth (Mathieu)
- [ ] Page de login unique (réutilisée pour tous les rôles)
- [ ] Lecture du JWT → redirection vers le bon dashboard selon le rôle
- [ ] Contexte d'authentification global (React Context ou Zustand)
- [ ] Intercepteur Axios avec JWT
- [ ] Page d'erreur licence expirée

---

## PHASE 2 — Admin

> Backend terminé et testé avant de commencer le frontend.

### 2.1 — Catégories (Alessio)
- [ ] `POST /admin/categories`
- [ ] `GET /admin/categories`
- [ ] `PATCH /admin/categories/:id`
- [ ] `DELETE /admin/categories/:id`

### 2.2 — Durées et prix (Alessio)
- [ ] `POST /admin/categories/:id/durees`
- [ ] `GET /admin/categories/:id/durees`
- [ ] `PATCH /admin/durees/:id`
- [ ] `DELETE /admin/durees/:id`

### 2.3 — Postes (Alessio)
- [ ] `POST /admin/postes`
- [ ] `GET /admin/postes`
- [ ] `PATCH /admin/postes/:id`
- [ ] `DELETE /admin/postes/:id`

### 2.4 — Gérants (Alessio)
- [ ] `POST /admin/gerants` → créer compte gérant
- [ ] `GET /admin/gerants`
- [ ] `PATCH /admin/gerants/:id` → modifier / désactiver

### 2.5 — Configuration bonus (Alessio)
- [ ] `POST /admin/bonus/config`
- [ ] `GET /admin/bonus/config`
- [ ] `PATCH /admin/bonus/config`

### 2.6 — Configuration codes promo (Alessio)
- [ ] `GET /admin/promo/config`
- [ ] `PATCH /admin/promo/config`

### 2.7 — Coupons (Alessio)
- [ ] `POST /admin/coupons/generer` → `{ nombre, valeur }` → génère N coupons
- [ ] Charset sans O ni 0 : `ABCDEFGHIJKLMNPQRSTUVWXYZ123456789`, format `XXXX-XXXX`
- [ ] `GET /admin/coupons` → `?statut=actif|utilise`
- [ ] `GET /admin/coupons/pdf` → PDF A4, 40 coupons, 3cm×2cm (nom salle + valeur + quartier)

### 2.8 — Promotions (Alessio)
- [ ] `POST /admin/promotions`
- [ ] `GET /admin/promotions`
- [ ] `POST /admin/promotions/:id/envoyer` → SMS/WhatsApp (Twilio — Phase 2.8)

### 2.9 — Interface Admin (Mathieu)
- [ ] Dashboard : vue synthétique de la salle
- [ ] Gestion catégories (CRUD)
- [ ] Gestion durées/prix par catégorie (CRUD)
- [ ] Gestion postes (CRUD + upload image)
- [ ] Gestion gérants (CRUD)
- [ ] Configuration bonus (formulaire)
- [ ] Configuration codes promo (formulaire)
- [ ] Gestion coupons : génération + téléchargement PDF
- [ ] Espace promotion : éditeur + bouton envoi
- [ ] Affichage licence (jours restants)
- [ ] Sélecteur switch USB / WIFI

---

## PHASE 3 — Gérant

> Backend terminé et testé avant de commencer le frontend.

### 3.1 — Gestion des clients (Alessio)
- [ ] `POST /gerant/clients` → créer client (pseudo, téléphone, flag enfant + code parental)
- [ ] `GET /gerant/clients`
- [ ] `GET /gerant/clients/:id` → détail (soldes crédit, bonus, sessions)
- [ ] `PATCH /gerant/clients/:id`

### 3.2 — Recharges gérant (Alessio)
- [ ] `POST /gerant/recharges` → recharger compte client (catégorie + durée)
- [ ] Déduction solde monétaire + crédit durée sur compte catégorie
- [ ] Enregistrement transaction (heure, gérant, client, durée, montant)

### 3.3 — Validation recharges client (Alessio)
- [ ] `GET /gerant/recharges/en-attente`
- [ ] `POST /gerant/recharges/:id/valider` → valider après encaissement cash

### 3.4 — Sessions (Alessio + Sergio)
- [ ] `POST /gerant/sessions` → démarrer session (client, poste, durée)
  - [ ] Vérifier crédit catégorie suffisant
  - [ ] Déduire durée du compte catégorie
  - [ ] Appeler `switchService.allumerPoste(posteId)`
  - [ ] Démarrer décompte temps réel (Socket.io)
  - [ ] Extinction automatique à zéro (`setTimeout` → `switchService.eteindrePoste`)
- [ ] `POST /gerant/sessions/:id/arreter` → arrêt manuel
  - [ ] Appeler `switchService.eteindrePoste(posteId)`
  - [ ] Conserver temps restant sur le compte client

### 3.5 — Socket.io — décompte temps réel (Alessio)
- [ ] Événement `session:start` → `{ sessionId, posteId, tempsRestant }`
- [ ] Événement `session:tick` → `{ sessionId, posteId, tempsRestant }` (chaque seconde)
- [ ] Événement `session:end` → `{ sessionId, posteId }` (fin automatique)
- [ ] Événement `session:stop` → `{ sessionId, posteId }` (arrêt manuel)

### 3.6 — Rapport du jour gérant (Alessio)
- [ ] `GET /gerant/rapport/jour` → sessions du jour pour ce gérant
  - Champs : client, heure début/fin, durée, valeur, poste, flag bonus

### 3.7 — Interface Gérant (Mathieu)
- [ ] Grille des postes : image personnalisée + décompte temps réel
- [ ] Badge par poste : temps restant + indicateur actif/libre
- [ ] Bouton arrêt sur chaque poste actif
- [ ] Panneau session : sélecteur client / catégorie / durée → bouton activer
- [ ] Liste recharges clients en attente de validation
- [ ] Formulaire création/recherche client
- [ ] Rapport du jour (tableau)
- [ ] Intégration Socket.io (mise à jour décompte en temps réel)

---

## PHASE 4 — Client

> Backend terminé et testé avant de commencer le frontend.

### 4.1 — Recharge client (Alessio)
- [ ] `POST /client/recharges` → demande de recharge → statut "en attente"

### 4.2 — Activation coupon (Alessio)
- [ ] `POST /client/coupons/activer` → saisir code coupon → crédit solde
- [ ] Vérification validité + marquage coupon utilisé

### 4.3 — Sessions client self-service (Alessio)
- [ ] `GET /client/postes-disponibles` → postes libres par catégorie
- [ ] `POST /client/sessions` → démarrer session (même logique que gérant)
- [ ] `POST /client/sessions/bonus` → démarrer session sur compte bonus (si disponible)

### 4.4 — Code promo (Alessio)
- [ ] `GET /client/mon-code-promo` → code promo personnel
- [ ] Lors de l'inscription avec code promo : créditer bonus invité + bonus parrain

### 4.5 — Compte bonus (Alessio)
- [ ] Calcul automatique bonus après chaque session (selon `ConfigBonus`)
- [ ] Vérification seuil → bonus rendu disponible si atteint
- [ ] Remise à zéro si inactif depuis `validitejours`
- [ ] `GET /client/mon-bonus` → solde + statut (disponible / en accumulation)

### 4.6 — Promotions client (Alessio)
- [ ] `GET /client/promotions` → promotions actives de la salle

### 4.7 — Interface Client mobile-first (Mathieu)
- [ ] Page d'accueil : postes disponibles par catégorie (libre/occupé)
- [ ] Affichage soldes (crédit catégorie + bonus)
- [ ] Bouton recharger → formulaire demande
- [ ] Saisie code coupon
- [ ] Code promo personnel (à partager)
- [ ] Vue promotions en cours
- [ ] Suivi session en cours (décompte visible)
- [ ] Classement meilleurs joueurs

---

## PHASE 5 — Rapports Admin

### 5.1 — Endpoints rapports (Alessio)
- [ ] `GET /admin/rapports?debut=&fin=&gerant_id=&poste_id=&client_id=&periode=`
  - [ ] Calcul montant total par période
  - [ ] Flag sessions bonus vs normales
- [ ] `GET /admin/rapports/export` → CSV ou PDF

### 5.2 — Interface rapports (Mathieu)
- [ ] Tableau avec filtres : jour / semaine / mois / période / gérant / poste / client
- [ ] Total en bas de tableau
- [ ] Indicateur visuel sessions bonus vs normales
- [ ] Bouton export (CSV / PDF)

---

## PHASE 6 — IoT Switch (en parallèle dès Phase 3)

### 6.1 — Driver USB (Sergio)
- [ ] Implémenter `usbSwitch.allumerPoste(posteId)`
- [ ] Implémenter `usbSwitch.eteindrePoste(posteId)`
- [ ] Implémenter `usbSwitch.getStatutPoste(posteId)`
- [ ] Gestion erreurs (poste non répondu, switch déconnecté)
- [ ] Tests allumage/extinction sur chaque port USB

### 6.2 — Driver WIFI (Sergio)
- [ ] Implémenter `wifiSwitch.allumerPoste(posteId)`
- [ ] Implémenter `wifiSwitch.eteindrePoste(posteId)`
- [ ] Implémenter `wifiSwitch.getStatutPoste(posteId)`
- [ ] Gestion erreurs réseau
- [ ] Tests allumage/extinction

### 6.3 — Routes switch (Alessio)
- [ ] `POST /switch/allumer` → `{ posteId }`
- [ ] `POST /switch/eteindre` → `{ posteId }`
- [ ] `GET /switch/statut/:posteId`
- [ ] `GET /switch/statuts`

---

## PHASE 7 — Finalisation

### 7.1 — Sécurité (Alessio + Mathieu)
- [ ] Vérifier que chaque route valide JWT + rôle
- [ ] Vérifier isolation `salleId` sur toutes les requêtes
- [ ] Tests cas limites : coupon déjà utilisé, licence expirée, solde insuffisant, poste occupé
- [ ] Tests décompte temps réel sur longue durée
- [ ] Tests commandes switch USB + WIFI en conditions réelles

### 7.2 — PDF coupons (Alessio + Mathieu)
- [ ] Finaliser génération PDF A4 : 40 coupons, 3cm×2cm, nom salle + valeur + quartier
- [ ] Téléchargeable depuis interface admin

### 7.3 — Polish interface (Mathieu)
- [ ] Upload image personnalisée par poste
- [ ] Numéro service technique visible en permanence (+229 0197691879)
- [ ] Affichage durée restante licence
- [ ] Classement meilleurs joueurs

### 7.4 — Déploiement (Alessio)
- [ ] Configuration environnement production
- [ ] Sauvegardes automatiques PostgreSQL
- [ ] HTTPS
- [ ] Documentation installation pour chaque nouvelle salle

---

## Récapitulatif ordre de livraison

| Ordre | Phase | Qui | Débloque |
|---|---|---|---|
| 1 | 0 — Fondations | Tous | ✅ Fait |
| 2 | 1 — Auth + Licence | Alessio + Mathieu | Toutes les routes protégées |
| 3 | 2 — Admin | Alessio + Mathieu | Catégories, postes, gérants |
| 4 | 3 — Gérant | Alessio + Mathieu + Sergio | Sessions, recharges, rapport jour |
| 5 | 4 — Client | Alessio + Mathieu | Self-service, coupons, bonus |
| 6 | 5 — Rapports | Alessio + Mathieu | Visibilité complète admin |
| 7 | 6 — IoT Switch | Sergio (en parallèle dès Phase 3) | Contrôle physique des TV |
| 8 | 7 — Finalisation | Tous | Livraison finale |
