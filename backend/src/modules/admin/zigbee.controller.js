/**
 * zigbee.controller.js
 *
 * POST /api/admin/zigbee/appairer
 * Lance l'appairage Zigbee2MQTT et lie automatiquement
 * la première prise détectée au poste demandé.
 *
 * Flux :
 *  1. Vérifie que le poste existe et appartient à la salle
 *  2. Génère un friendly_name depuis le nom du poste
 *  3. Ouvre l'appairage Z2M (permit_join 120s)
 *  4. Écoute zigbee2mqtt/bridge/event en attendant device_joined
 *  5. Renomme la prise dans Z2M avec le friendly_name généré
 *  6. Sauvegarde zigbeeName sur le poste en base
 *  7. Répond { success, zigbeeName }
 */

import mqtt from 'mqtt'
import prisma from '../../services/prismaClient.js'
import logger from '../../config/logger.js'

const MQTT_URL  = process.env.MQTT_URL          || 'mqtt://localhost:1883'
const Z2M_TOPIC = process.env.ZIGBEE2MQTT_TOPIC || 'zigbee2mqtt'
const TIMEOUT_MS = 120_000 // 120 secondes

/**
 * Convertit un nom de poste en friendly_name Z2M valide.
 * "PS4 n°1" → "ps4_1"
 * "Xbox One" → "xbox_one"
 */
const toFriendlyName = (nom) =>
  nom
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // supprime les accents
    .replace(/[^a-z0-9]+/g, '_')     // remplace tout ce qui n'est pas alphanum par _
    .replace(/^_+|_+$/g, '')         // supprime les _ en début/fin

export const appairerPrise = async (req, res) => {
  const posteId = Number(req.params.posteId)

  // ── 1. Vérifier que le poste existe et appartient à la salle ──────────────
  const poste = await prisma.poste.findFirst({
    where: { id: posteId },
    include: { categorie: true }
  })

  if (!poste || poste.categorie.salleId !== req.user.salle_id) {
    return res.status(404).json({ message: 'Poste introuvable' })
  }

  // ── 2. Générer le friendly_name depuis le nom du poste ────────────────────
  const zigbeeName = toFriendlyName(poste.nom)

  logger.info(`[zigbee/appairer] Poste "${poste.nom}" → friendly_name "${zigbeeName}"`)

  // ── 3. Ouvrir une connexion MQTT dédiée à cet appairage ───────────────────
  const mqttClient = mqtt.connect(MQTT_URL, {
    clientId: `switch-sab-pairing-${Date.now()}`,
    clean: true,
  })

  // Promesse qui se résout quand une prise est détectée, ou rejette en timeout
  const appareilDetecte = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('timeout'))
    }, TIMEOUT_MS)

    mqttClient.on('connect', () => {
      logger.info('[zigbee/appairer] MQTT connecté — ouverture appairage Z2M')

      // ── Ouvrir l'appairage ──────────────────────────────────────────────
      mqttClient.publish(
        `${Z2M_TOPIC}/bridge/request/permit_join`,
        JSON.stringify({ value: true, time: 120 }),
        { qos: 1 }
      )

      // ── S'abonner aux événements bridge ────────────────────────────────
      mqttClient.subscribe(`${Z2M_TOPIC}/bridge/event`, { qos: 0 })

      mqttClient.on('message', (topic, payload) => {
        if (topic !== `${Z2M_TOPIC}/bridge/event`) return

        let event
        try {
          event = JSON.parse(payload.toString())
        } catch {
          return
        }

        // Logger tous les events pour debug
        logger.info(`[zigbee/appairer] bridge/event reçu : type="${event.type}" data=${JSON.stringify(event.data)}`)

        // device_joined = nouvelle prise qui s'appairie
        // device_announce = prise déjà connue qui rejoint le réseau après un reset
        if (event.type === 'device_joined' || event.type === 'device_announce') {
          const ieeeAddress = event.data?.ieee_address
          if (!ieeeAddress) {
            logger.warn('[zigbee/appairer] event reçu sans ieee_address, ignoré')
            return
          }
          logger.info(`[zigbee/appairer] Appareil détecté (${event.type}) : ${ieeeAddress}`)
          clearTimeout(timer)
          resolve(ieeeAddress)
        }
      })
    })

    mqttClient.on('error', (err) => {
      clearTimeout(timer)
      reject(new Error(`MQTT error: ${err.message}`))
    })
  })

  try {
    const ieeeAddress = await appareilDetecte

    // ── 4. Fermer l'appairage ─────────────────────────────────────────────
    mqttClient.publish(
      `${Z2M_TOPIC}/bridge/request/permit_join`,
      JSON.stringify({ value: false }),
      { qos: 1 }
    )

    // ── 5. Renommer la prise dans Z2M ─────────────────────────────────────
    mqttClient.publish(
      `${Z2M_TOPIC}/bridge/request/device/rename`,
      JSON.stringify({ from: ieeeAddress, to: zigbeeName }),
      { qos: 1 }
    )
    logger.info(`[zigbee/appairer] Prise ${ieeeAddress} renommée → "${zigbeeName}"`)

    // ── 6. Sauvegarder en base ────────────────────────────────────────────
    await prisma.poste.update({
      where: { id: posteId },
      data: { zigbeeName }
    })

    // ── 7. Mettre à jour le switchType de la salle si encore en MOCK ──────
    const salle = await prisma.salle.findFirst()
    if (salle && salle.switchType === 'MOCK') {
      await prisma.salle.update({
        where: { id: salle.id },
        data: { switchType: 'ZIGBEE' }
      })
      logger.info('[zigbee/appairer] switchType salle → ZIGBEE')
    }

    mqttClient.end()

    // ── 8. Configuration initiale de la prise (après rename, délai 2s) ────
    // On attend que Z2M enregistre le nouveau nom avant d'envoyer des commandes.
    // power_outage_memory: 'off' → la prise reste éteinte après une coupure de courant
    setTimeout(async () => {
      try {
        const { configurerCoupure } = await import('../../switch/zigbeeSwitch.js')
        await configurerCoupure(posteId)
        logger.info(`[zigbee/appairer] Poste ${posteId} power_outage_memory configuré`)
      } catch (e) {
        logger.warn(`[zigbee/appairer] Erreur config coupure : ${e.message}`)
      }
    }, 2000)

    logger.info(`[zigbee/appairer] ✅ Poste "${poste.nom}" lié à la prise "${zigbeeName}"`)

    return res.json({
      success: true,
      zigbeeName,
      posteId,
      message: `Prise liée au poste "${poste.nom}"`
    })

  } catch (err) {
    mqttClient.end()

    // Fermer l'appairage en cas d'échec aussi
    try {
      const c = mqtt.connect(MQTT_URL, { clientId: `cleanup-${Date.now()}` })
      c.on('connect', () => {
        c.publish(
          `${Z2M_TOPIC}/bridge/request/permit_join`,
          JSON.stringify({ value: false }),
          { qos: 1 },
          () => c.end()
        )
      })
    } catch (_) {}

    if (err.message === 'timeout') {
      logger.warn(`[zigbee/appairer] Timeout — aucune prise détectée pour "${poste.nom}"`)
      return res.status(408).json({
        success: false,
        message: 'Aucune prise détectée en 120 secondes. Vérifiez que vous avez bien appuyé 5 secondes sur le bouton.'
      })
    }

    logger.error(`[zigbee/appairer] Erreur : ${err.message}`)
    return res.status(500).json({ success: false, message: err.message })
  }
}

/**
 * DELETE /api/admin/zigbee/desappairer/:posteId
 * Retire le lien entre un poste et sa prise Zigbee.
 */
export const desappairerPrise = async (req, res) => {
  const posteId = Number(req.params.posteId)

  const poste = await prisma.poste.findFirst({
    where: { id: posteId },
    include: { categorie: true }
  })

  if (!poste || poste.categorie.salleId !== req.user.salle_id) {
    return res.status(404).json({ message: 'Poste introuvable' })
  }

  await prisma.poste.update({
    where: { id: posteId },
    data: { zigbeeName: null }
  })

  return res.json({ success: true, message: `Prise déliée du poste "${poste.nom}"` })
}

/**
 * POST /api/admin/zigbee/identifier/:posteId
 * Fait clignoter physiquement la LED de la prise.
 * Utile lors de l'installation pour savoir quelle prise correspond à quel poste.
 */
export const identifierPrise = async (req, res) => {
  const posteId = Number(req.params.posteId)

  const poste = await prisma.poste.findFirst({
    where: { id: posteId },
    include: { categorie: true }
  })

  if (!poste || poste.categorie.salleId !== req.user.salle_id) {
    return res.status(404).json({ message: 'Poste introuvable' })
  }

  if (!poste.zigbeeName) {
    return res.status(400).json({ message: 'Ce poste n\'a pas de prise Zigbee associée' })
  }

  try {
    const { identifierPoste } = await import('../../switch/zigbeeSwitch.js')
    await identifierPoste(posteId)
    return res.json({ success: true, message: `Prise "${poste.zigbeeName}" en train de clignoter` })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
}
