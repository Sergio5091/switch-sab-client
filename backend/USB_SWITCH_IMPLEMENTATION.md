# Implémentation — Driver USB Switch Multi-Relais Arduino

> Date : Août 2026  
> Scope : backend + frontend  
> Statut : ✅ Implémenté

---

## Contexte

Le switch USB est un module Arduino multi-relais (2/4/8/16/32 canaux) branché en USB sur le serveur local.  
Il pilote l'alimentation des TVs/consoles de la salle via un protocole série 9600 baud, 8N1.  
Un seul switch par salle. Pas de retour d'état hardware possible (écriture seule).

---

## Protocole de commande

**Baudrate :** 9600  
**Format :** 8N1 (standard Arduino)

| Port | Allumer | Éteindre |
|------|---------|----------|
| 1    | `AA`    | `aa`     |
| 2    | `AB`    | `ab`     |
| …    | …       | …        |
| 26   | `AZ`    | `az`     |
| 27   | `BA`    | `ba`     |
| …    | …       | …        |
| 32   | `BF`    | `bf`     |

Fonction de génération (sans table statique, couvre tous les modèles) :

```js
function portToCommand(port, allumer = true) {
  const index = port - 1
  const premiereLettre = String.fromCharCode(65 + Math.floor(index / 26))
  const deuxiemeLettre = String.fromCharCode(65 + (index % 26))
  const code = premiereLettre + deuxiemeLettre
  return allumer ? code : code.toLowerCase()
}
```

---

## Base de données

### Colonnes ajoutées

**Table `Salle`**
```sql
ALTER TABLE "Salle" ADD COLUMN IF NOT EXISTS "usbPortPath" TEXT;
ALTER TABLE "Salle" ADD COLUMN IF NOT EXISTS "usbNbRelais" INTEGER;
```

- `usbPortPath` — chemin du port série détecté (ex: `COM3`, `/dev/ttyUSB0`)
- `usbNbRelais` — nombre de relais du modèle installé : `2`, `4`, `8`, `16` ou `32`

**Table `Poste`**
```sql
ALTER TABLE "Poste" ADD COLUMN IF NOT EXISTS "usbRelaisNumero" INTEGER;
ALTER TABLE "Poste" ADD COLUMN IF NOT EXISTS "usbDernierEtat"  TEXT DEFAULT 'OFF';
```

- `usbRelaisNumero` — numéro de port du relais attribué à ce poste (1–32)
- `usbDernierEtat` — dernier état connu : `ON` ou `OFF` (pas de lecture hardware possible)

> Note : la colonne `switchConfig` existante reste utilisée par le mode WIFI (IP du switch).  
> Elle n'est plus utilisée pour USB — le driver USB lit `usbPortPath`.

---

## Fichiers backend

### Nouveau — `src/switch/usbSwitch.js`

Driver complet remplaçant l'ancienne version stub.

**Fonctions exportées (interface obligatoire) :**

| Fonction | Description |
|----------|-------------|
| `allumerPoste(posteId)` | Lit `usbRelaisNumero` du poste, envoie la commande ON, met à jour `usbDernierEtat = 'ON'` |
| `eteindrePoste(posteId)` | Idem, commande OFF, `usbDernierEtat = 'OFF'` |
| `getStatutPoste(posteId)` | Retourne `usbDernierEtat` depuis la base (pas de lecture hardware) |
| `getAllStatuts()` | Retourne tous les postes avec `usbRelaisNumero` non null et leur `usbDernierEtat` |

**Fonctions supplémentaires (Admin) :**

| Fonction | Description |
|----------|-------------|
| `testerRelais(n)` | Impulsion ON → attente 2s → OFF (vérification physique) |
| `getStatutConnexion()` | Retourne `{ connecte: bool }` |
| `detecterSwitch()` | Liste tous les ports série ayant un `vendorId` (pas de filtre figé par fabricant) |

**Comportement `getPort()` :**
- Singleton — réutilise le port ouvert si `_port.isOpen`
- Vérifie que `usbPortPath` est toujours présent dans `SerialPort.list()` avant d'ouvrir
- Si le port a été fermé (rebranché) : déclenche `resynchroniserTousLesRelais()` puis émet `usb:resynchronisation` via Socket.io
- Sur `close` : `_port = null` + émet `usb:deconnecte` via Socket.io

**Resynchronisation automatique à la reconnexion :**

```
Pour chaque poste avec usbRelaisNumero :
  → Si session ACTIVE en base  → envoie commande ON  → usbDernierEtat = 'ON'
  → Sinon                      → envoie commande OFF → usbDernierEtat = 'OFF'
```

Limite assumée : quelques secondes de décalage entre le redémarrage physique du switch et la fin de la resync — acceptable sans confirmation hardware.

---

### Nouveau — `src/modules/admin/usb.controller.js`

5 fonctions :

| Fonction | Route | Description |
|----------|-------|-------------|
| `detecter` | `GET /admin/usb/detecter` | Liste les ports série candidats. 1 seul → `detecte: true` + port. Plusieurs → liste pour choix |
| `configurer` | `POST /admin/usb/configurer` | Enregistre `usbPortPath` + `usbNbRelais` sur la salle, passe `switchType = 'USB'` |
| `statut` | `GET /admin/usb/statut` | Retourne `{ connecte, portPath, nbRelais, switchType }` |
| `tester` | `POST /admin/usb/tester/:relais` | Déclenche une impulsion 2s sur le relais N (test physique) |
| `associerRelais` | `PATCH /admin/usb/poste/:posteId` | Associe ou dissocie un relais à un poste, avec validation doublon + limite modèle |

**Validations dans `associerRelais` :**
- `usbRelaisNumero > usbNbRelais` → erreur 400
- Même relais déjà sur un autre poste → erreur 409 avec nom du poste en conflit

---

### Modifié — `src/modules/admin/admin.routes.js`

5 routes ajoutées :

```js
router.get   ('/usb/detecter',        detecter)
router.post  ('/usb/configurer',      configurer)
router.get   ('/usb/statut',          statutUsb)
router.post  ('/usb/tester/:relais',  tester)
router.patch ('/usb/poste/:posteId',  associerRelais)
```

---

### Modifié — `src/modules/admin/salle.controller.js`

`getSalle` et `modifierSalle` : `usbPortPath` et `usbNbRelais` ajoutés au `select` Prisma des deux endpoints.

---

### Modifié — `src/modules/admin/postes.controller.js`

`listerPostesGerant` : filtre USB ajouté, symétrique au filtre Zigbee.

```js
...(salle?.switchType === 'ZIGBEE' ? { zigbeeName:       { not: null } } : {}),
...(salle?.switchType === 'USB'    ? { usbRelaisNumero:  { not: null } } : {})
```

Le gérant ne voit que les postes associés à un port relais.

---

### Non modifié — `src/switch/switchService.js`

Aucun changement nécessaire. Il routait déjà vers `./usbSwitch.js` via import dynamique :

```js
case 'USB': return await import('./usbSwitch.js')
```

---

### Dépendance ajoutée

```
serialport@12.0.0
```

---

## Événements Socket.io émis par le driver USB

| Événement | Déclencheur | Payload |
|-----------|-------------|---------|
| `usb:deconnecte` | Port série fermé (câble débranché) | `{ message: 'Switch USB déconnecté' }` |
| `usb:resynchronisation` | Reconnexion détectée, resync terminée | `{ message: 'Switch reconnecté, postes resynchronisés' }` |

---

## Fichiers frontend

### `src/services/adminService.ts`

- Interface `Poste` : + `usbRelaisNumero`, `usbDernierEtat`
- Type retour `getSalle()` : + `usbPortPath`, `usbNbRelais`
- 5 méthodes ajoutées : `usbDetecter`, `usbConfigurer`, `usbStatut`, `usbTester`, `usbAssocierRelais`

### `src/pages/setup/salle.tsx`

Zone USB du wizard de création de salle redessinée :
- Sélection du modèle : boutons `2 / 4 / 8 / 16 / 32` relais
- Bouton "Détecter le switch USB" → appelle `GET /admin/usb/detecter`
  - 1 candidat → confirmation verte automatique
  - Plusieurs candidats → liste cliquable
  - Aucun → champ de saisie manuelle
- À la soumission, appelle `POST /admin/usb/configurer` si port + modèle renseignés (non bloquant)

### `src/pages/admin/postes.tsx`

Zone USB par carte de poste (visible uniquement si `switchType === 'USB'`) :
- `<Select>` générant "Port 1" … "Port N" selon `usbNbRelais`
- Bouton "OK" pour sauvegarder l'association
- Bouton "⚡ Tester port N" visible si un port est déjà assigné → impulsion 2s

### `src/pages/gerant/dashboard.tsx`

- Import `adminService` pour les appels USB
- État `usbConnecte` chargé via `GET /admin/usb/statut` au montage + polling toutes les 30s
- Socket.io écoute `usb:deconnecte` et `usb:resynchronisation` → met à jour le badge + affiche un toast
- Badge dans le header : vert "Switch connecté" / rouge "Switch déconnecté"

---

## Flux complet — vue opérateur

### Installation initiale

1. Brancher le switch USB au PC serveur
2. Wizard setup → choisir **USB** → sélectionner le modèle → **Détecter** → confirmer le port → soumettre
3. Admin → Postes → pour chaque poste, choisir le port dans le select → **OK** → **Tester** pour vérifier

### Utilisation quotidienne

- Démarrage session → `allumerPoste()` → commande série envoyée → TV s'allume
- Fin / arrêt session → `eteindrePoste()` → commande série envoyée → TV s'éteint
- Le gérant ne voit que les postes avec un port relais assigné

### Débranchement à chaud

1. Hardware : tous les relais tombent (TVs s'éteignent physiquement)
2. Serveur : `_port = null` + `usb:deconnecte` émis
3. Sessions : continuent à tourner en base, timers actifs
4. Frontend : badge rouge + toast d'alerte chez le gérant
5. Rebranchement : à la prochaine commande, `getPort()` rouvre le port et resynchronise tous les relais

### Remplacement du switch

Admin → Paramètres → Salle → relancer la détection → choisir le nouveau port → confirmer.

---

## Limites assumées

| Limite | Raison |
|--------|--------|
| Pas de lecture d'état hardware | Le switch Arduino ne répond qu'aux commandes, pas aux requêtes d'état |
| Délai de quelques secondes après reconnexion | Le temps que `resynchroniserTousLesRelais()` termine — quelques commandes séquentielles |
| Pas de détection automatique du rebranchement | Il n'y a pas de watcher USB — la reconnexion se fait à la prochaine commande envoyée |
| `usbDernierEtat` peut diverger de l'état physique | En cas de coupure sans session active pour déclencher la resync |
