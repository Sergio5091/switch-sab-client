# Guide Zigbee — Debug et mise en service complète

Ce guide couvre tout ce qu'il faut faire pour que les prises Zigbee fonctionnent
avec l'application Switch SAB, depuis l'installation jusqu'au test final.

---

## Architecture — comment ça fonctionne dans le code

```
Frontend (Admin → Postes)
    ↓  POST /api/admin/zigbee/appairer/:posteId
Backend (zigbee.controller.js)
    ↓  mqtt.publish permit_join → true
Zigbee2MQTT (Z2M)
    ↓  bridge/event → device_joined
Backend reçoit ieee_address
    ↓  mqtt.publish rename ieee → zigbeeName
    ↓  prisma.poste.update zigbeeName
    ↓  salle.switchType → ZIGBEE
    ↓  res.json { success, zigbeeName }
Frontend affiche ✅ Prise liée
```

Quand une session démarre :

```
sessions.controller.js
    ↓  switchService.allumerPoste(posteId)
         ↓  getDriver() → salle.switchType = ZIGBEE
         ↓  zigbeeSwitch.allumerPoste(posteId)
              ↓  prisma.poste.findUnique → zigbeeName
              ↓  mqtt.publish zigbee2mqtt/{zigbeeName}/set → { state: ON }
Prise Zigbee physique → TV s'allume ✅

    ↓  zigbee.verrouillerPoste() → { child_lock: LOCK }
    ↓  zigbee.programmerArret(secondes) → { countdown: N }
    ↓  setTimeout(endSessionAuto, ms)

À la fin (timer expire ou gérant arrête) :
    ↓  switchService.eteindrePoste(posteId)
         ↓  mqtt.publish → { state: OFF }
    ↓  zigbee.deverrouillerPoste() → { child_lock: UNLOCK }
    ↓  zigbee.annulerCountdown() → { countdown: 0 }
```

---

## Prérequis sur le Raspberry Pi

### 1. Variables d'environnement `.env` backend

```
MQTT_URL=mqtt://localhost:1883
ZIGBEE2MQTT_TOPIC=zigbee2mqtt
USE_MOCK_SWITCH=false
NODE_ENV=production
```

### 2. Mosquitto (broker MQTT) doit tourner

```bash
# Vérifier
docker ps | grep mosquitto
# Doit afficher : Up ...

# Si absent, lancer
docker run -d --name mosquitto \
  -p 1883:1883 \
  eclipse-mosquitto
```

### 3. Zigbee2MQTT doit tourner et être connecté au coordinateur USB

```bash
# Vérifier
docker ps | grep zigbee2mqtt
docker logs zigbee2mqtt --tail 20

# Vérifier que le coordinateur est détecté
ls /dev/ttyUSB* /dev/ttyACM*
# Doit afficher un port ex: /dev/ttyUSB0
```

### 4. Vérifier que Z2M répond

```bash
mosquitto_sub -h localhost -t "zigbee2mqtt/bridge/state" -C 1
# Doit afficher : online
```

---

## Étape 0 — Ouvrir les terminaux de surveillance

**Garde ces deux terminaux ouverts pendant TOUS les tests.**

**Terminal A — MQTT en temps réel :**
```bash
mosquitto_sub -h localhost -t "zigbee2mqtt/#" -v
```

**Terminal B — Logs PM2 en temps réel :**
```bash
pm2 logs switch-sab-backend --lines 0
```

---

## Étape 1 — Vérifier que la prise est connue de Z2M

Ouvre l'interface web Zigbee2MQTT :
```
http://<IP-du-Pi>:8080
```

Dans la section **Devices**, cherche l'adresse IEEE de ta prise (ex: `0xa4c138694ba5ba0a`).

- **Elle y est** → passe à l'étape 2
- **Elle n'y est pas** → passe directement à l'étape 3 (factory reset)

---

## Étape 2 — Retirer la prise de Z2M avant de l'appairer via l'app

> ⚠️ Si la prise est déjà connue de Z2M mais pas liée à un poste dans la BDD,
> il faut la retirer de Z2M pour pouvoir la ré-appairer proprement.

Dans l'interface web Z2M → clique sur la prise → bouton **Remove / Supprimer**.

Dans Terminal A, tu dois voir apparaître :
```
zigbee2mqtt/bridge/event {"type":"device_leave","data":{"ieee_address":"0xa4c138..."}}
```

---

## Étape 3 — Factory reset physique de la prise

Procédure pour la **Tuya TS011F** :

1. Débranche la prise du secteur
2. Rebranche-la
3. Immédiatement, maintiens le **bouton physique appuyé 5 à 10 secondes**
4. La LED doit **clignoter rapidement** → c'est le signe qu'elle cherche un réseau

> Si la LED ne clignote pas rapidement, réessaie.
> Certains modèles demandent un double appui rapide plutôt qu'un maintien long.

---

## Étape 4 — Test manuel d'appairage (sans l'app)

Ce test isole le problème : est-ce Z2M/la prise, ou le code de l'app ?

**Dans Terminal A** (déjà ouvert) — tu vas voir les messages en direct.

**Dans un Terminal C :**
```bash
# Ouvrir l'appairage manuellement
mosquitto_pub -h localhost \
  -t "zigbee2mqtt/bridge/request/permit_join" \
  -m '{"value": true, "time": 120}'
```

Pendant que l'appairage est ouvert, refais le **factory reset physique** (étape 3).

**Dans Terminal A, tu dois voir :**
```
zigbee2mqtt/bridge/event {"type":"device_joined","data":{"ieee_address":"0xa4c138...","friendly_name":"0xa4c138..."}}
```

ou

```
zigbee2mqtt/bridge/event {"type":"device_announce","data":{"ieee_address":"0xa4c138...",...}}
```

### Résultat de l'étape 4

✅ **`device_joined` ou `device_announce` apparaît** → Z2M et la prise fonctionnent.
Le problème est dans le code de l'app → **passe à l'étape 6**.

❌ **Rien n'apparaît** → problème matériel ou configuration Z2M → **passe à l'étape 5**.

---

## Étape 5 — Diagnostic matériel (si aucun device_joined)

### 5.1 Vérifier les logs Z2M directement

```bash
docker logs zigbee2mqtt --tail 50 -f
```

Refais le reset physique de la prise pendant que ce log tourne.
Cherche des erreurs ou des tentatives de connexion.

### 5.2 Vérifier la distance

Les prises Zigbee ont du mal à joindre si elles sont loin du coordinateur.
Rapproche la prise physiquement du Pi pendant le test.

### 5.3 Vérifier qu'aucune passlist ne bloque

```bash
cat /opt/zigbee2mqtt/data/configuration.yaml | grep -A 5 passlist
```

Si une `passlist` est configurée, elle bloque tout appareil non listé.
Commente ou supprime ce bloc dans le fichier de config, puis redémarre Z2M :
```bash
docker restart zigbee2mqtt
```

### 5.4 Vérifier le port du coordinateur

```bash
ls -la /dev/ttyUSB* /dev/ttyACM*
```

Si le port a changé (ex: `/dev/ttyUSB1` au lieu de `/dev/ttyUSB0`), mets à jour
`configuration.yaml` dans la section `serial.port` et redémarre Z2M.

---

## Étape 6 — Debug du code app (si Z2M fonctionne mais pas l'app)

### Ce que fait le code dans `zigbee.controller.js`

Quand tu cliques "Appairer" dans l'interface :

1. Le backend ouvre une **nouvelle connexion MQTT dédiée** (pas celle de zigbeeSwitch.js)
2. Il publie `permit_join: true` pendant 120 secondes
3. Il écoute `zigbee2mqtt/bridge/event`
4. Quand `device_joined` **ou** `device_announce` arrive → il résout
5. Il renomme la prise avec le friendly_name généré depuis le nom du poste
6. Il sauvegarde `zigbeeName` sur le poste en BDD
7. Il bascule `salle.switchType` → `ZIGBEE`
8. Il répond `{ success: true, zigbeeName }`

### Les logs à surveiller dans Terminal B

Quand tu cliques "Appairer" depuis l'app, tu dois voir dans PM2 :

```
[zigbee/appairer] Poste "PS4 Poste 1" → friendly_name "ps4_poste_1"
[zigbee/appairer] MQTT connecté — ouverture appairage Z2M
```

Puis quand la prise se connecte :

```
[zigbee/appairer] bridge/event reçu : type="device_joined" data={"ieee_address":"0xa4c138..."}
[zigbee/appairer] Appareil détecté (device_joined) : 0xa4c138...
[zigbee/appairer] Prise 0xa4c138... renommée → "ps4_poste_1"
[zigbee/appairer] ✅ Poste "PS4 Poste 1" lié à la prise "ps4_poste_1"
```

### Si tu vois "MQTT connecté" mais pas d'event reçu

Le problème est que la connexion MQTT dédiée du controller ne reçoit pas les events.
Vérifie que Z2M publie bien sur `zigbee2mqtt/bridge/event` dans Terminal A.

Si Z2M publie mais le controller ne reçoit pas → problème de timing (Z2M publie
avant que le controller soit abonné). Solution : mettre le subscribe **avant** le publish.

### Si tu vois "timeout" après 120 secondes

La prise n'a pas rejoint le réseau. Recommence depuis l'étape 3 (factory reset).

### Si le backend crashe au lieu de répondre

Vérifie les logs PM2 pour l'erreur exacte :
```bash
pm2 logs switch-sab-backend --err --lines 30
```

---

## Étape 7 — Test complet via l'interface

Une fois les étapes précédentes validées :

1. **Reset physique** de la prise (étape 3)
2. Dans l'app : Admin → **Postes** → clique **"Appairer une prise"** sur un poste
3. L'interface affiche "En attente de la prise... (120s)"
4. Maintiens le bouton de la prise 5 secondes
5. L'interface affiche **✅ "Prise liée — ps4_poste_1"**
6. Dans Terminal A tu vois le rename et la config `power_outage_memory`
7. Lance une session depuis le gérant → la prise s'allume physiquement
8. Attends la fin du timer → la prise s'éteint automatiquement

---

## Vérifications post-appairage

### La prise est bien dans Z2M avec le bon nom

Dans l'interface web Z2M → Devices :
- Le nom affiché doit être `ps4_poste_1` (ou le nom généré)
- Pas l'adresse IEEE brute

### Le poste a bien son zigbeeName en BDD

```bash
# Sur le Pi
psql -U postgres -d switchsab_app -c \
  "SELECT id, nom, \"zigbeeName\" FROM \"Poste\";"
```

Doit afficher `ps4_poste_1` dans la colonne zigbeeName.

### Le switchType de la salle est bien ZIGBEE

```bash
psql -U postgres -d switchsab_app -c \
  "SELECT id, nom, \"switchType\" FROM \"Salle\";"
```

Doit afficher `ZIGBEE`.

---

## Test allumage/extinction manuel via MQTT

Une fois la prise appairée, tu peux tester sans démarrer une vraie session :

```bash
# Allumer la prise "ps4_poste_1"
mosquitto_pub -h localhost \
  -t "zigbee2mqtt/ps4_poste_1/set" \
  -m '{"state": "ON"}'

# Éteindre
mosquitto_pub -h localhost \
  -t "zigbee2mqtt/ps4_poste_1/set" \
  -m '{"state": "OFF"}'

# Verrouiller le bouton physique
mosquitto_pub -h localhost \
  -t "zigbee2mqtt/ps4_poste_1/set" \
  -m '{"child_lock": "LOCK"}'

# Déverrouiller
mosquitto_pub -h localhost \
  -t "zigbee2mqtt/ps4_poste_1/set" \
  -m '{"child_lock": "UNLOCK"}'

# Programmer extinction dans 60s
mosquitto_pub -h localhost \
  -t "zigbee2mqtt/ps4_poste_1/set" \
  -m '{"countdown": 60}'
```

---

## Résumé visuel de la roadmap

```
Étape 0 : Ouvrir Terminal A (mosquitto_sub) + Terminal B (pm2 logs)
    ↓
Étape 1 : Prise visible dans Z2M ?
    ↓ OUI → Étape 2 (retirer de Z2M)
    ↓ NON → Étape 3 (factory reset)
    ↓
Étape 2 : Retirer la prise de Z2M
    ↓
Étape 3 : Factory reset physique (LED clignote vite)
    ↓
Étape 4 : Test manuel mosquitto_pub permit_join + reset prise
    ↓
    ├── device_joined vu dans Terminal A
    │       → Z2M OK → Étape 6 (debug code)
    └── rien vu
            → Étape 5 (debug matériel/Z2M)
    ↓
Étape 6 : Analyser les logs PM2 pendant un appairage via l'app
    ↓
Étape 7 : Test complet depuis l'interface
```

---

## Piège connu — connexion MQTT et timing

Le controller `zigbee.controller.js` ouvre une connexion MQTT dédiée **au moment
de la requête HTTP**. Il y a un risque de timing :

```
1. Controller se connecte au broker MQTT
2. Controller publie permit_join: true
3. Prise se connecte et Z2M publie device_joined
4. MAIS le controller n'a peut-être pas encore reçu le subscribe ack
   → il manque l'event
```

Si ce timing est le problème, le fix est de mettre le subscribe **dans le callback
connect**, avant de publier permit_join. C'est déjà le cas dans notre code :

```js
mqttClient.on('connect', () => {
  // D'abord on s'abonne
  mqttClient.subscribe(`${Z2M_TOPIC}/bridge/event`, { qos: 0 })
  // Puis seulement on ouvre l'appairage
  mqttClient.publish(`${Z2M_TOPIC}/bridge/request/permit_join`, ...)
})
```

L'ordre est correct — si ça échoue quand même, c'est un problème côté prise ou Z2M.

---

## Fichiers clés dans le code

| Fichier | Rôle |
|---|---|
| `src/switch/zigbeeSwitch.js` | Driver MQTT — parle aux prises physiques |
| `src/modules/admin/zigbee.controller.js` | Gère l'appairage depuis l'UI |
| `src/modules/admin/admin.routes.js` | Routes `/api/admin/zigbee/*` |
| `src/modules/gerant/sessions.controller.js` | Allume/éteint via switchService |
| `src/switch/switchService.js` | Route vers le bon driver selon `salle.switchType` |
| `frontend/src/pages/admin/postes.tsx` | UI bouton "Appairer une prise" |
| `frontend/src/pages/setup/salle.tsx` | Formulaire création salle avec option ZIGBEE |
