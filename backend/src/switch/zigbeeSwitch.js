/**
 * zigbeeSwitch.js — Driver Zigbee via MQTT / Zigbee2MQTT
 *
 * Chaque poste a un champ `zigbeeName` en base (ex: "ps4_1").
 * Ce driver publie sur le topic zigbee2mqtt/{zigbeeName}/set
 * pour piloter la prise physique Tuya TS011F.
 *
 * Fonctions exposées :
 *   allumerPoste(posteId)           → state: ON
 *   eteindrePoste(posteId)          → state: OFF
 *   verrouillerPoste(posteId)       → child_lock: LOCK  (empêche extinction manuelle)
 *   deverrouillerPoste(posteId)     → child_lock: UNLOCK
 *   programmerArret(posteId, sec)   → countdown: N      (sécurité matérielle)
 *   annulerCountdown(posteId)       → countdown: 0
 *   configurerCoupure(posteId)      → power_outage_memory: 'off' (une seule fois à l'appairage)
 *   identifierPoste(posteId)        → identify: 'identify' (fait clignoter la prise)
 *   getStatutPoste(posteId)         → lit l'état retained depuis Z2M
 *   getAllStatuts()                  → statuts de tous les postes appairés
 *
 * Prérequis .env :
 *   MQTT_URL=mqtt://localhost:1883
 *   ZIGBEE2MQTT_TOPIC=zigbee2mqtt
 */

import mqtt from 'mqtt'
import prisma from '../services/prismaClient.js'
import logger from '../config/logger.js'

const MQTT_URL  = process.env.MQTT_URL          || 'mqtt://localhost:1883'
const Z2M_TOPIC = process.env.ZIGBEE2MQTT_TOPIC || 'zigbee2mqtt'

// ─── Client MQTT singleton ────────────────────────────────────────────────────

let _client = null

const getClient = () => {
  if (_client && _client.connected) return _client

  _client = mqtt.connect(MQTT_URL, {
    clientId: `switch-sab-backend-${Date.now()}`,
    clean: true,
    reconnectPeriod: 3000,
  })

  _client.on('connect', () => logger.info(`[zigbee] Connecté au broker MQTT : ${MQTT_URL}`))
  _client.on('error',   (err) => logger.error(`[zigbee] Erreur MQTT : ${err.message}`))
  _client.on('offline', () => logger.warn('[zigbee] MQTT hors ligne — reconnexion...'))

  return _client
}

// ─── Helpers internes ─────────────────────────────────────────────────────────

/**
 * Récupère le zigbeeName d'un poste depuis la base.
 * Lance une erreur explicite si le poste n'est pas appairé.
 */
const getZigbeeName = async (posteId) => {
  const poste = await prisma.poste.findUnique({
    where: { id: Number(posteId) },
    select: { zigbeeName: true, nom: true }
  })
  if (!poste) throw new Error(`Poste ${posteId} introuvable`)
  if (!poste.zigbeeName) {
    throw new Error(
      `Poste "${poste.nom}" (id=${posteId}) n'a pas de prise Zigbee associée. ` +
      `Appairez une prise depuis Admin → Postes.`
    )
  }
  return poste.zigbeeName
}

/**
 * Publie un payload JSON sur le topic /set d'une prise.
 */
const publier = (zigbeeName, payload) =>
  new Promise((resolve, reject) => {
    const topic   = `${Z2M_TOPIC}/${zigbeeName}/set`
    const message = JSON.stringify(payload)
    getClient().publish(topic, message, { qos: 1 }, (err) => {
      if (err) {
        logger.error(`[zigbee] Erreur publication ${topic} : ${err.message}`)
        return reject(err)
      }
      logger.info(`[zigbee] ${topic} → ${message}`)
      resolve()
    })
  })

// ─── Fonctions publiques ──────────────────────────────────────────────────────

/**
 * Allume la prise liée au poste.
 * Appelé au démarrage d'une session.
 */
export const allumerPoste = async (posteId) => {
  const zigbeeName = await getZigbeeName(posteId)
  await publier(zigbeeName, { state: 'ON' })
  return { success: true, posteId, statut: 'ON' }
}

/**
 * Éteint la prise liée au poste.
 * Appelé à la fin ou à l'arrêt d'une session.
 */
export const eteindrePoste = async (posteId) => {
  const zigbeeName = await getZigbeeName(posteId)
  await publier(zigbeeName, { state: 'OFF' })
  return { success: true, posteId, statut: 'OFF' }
}

/**
 * Verrouille le bouton physique de la prise (LOCK).
 * Empêche un client d'éteindre la TV à la main pendant une session.
 * Appelé automatiquement au démarrage d'une session.
 */
export const verrouillerPoste = async (posteId) => {
  const zigbeeName = await getZigbeeName(posteId)
  await publier(zigbeeName, { child_lock: 'LOCK' })
  logger.info(`[zigbee] Poste ${posteId} verrouillé`)
}

/**
 * Déverrouille le bouton physique de la prise (UNLOCK).
 * Appelé automatiquement à la fin d'une session.
 */
export const deverrouillerPoste = async (posteId) => {
  const zigbeeName = await getZigbeeName(posteId)
  await publier(zigbeeName, { child_lock: 'UNLOCK' })
  logger.info(`[zigbee] Poste ${posteId} déverrouillé`)
}

/**
 * Programme un arrêt automatique matériel (countdown en secondes).
 * Sécurité : si le backend crashe, la prise s'éteint quand même.
 * Appelé au démarrage d'une session avec la durée totale.
 * Max supporté par la TS011F : 43200s (12h).
 */
export const programmerArret = async (posteId, secondes) => {
  const zigbeeName = await getZigbeeName(posteId)
  const valeur = Math.min(Math.round(secondes), 43200)
  await publier(zigbeeName, { countdown: valeur })
  logger.info(`[zigbee] Poste ${posteId} countdown → ${valeur}s`)
}

/**
 * Annule le countdown matériel (remet à 0).
 * Appelé quand une session est arrêtée manuellement avant la fin.
 */
export const annulerCountdown = async (posteId) => {
  const zigbeeName = await getZigbeeName(posteId)
  await publier(zigbeeName, { countdown: 0 })
  logger.info(`[zigbee] Poste ${posteId} countdown annulé`)
}

/**
 * Configure la prise pour rester éteinte après une coupure de courant.
 * Doit être appelé une seule fois lors de l'appairage initial.
 * Évite qu'une TV se rallume automatiquement sans session active en base.
 */
export const configurerCoupure = async (posteId) => {
  const zigbeeName = await getZigbeeName(posteId)
  await publier(zigbeeName, { power_outage_memory: 'off' })
  logger.info(`[zigbee] Poste ${posteId} power_outage_memory → off`)
}

/**
 * Fait clignoter physiquement la LED de la prise.
 * Utile pour identifier quelle prise correspond à quel poste lors de l'installation.
 * Bouton "📍 Localiser" dans Admin → Postes.
 */
export const identifierPoste = async (posteId) => {
  const zigbeeName = await getZigbeeName(posteId)
  await publier(zigbeeName, { identify: 'identify' })
  logger.info(`[zigbee] Poste ${posteId} identify envoyé`)
}

/**
 * Lit l'état actuel de la prise depuis le dernier message retained de Z2M.
 * Timeout 3s si aucune réponse.
 */
export const getStatutPoste = async (posteId) => {
  const zigbeeName = await getZigbeeName(posteId)

  return new Promise((resolve) => {
    const topic = `${Z2M_TOPIC}/${zigbeeName}`
    const mqttClient = getClient()

    const timer = setTimeout(() => {
      mqttClient.unsubscribe(topic)
      resolve({ posteId, statut: 'INCONNU' })
    }, 3000)

    mqttClient.subscribe(topic, { qos: 0 }, () => {
      mqttClient.once('message', (t, msg) => {
        if (t !== topic) return
        clearTimeout(timer)
        mqttClient.unsubscribe(topic)
        try {
          const data = JSON.parse(msg.toString())
          resolve({ posteId, statut: data.state === 'ON' ? 'ON' : 'OFF' })
        } catch {
          resolve({ posteId, statut: 'INCONNU' })
        }
      })
    })
  })
}

/**
 * Retourne les statuts de tous les postes appairés.
 */
export const getAllStatuts = async () => {
  const postes = await prisma.poste.findMany({
    where: { zigbeeName: { not: null } },
    select: { id: true, zigbeeName: true }
  })

  const resultats = await Promise.allSettled(postes.map((p) => getStatutPoste(p.id)))

  return resultats.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : { posteId: postes[i].id, statut: 'INCONNU' }
  )
}
