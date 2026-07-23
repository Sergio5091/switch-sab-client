# Roadmap détaillée — Provisioning réseau WiFi (AP/Station) + mDNS pour Switch SAB Client

> Ce document explique **quoi faire**, **pourquoi**, et **comment**, à chaque étape. Il est pensé pour être suivi avec un assistant de code (Kiro ou autre) sans avoir besoin de revenir demander du contexte à chaque tâche.

---

## 1. Contexte général — à lire avant de commencer

### Le problème concret à résoudre

Aujourd'hui, l'Orange Pi qui fait tourner l'application Switch SAB Client est configuré manuellement : quelqu'un de technique se connecte en SSH, tape `nmcli device wifi connect "NomDuWifi" password "..."`, et ajuste les fichiers `.env` avec la bonne IP.

Ça fonctionne pour du développement, mais ça ne fonctionne **pas du tout** pour une vraie salle de jeux physique. Le Pi va être livré à un gérant qui n'a ni les compétences, ni l'envie, de faire du SSH. Il faut donc un mécanisme où le Pi **se présente lui-même** au gérant et lui permet de le connecter à son WiFi via une interface simple, comme le ferait n'importe quel objet connecté grand public (chromecast, imprimante WiFi, ampoule connectée...).

### Le principe général de la solution — vue d'ensemble

```
Premier démarrage du Pi (jamais configuré, chez le gérant)
        │
        ▼
Aucune connexion WiFi "Station" (= client normal) n'est trouvée
        │
        ▼
Le Pi CRÉE lui-même un réseau WiFi temporaire : "SwitchSAB-Setup"
(le Pi joue ici le rôle d'un routeur/hotspot, pas d'un client)
        │
        ▼
Le gérant, avec son téléphone, se connecte à "SwitchSAB-Setup"
(exactement comme il se connecterait à n'importe quel WiFi)
        │
        ▼
Il ouvre son navigateur → une page web s'affiche
Cette page montre la liste des VRAIS réseaux WiFi que le Pi capte
        │
        ▼
Le gérant choisit le réseau de sa salle, tape le mot de passe, valide
        │
        ▼
Le Pi se connecte à ce vrai réseau (mode Station)
Le Pi arrête de diffuser "SwitchSAB-Setup" (plus besoin)
        │
        ▼
Le Pi est maintenant sur le réseau de la salle, avec une IP qui peut
changer à tout moment (comme n'importe quel appareil) — mais on peut
désormais y accéder via un nom fixe : http://switchsab.local
```

### Vocabulaire à bien comprendre

- **Mode Station** : le Pi se comporte comme un client WiFi classique (comme ton téléphone ou ton PC), il rejoint un réseau qui existe déjà.
- **Mode AP (Access Point / Point d'Accès)** : le Pi se comporte comme un routeur, il **crée** son propre réseau WiFi auquel d'autres appareils peuvent se connecter.
- **mDNS** (multicast DNS) : un mécanisme qui permet de joindre un appareil par un nom (`switchsab.local`) plutôt que par son adresse IP, qui elle peut changer.
- **DHCP** : le service qui distribue automatiquement les adresses IP aux appareils qui rejoignent un réseau (c'est ce qui fait que l'IP du Pi change à chaque reconnexion).

### La contrainte la plus importante de tout ce document

**Le système de provisioning réseau ne doit jamais dépendre de PostgreSQL, de Prisma, ni de la validité de la licence de l'application.**

Pourquoi cette règle est absolue : si demain la base de données a un problème, ou que la licence expire, on doit quand même pouvoir reconnecter le Pi à un nouveau WiFi (par exemple si la salle change de box internet). Si la logique de connexion WiFi est enterrée dans le même code que la gestion des sessions de jeu (qui, elle, a besoin de la base de données), une panne de la base bloquerait aussi la capacité à reconfigurer le réseau — un cercle vicieux qu'il faut éviter dès la conception.

C'est exactement pour cette raison que le projet a déjà des routes comme `/api/setup` qui sont exemptées de la vérification de licence — on va répliquer ce même principe pour le réseau.

---

## 2. Vue d'ensemble des phases

| Phase | Ce qu'elle fait | Dépendance | Durée estimée |
|---|---|---|---|
| 0 | Accès par nom fixe (`switchsab.local`) | Aucune | 15 min |
| 1 | Bascule automatique AP/Station au démarrage | Système (systemd), pas Node | 1-2h |
| 2 | Routes API pour scanner/connecter le WiFi | Express, mais pas Prisma | 2-3h |
| 3 | Page web de sélection WiFi | Frontend | 2-4h |
| 4 | Portail captif (redirection automatique) | Optionnel | Variable |
| 5 | Tests de robustesse globaux | Validation finale | 1-2h |

Chaque phase est testable indépendamment avant de passer à la suivante — ne saute pas les tests intermédiaires, ils servent à isoler d'où vient un problème si quelque chose ne fonctionne pas.

---

## Phase 0 — mDNS : accès par nom fixe

### Pourquoi commencer par ça

C'est la phase la plus rapide et la plus indépendante de tout le reste. Elle règle **immédiatement** le problème qu'on a vécu pendant tout le déploiement initial (devoir scanner le réseau avec `nmap` à chaque changement d'IP). Même si les phases suivantes prennent du temps, cette phase seule améliore déjà énormément le confort de travail.

### Comment ça fonctionne concrètement

`avahi-daemon` est un service qui tourne en arrière-plan sur le Pi. Il annonce en permanence sur le réseau local : *"Je m'appelle switchsab, et voici mon IP actuelle."* Les autres appareils du même réseau (ton PC, ton téléphone) peuvent alors demander *"Qui est switchsab.local ?"* et recevoir la bonne IP en retour — automatiquement, sans configuration manuelle, même si l'IP change.

C'est le même principe que Bonjour sur les produits Apple (`monimprimante.local`), ou les noms `.local` qu'on voit sur beaucoup d'objets connectés.

### Tâches

- [ ] **Installer le service sur le Pi** :
  ```bash
  apt update
  apt install -y avahi-daemon
  systemctl enable avahi-daemon --now
  ```
  *Explication* : `enable` fait en sorte que le service démarre automatiquement à chaque redémarrage du Pi. `--now` le démarre aussi immédiatement, sans attendre le prochain reboot.

- [ ] **Définir un nom stable pour le Pi** :
  ```bash
  hostnamectl set-hostname switchsab
  ```
  *Explication* : par défaut, le Pi s'appelle `orangepizero3` (on l'a vu dans le prompt SSH tout du long). On lui donne ici un nom plus parlant et lié au projet.

- [ ] **Vérifier que la résolution fonctionne**, depuis un autre appareil du même réseau :
  ```bash
  avahi-resolve -n switchsab.local
  ```
  *Résultat attendu* : ça doit afficher `switchsab.local` suivi de l'IP actuelle du Pi. Si cette commande échoue, `avahi-daemon` n'est peut-être pas démarré correctement (vérifier avec `systemctl status avahi-daemon`).

- [ ] **Mettre à jour la configuration Nginx** pour accepter ce nom, en plus de l'IP :
  ```bash
  nano /etc/nginx/sites-available/switch-sab
  ```
  Modifier la ligne `server_name` :
  ```nginx
  server_name switchsab.local 192.168.x.x;
  ```
  *Explication* : Nginx vérifie le nom d'hôte demandé par le navigateur avant de servir la page. Si on ne liste que l'IP, une requête vers `switchsab.local` pourrait être rejetée ou mal routée.
  ```bash
  nginx -t
  systemctl restart nginx
  ```

- [ ] **Tester depuis un navigateur**, sur un autre appareil connecté au même réseau que le Pi :
  ```
  http://switchsab.local
  ```
  Ça doit afficher l'application, exactement comme avec l'IP.

### Ce qui peut mal se passer

- **Windows** ne supporte pas toujours nativement mDNS sans un logiciel additionnel (Bonjour Print Services, ou iTunes qui l'installe indirectement). macOS et la plupart des applications mobiles/Linux le supportent nativement.
- Si plusieurs appareils Avahi sur le même réseau portent le même nom, il peut y avoir un conflit (`switchsab-2.local` généré automatiquement) — s'assurer que le hostname est unique dans l'environnement de test.

### Critère de validation de cette phase

Tu peux fermer ce document, revenir dans 3 jours, et accéder à l'app via `http://switchsab.local` sans avoir besoin de refaire un seul scan `nmap`, même si le Pi a changé de réseau entre-temps.

---

## Phase 1 — Script système de bascule AP/Station

### Pourquoi cette phase est séparée du code de l'application

Ce script ne doit **pas** dépendre de Node.js, ni de PM2, ni de rien qui appartient à l'application elle-même. Il doit s'exécuter au niveau du système d'exploitation, directement via `systemd` (le gestionnaire de services de Linux), pour une raison simple : si un jour ton application Node ne démarre pas du tout (bug fatal, dépendance cassée, etc.), il faut quand même que le Pi puisse proposer un moyen de le reconfigurer réseau. Ce script est donc la **fondation la plus basse et la plus fiable** de tout le système de provisioning.

### Comment ça fonctionne concrètement

Au démarrage du Pi, `systemd` lance une série de services dans un ordre précis. On va y ajouter un service qui :
1. Attend quelques secondes (le temps qu'une connexion WiFi déjà connue ait une chance de s'établir normalement — sinon on activerait le hotspot inutilement à chaque redémarrage)
2. Vérifie si le Pi est bien connecté à un WiFi en tant que client (mode Station)
3. Si non → active un hotspot avec `nmcli` (NetworkManager, déjà installé et utilisé depuis le début de ce projet)

### Fichiers à créer

**`/opt/switch-sab-client/scripts/check-network.sh`**

```bash
#!/bin/bash

# On attend 20 secondes : au démarrage du Pi, NetworkManager tente
# automatiquement de se reconnecter à un WiFi déjà connu. Si on vérifiait
# tout de suite, on activerait le hotspot avant même que cette tentative
# normale ait eu le temps d'aboutir.
sleep 20

# Cette commande liste les connexions actuellement actives, filtrées sur
# le type "wifi". On exclut explicitement notre propre hotspot de secours
# (SwitchSAB-Setup) du résultat, sinon le script croirait à tort qu'une
# connexion Station existe alors que c'est justement le hotspot qui tourne.
CONNECTED=$(nmcli -t -f TYPE,STATE con show --active | grep "wifi" | grep -v "SwitchSAB-Setup")

if [ -z "$CONNECTED" ]; then
  # La variable est vide : aucune connexion Station trouvée.
  echo "Aucune connexion Station détectée — activation du hotspot de secours"
  nmcli device wifi hotspot ifname wlan0 ssid "SwitchSAB-Setup" password "switchsab2026"
else
  echo "Connexion Station déjà active — hotspot non nécessaire"
fi
```

*Explication ligne par ligne des commandes clés* :
- `nmcli -t -f TYPE,STATE con show --active` : liste les connexions réseau actives, en format "brut" (`-t`, pour faciliter le traitement par script) et en affichant seulement les colonnes type et état (`-f TYPE,STATE`)
- `nmcli device wifi hotspot ifname wlan0 ssid "..." password "..."` : commande unique qui crée un hotspot — pas besoin d'installer `hostapd`/`dnsmasq` manuellement, NetworkManager sait déjà le faire nativement

Rendre le script exécutable :
```bash
chmod +x /opt/switch-sab-client/scripts/check-network.sh
```

**`/etc/systemd/system/netcheck.service`**

```ini
[Unit]
Description=Verifie et active le hotspot de secours si besoin
After=NetworkManager.service

[Service]
Type=oneshot
ExecStart=/opt/switch-sab-client/scripts/check-network.sh

[Install]
WantedBy=multi-user.target
```

*Explication du fichier* :
- `After=NetworkManager.service` : garantit que ce script ne se lance qu'une fois que NetworkManager (le service qui gère le WiFi) est lui-même démarré — sinon `nmcli` n'aurait rien à interroger
- `Type=oneshot` : indique à systemd que ce service exécute une tâche ponctuelle et se termine, plutôt que de tourner en continu (contrairement à un serveur web par exemple)
- `WantedBy=multi-user.target` : fait que ce service se lance automatiquement au démarrage normal du système

### Tâches

- [ ] Créer le script `check-network.sh` avec le contenu ci-dessus
- [ ] Le rendre exécutable (`chmod +x`)
- [ ] Créer le fichier de service `netcheck.service`
- [ ] Recharger la configuration systemd et activer le service :
  ```bash
  systemctl daemon-reload
  systemctl enable netcheck.service
  ```
  *Explication* : `daemon-reload` dit à systemd de relire tous ses fichiers de configuration (nécessaire après avoir créé/modifié un fichier `.service`). `enable` programme le service pour démarrer automatiquement à chaque redémarrage du Pi.

- [ ] **Tester sans redémarrer tout le Pi**, pour aller plus vite : couper manuellement la connexion Station actuelle, puis relancer le service :
  ```bash
  nmcli connection show   # note le nom exact de la connexion WiFi active
  nmcli con down "<nom_de_la_connexion>"
  systemctl start netcheck.service
  nmcli device status     # doit maintenant montrer le hotspot actif
  ```
  ⚠️ **Attention** : cette manipulation va couper ta session SSH actuelle si tu es connecté via ce même WiFi. Prévois un moyen de reconnexion (accès physique, ou reconnecte-toi ensuite au hotspot `SwitchSAB-Setup` pour valider qu'il fonctionne, puis refais `nmcli device wifi connect` vers ton vrai réseau pour revenir à la normale).

- [ ] Depuis un téléphone, vérifier que le réseau `SwitchSAB-Setup` apparaît bien dans la liste des WiFi disponibles, et qu'on peut s'y connecter avec le mot de passe défini

### Critère de validation de cette phase

Quand le Pi n'a aucune connexion WiFi Station active, un réseau `SwitchSAB-Setup` apparaît automatiquement dans les 20-30 secondes suivant le démarrage (ou l'exécution manuelle du service), et un téléphone externe peut s'y connecter normalement.

### ⚠️ Points de vigilance

- Le mot de passe `switchsab2026` est actuellement écrit en dur dans le script. Pour une V1 de test, c'est suffisant. Si plusieurs salles doivent avoir des mots de passe différents (par exemple pour éviter qu'un voisin curieux se connecte au hotspot de la salle d'à côté), il faudra externaliser cette valeur dans un fichier de configuration séparé, généré différemment pour chaque Pi.
- Cette phase, testée seule (sans les phases 2 et 3), crée un hotspot mais **ne propose aucune interface** pour choisir le vrai WiFi — normal à ce stade, ça vient dans la phase suivante.

---

## Phase 2 — Module `network` dans l'application Express

### Pourquoi ce module est séparé du reste du code applicatif

Ce module va vivre **dans** le même projet Node.js que le reste de l'application (contrairement au script bash de la Phase 1, qui est complètement externe). Mais il doit respecter une règle stricte : **aucune dépendance à Prisma, à la base de données, ou à la vérification de licence.**

Pourquoi cette distinction est importante à comprendre : tout le reste de l'application (`admin`, `gerant`, `client`, `rapports`...) suppose que la base de données PostgreSQL est disponible et que la licence est valide — c'est normal, ces fonctionnalités gèrent des sessions de jeu, des paiements, des comptes clients, qui n'ont de sens que si l'app est pleinement opérationnelle. Mais la configuration réseau, elle, doit fonctionner **même dans les pires scénarios** : base de données hors service, licence expirée, ou même tout premier démarrage où aucune donnée n'existe encore en base.

### Comment ça fonctionne concrètement

On crée 3 routes API très simples, qui ne font qu'exécuter des commandes système (`nmcli`) et retourner le résultat — pas de logique métier complexe, pas de lecture/écriture en base de données.

### Structure de fichiers à créer

```
backend/src/modules/network/
├── network.routes.js
└── network.controller.js
```

*Explication du choix d'organisation* : ce découpage suit exactement le même schéma que les modules existants du projet (`admin/`, `gerant/`, `client/`, chacun avec son `.routes.js` et son `.controller.js`), pour rester cohérent avec les conventions déjà en place.

### `network.controller.js`

```javascript
import { exec } from 'child_process'
import { promisify } from 'util'

// child_process.exec permet d'exécuter une commande shell depuis Node.js.
// promisify le transforme pour pouvoir utiliser async/await au lieu de callbacks,
// ce qui rend le code plus lisible et cohérent avec le reste du projet.
const execAsync = promisify(exec)

/**
 * Indique si le Pi est actuellement connecté à un vrai réseau WiFi
 * (mode Station), ou s'il tourne encore sur son hotspot de secours.
 */
export const getStatus = async (req, res) => {
  try {
    const { stdout } = await execAsync('nmcli -t -f TYPE,STATE con show --active')
    // On vérifie qu'il y a bien une connexion de type wifi active,
    // et qu'il ne s'agit PAS de notre propre hotspot de secours
    // (sinon on penserait à tort être "connecté" alors qu'on attend
    // encore que le gérant configure le vrai WiFi).
    const connected = stdout.includes('wifi') && !stdout.includes('SwitchSAB-Setup')
    res.json({ connected })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

/**
 * Retourne la liste des réseaux WiFi que le Pi capte autour de lui,
 * triés implicitement par force de signal côté frontend.
 */
export const scanReseaux = async (req, res) => {
  try {
    const { stdout } = await execAsync('nmcli -t -f SSID,SIGNAL,SECURITY device wifi list')
    const reseaux = stdout
      .split('\n')
      .filter(Boolean) // enlève les lignes vides
      .map((line) => {
        const [ssid, signal, security] = line.split(':')
        return {
          ssid,
          signal: parseInt(signal, 10),
          securise: security !== '', // si ce champ n'est pas vide, le réseau demande un mot de passe
        }
      })
      .filter((r) => r.ssid) // ignore les réseaux sans nom (SSID caché)
    res.json(reseaux)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

/**
 * Tente de connecter le Pi au réseau WiFi choisi par le gérant.
 * Si la connexion réussit, désactive le hotspot de secours,
 * qui n'a alors plus de raison d'exister.
 */
export const connecter = async (req, res) => {
  const { ssid, password } = req.body
  if (!ssid) {
    return res.status(400).json({ message: 'SSID requis' })
  }

  try {
    const cmd = password
      ? `nmcli device wifi connect "${ssid}" password "${password}"`
      : `nmcli device wifi connect "${ssid}"`
    await execAsync(cmd)

    // On laisse un court délai pour que la connexion ait le temps de
    // s'établir complètement avant de vérifier son état — une connexion
    // WiFi ne se fait jamais instantanément.
    await new Promise((resolve) => setTimeout(resolve, 3000))

    const { stdout } = await execAsync('nmcli -t -f TYPE,STATE con show --active')
    const connected = stdout.includes('wifi') && !stdout.includes('SwitchSAB-Setup')

    if (connected) {
      // La connexion au vrai réseau a réussi : le hotspot de secours
      // n'est plus nécessaire, on l'éteint pour libérer l'interface WiFi
      // (une carte WiFi ne peut généralement pas être à la fois hotspot
      // ET client en même temps sur le même Pi).
      await execAsync('nmcli con down SwitchSAB-Setup').catch(() => {
        // On ignore l'erreur si le hotspot n'existait déjà plus pour une raison ou une autre
      })
      res.json({ success: true, message: 'Connecté avec succès' })
    } else {
      res.status(400).json({
        success: false,
        message: 'Échec de connexion — vérifiez le mot de passe et réessayez',
      })
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}
```

### `network.routes.js`

```javascript
import { Router } from 'express'
import { getStatus, scanReseaux, connecter } from './network.controller.js'

const router = Router()

router.get('/status', getStatus)
router.get('/scan', scanReseaux)
router.post('/connect', connecter)

export default router
```

### Montage dans `src/index.js`

Ajouter, aux côtés des autres imports de routes :
```javascript
import networkRoutes from './modules/network/network.routes.js'
```

Et, aux côtés des autres `app.use(...)` :
```javascript
app.use('/api/network', networkRoutes)
```

*Rappel important* : d'après le fix qu'on a dû faire plusieurs fois pendant le déploiement, assure-toi que `import 'dotenv/config'` reste bien la toute première ligne du fichier, avant tous les autres imports — l'ordre des imports en JavaScript ESM est significatif, ce n'est pas juste une question de style.

### Exemption de la vérification de licence

Le projet a déjà un mécanisme pour exempter certaines routes de la vérification de licence (utilisé par exemple pour `/api/setup`, comme on l'a vu dans les logs pendant le déploiement : `[requireLicence] Route exemptée`).

- [ ] Localiser ce mécanisme :
  ```bash
  grep -n "setup\|exemptée\|routesExemptees" backend/src/middlewares/licence.middleware.js
  ```
- [ ] Ajouter `/api/network` à la même liste, selon le format exact déjà utilisé dans ce fichier (probablement un tableau de préfixes de routes, ou une regex — à adapter selon ce que montre le `grep`)

### Tâches de test

- [ ] Démarrer/redémarrer le backend :
  ```bash
  pm2 restart switch-sab-backend --update-env
  ```
- [ ] Tester chaque route individuellement avec `curl`, sans authentification (ces routes ne devraient PAS nécessiter de token JWT, contrairement aux routes admin) :
  ```bash
  curl http://localhost:3002/api/network/status
  curl http://localhost:3002/api/network/scan
  ```
- [ ] **Le test le plus important de cette phase** — vérifier l'indépendance vis-à-vis de la base de données :
  ```bash
  systemctl stop postgresql@16-main
  curl http://localhost:3002/api/network/status
  curl http://localhost:3002/api/network/scan
  # Les deux doivent répondre normalement malgré PostgreSQL arrêté
  systemctl start postgresql@16-main   # ne pas oublier de le relancer après le test !
  ```

### Critère de validation de cette phase

Les 3 routes (`/status`, `/scan`, `/connect`) répondent correctement, y compris quand PostgreSQL est arrêté et/ou que la licence de l'application est invalide/expirée.

---

## Phase 3 — Interface frontend de sélection WiFi

### Pourquoi une réflexion s'impose avant de coder

Cette page a une contrainte particulière : elle doit être accessible **sans authentification** (le gérant n'a pas encore de compte à ce stade, il configure le réseau avant même de pouvoir se connecter à l'application), et idéalement, elle ne devrait **pas dépendre du build complet de l'application React** — parce que si un jour ce build échoue pour une raison quelconque (comme on l'a vécu avec les erreurs Vite pendant le déploiement), on ne veut pas que ça empêche aussi la configuration réseau de fonctionner.

### Les deux options possibles

**Option A — Intégrer dans l'app React existante**

Avantage : cohérence visuelle avec le reste de l'application, réutilisation des composants existants (boutons, style, etc.)
Inconvénient : dépend du build Vite, qui a déjà posé plusieurs problèmes pendant ce projet (variables d'environnement, taille de bundle, etc.)

**Option B — Page HTML statique séparée, servie directement par Express**

Avantage : zéro dépendance à React/Vite, fonctionne même si le frontend principal a un problème de build, très simple à déboguer
Inconvénient : esthétique plus basique, pas de réutilisation de composants

*Recommandation de ce document* : partir sur l'**Option B** pour la robustesse, quitte à la rendre plus jolie plus tard une fois que le système fonctionne de bout en bout. Le but premier ici est la fiabilité, pas l'esthétique.

### Si Option B — mise en œuvre

Créer le dossier et le fichier :
```
backend/public/wifi-setup/index.html
```

Servir ce dossier comme fichiers statiques dans `src/index.js` :
```javascript
app.use('/wifi-setup', express.static('public/wifi-setup'))
```

Contenu de la page (vanilla JavaScript, sans framework, pour éviter toute dépendance de build) :

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Configuration WiFi — Switch SAB</title>
  <style>
    body {
      font-family: -apple-system, sans-serif;
      max-width: 420px;
      margin: 40px auto;
      padding: 0 20px;
      color: #1a1a1a;
    }
    h1 { font-size: 1.4rem; }
    .reseau {
      padding: 14px;
      border: 1px solid #ddd;
      border-radius: 8px;
      margin-bottom: 8px;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
    }
    .reseau:active { background: #f0f0f0; }
    input, button {
      width: 100%;
      padding: 12px;
      margin-top: 12px;
      box-sizing: border-box;
      border-radius: 8px;
      border: 1px solid #ccc;
      font-size: 1rem;
    }
    button {
      background: #2563eb;
      color: white;
      border: none;
      font-weight: 600;
      cursor: pointer;
    }
    #message { margin-top: 16px; font-weight: 500; }
  </style>
</head>
<body>
  <h1>📶 Connecter la borne à votre WiFi</h1>
  <p>Sélectionnez le réseau WiFi de votre établissement.</p>
  <div id="reseaux">Recherche des réseaux disponibles...</div>

  <div id="form" style="display:none;">
    <input type="password" id="password" placeholder="Mot de passe WiFi">
    <button onclick="connecter()">Se connecter</button>
  </div>

  <p id="message"></p>

  <script>
    let ssidChoisi = null

    async function chargerReseaux() {
      try {
        const res = await fetch('/api/network/scan')
        const reseaux = await res.json()
        document.getElementById('reseaux').innerHTML = reseaux
          .sort((a, b) => b.signal - a.signal)
          .map(
            (r) => `
              <div class="reseau" onclick="choisir('${r.ssid.replace(/'/g, "\\'")}')">
                <span>${r.ssid}</span>
                <span>${r.securise ? '🔒' : '🔓'} ${r.signal}%</span>
              </div>
            `
          )
          .join('')
      } catch (err) {
        document.getElementById('reseaux').textContent =
          'Impossible de récupérer la liste des réseaux. Réessayez.'
      }
    }

    function choisir(ssid) {
      ssidChoisi = ssid
      document.getElementById('form').style.display = 'block'
      document.getElementById('message').textContent = ''
    }

    async function connecter() {
      const password = document.getElementById('password').value
      const messageEl = document.getElementById('message')
      messageEl.textContent = 'Connexion en cours...'

      try {
        const res = await fetch('/api/network/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ssid: ssidChoisi, password }),
        })
        const data = await res.json()
        messageEl.textContent = data.message
        if (data.success) {
          messageEl.textContent +=
            ' — Vous pouvez maintenant fermer cette page et rejoindre le même réseau WiFi que la borne.'
        }
      } catch (err) {
        messageEl.textContent = "Erreur réseau — la borne a peut-être déjà basculé sur le nouveau WiFi. Reconnectez votre téléphone à ce même réseau et réessayez d'accéder à l'application."
      }
    }

    chargerReseaux()
  </script>
</body>
</html>
```

*Explication du dernier message d'erreur dans le script* : c'est un cas subtil à anticiper — si la connexion au vrai WiFi réussit, le Pi va **couper son propre hotspot**, ce qui va aussi couper la connexion du téléphone du gérant à ce hotspot (puisqu'il n'existe plus). Le fetch de la réponse `/connect` peut donc échouer non pas parce que ça n'a pas marché, mais justement **parce que ça a marché** et que le réseau a changé sous les pieds du téléphone. Le message d'erreur guide le gérant vers la bonne action dans ce cas.

### Tâches

- [ ] Créer le dossier `backend/public/wifi-setup/`
- [ ] Créer `index.html` avec le contenu ci-dessus
- [ ] Ajouter la ligne `express.static` dans `src/index.js`
- [ ] Tester en se connectant au hotspot `SwitchSAB-Setup` depuis un téléphone, puis en visitant `http://192.168.4.1/wifi-setup` (ou l'IP que NetworkManager attribue au Pi en mode hotspot — à vérifier avec `nmcli device show wlan0` pendant que le hotspot est actif)
- [ ] Vérifier le flux complet : liste des réseaux affichée → sélection → mot de passe → connexion → message de succès

### Critère de validation de cette phase

Un utilisateur non technique, connecté au hotspot `SwitchSAB-Setup` avec son téléphone, peut voir la liste des WiFi environnants, en choisir un, taper le mot de passe, et voir la connexion réussir — sans avoir eu besoin d'utiliser une ligne de commande à aucun moment.

---

## Phase 4 — Portail captif (optionnel)

### Pourquoi cette phase est optionnelle

Sans cette phase, le gérant doit **taper manuellement** une adresse dans son navigateur (par exemple `http://192.168.4.1/wifi-setup`) après s'être connecté au hotspot. Ce n'est pas idéal, mais ce n'est pas non plus bloquant — beaucoup d'objets connectés grand public fonctionnent encore ainsi (avec une adresse fixe indiquée dans le manuel).

Un vrai "portail captif" (comme dans les aéroports ou les hôtels) détecte automatiquement qu'un appareil vient de se connecter à un WiFi, et **force l'ouverture du navigateur** vers une page précise, sans que l'utilisateur ait à taper quoi que ce soit.

### Pistes techniques, si cette phase est jugée prioritaire plus tard

- Configurer `dnsmasq` pour que, en mode hotspot, **toutes** les requêtes DNS soient redirigées vers l'IP du Pi, peu importe le site demandé
- Les systèmes d'exploitation (Android, iOS, Windows) envoient automatiquement une requête de "test de connectivité" dès qu'un appareil rejoint un nouveau WiFi (par exemple, Android teste `connectivitycheck.gstatic.com`) — en interceptant cette requête et en répondant d'une façon spécifique, on peut déclencher l'ouverture automatique d'une fenêtre de portail captif, exactement comme le fait un WiFi d'hôtel

Cette implémentation est plus complexe et dépend du comportement de chaque OS, donc elle est volontairement mise de côté pour une V1 fonctionnelle. Le système est pleinement opérationnel sans cette phase, juste un peu moins fluide pour l'utilisateur final.

---

## Phase 5 — Tests de robustesse globaux

### Pourquoi cette phase existe séparément

Chaque phase précédente a été testée individuellement, mais il faut maintenant valider que **l'ensemble du système se comporte bien dans des scénarios réels de panne ou de première utilisation**, pas seulement dans des conditions idéales.

### Liste de tests à effectuer, avec l'explication de ce que chacun valide

- [ ] **Couper PostgreSQL, puis tester le scan et la connexion WiFi**
  ```bash
  systemctl stop postgresql@16-main
  curl http://localhost:3002/api/network/scan
  systemctl start postgresql@16-main
  ```
  *Ce que ça valide* : la promesse centrale de toute cette roadmap — que la configuration réseau reste fonctionnelle même si la base de données a un problème.

- [ ] **Invalider la licence, puis tester les mêmes routes**
  *Ce que ça valide* : qu'une licence expirée (situation qui peut légitimement arriver en usage réel) ne bloque jamais la capacité à reconfigurer le réseau.

- [ ] **Arrêter complètement l'application Node (`pm2 stop switch-sab-backend`), puis vérifier l'état du script système (Phase 1)**
  *Ce que ça valide* : que le Niveau 1 (le script bash, indépendant de Node) continue de fonctionner même si toute l'application JavaScript est à l'arrêt — c'est la garantie la plus basse du système.

- [ ] **Redémarrer complètement le Pi sans aucun WiFi Station configuré, et chronométrer l'apparition du hotspot**
  *Ce que ça valide* : le comportement du tout premier démarrage chez un gérant, situation la plus critique puisque c'est la toute première impression du produit.

- [ ] **Dérouler le flux complet de bout en bout** : connexion au hotspot → page de sélection → connexion à un vrai WiFi de test → vérifier que le hotspot disparaît → vérifier l'accès à l'app via `switchsab.local`
  *Ce que ça valide* : l'intégration de toutes les phases ensemble, pas juste chacune isolément.

- [ ] **Changer le Pi de réseau WiFi une fois configuré (simuler un déménagement de la salle, ou un changement de box), et vérifier que `switchsab.local` continue de fonctionner sans aucune reconfiguration manuelle**
  *Ce que ça valide* : que le problème historique qu'on a vécu pendant tout le déploiement (scanner `nmap` à chaque changement de réseau) est bel et bien résolu de façon durable.

---

## 3. Récapitulatif des niveaux d'indépendance

Ce tableau résume la logique de conception qui traverse tout ce document — à garder sous les yeux pendant l'implémentation pour ne pas dévier de la contrainte de robustesse.

| Niveau | Composant | Dépend de Prisma/BDD ? | Dépend de la licence ? | Dépend de Node/PM2 ? |
|---|---|---|---|---|
| 1 | `check-network.sh` + `netcheck.service` (Phase 1) | ❌ Non | ❌ Non | ❌ Non — s'exécute via systemd directement |
| 2 | Module `network` Express (Phase 2) | ❌ Non | ❌ Non (exempté explicitement) | ✅ Oui — nécessite que Node/PM2 tournent |
| 3 | Reste de l'application (sessions, Zigbee, admin, rapports...) | ✅ Oui | ✅ Oui | ✅ Oui |

La seule vraie limite résiduelle du système : si Node lui-même ne démarre jamais (erreur fatale au lancement), le Niveau 2 ne répond plus — mais le Niveau 1, lui, reste garanti indépendant de tout JavaScript, puisqu'il s'agit d'un simple script bash lancé par systemd.

---

## 4. Ordre d'implémentation recommandé, et pourquoi cet ordre précis

1. **Phase 0 (mDNS)** — gain immédiat et sans risque, à faire en 15 minutes ; améliore tout de suite le confort de travail sur le reste des phases
2. **Phase 2 (module Express)** — la logique métier des routes est testable en isolation (via `curl`) avant même de toucher au système d'exploitation, donc plus sûr de commencer par là
3. **Phase 1 (script système)** — la bascule AP/Station touche à la configuration réseau du Pi lui-même, avec un risque de couper l'accès SSH en cours de test ; à faire une fois qu'on est confiant que le reste (Phase 2) fonctionne, pour limiter les variables en jeu pendant les tests
4. **Phase 3 (interface frontend)** — vient logiquement après que les routes API (Phase 2) et la bascule réseau (Phase 1) soient validées, puisque cette page dépend des deux
5. **Phase 5 (tests de robustesse)** — une fois que chaque brique fonctionne isolément, on valide l'ensemble
6. **Phase 4 (portail captif)** — en dernier, car optionnel et plus complexe ; le système est déjà pleinement utilisable sans cette phase