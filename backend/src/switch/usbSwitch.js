/**
 * usbSwitch.js — Driver USB multi-relais Arduino (protocole 2 lettres)
 *
 * Protocole série : 9600 baud, 8N1
 * Port 1  → allumer "AA"  éteindre "aa"
 * Port 2  → allumer "AB"  éteindre "ab"
 * ...
 * Port 26 → allumer "AZ"  éteindre "az"
 * Port 27 → allumer "BA"  éteindre "ba"
 * ...
 * Port 32 → allumer "BF"  éteindre "bf"
 *
 * L'état n'est pas lisible depuis le hardware — on stocke le dernier état
 * connu dans Poste.usbDernierEtat et on resynchronise à chaque reconnexion.
 *
 * Interface obligatoire (même contrat que mockSwitch / zigbeeSwitch) :
 *   allumerPoste(posteId)
 *   eteindrePoste(posteId)
 *   getStatutPoste(posteId)
 *   getAllStatuts()
 *
 * Fonctions supplémentaires pour les routes Admin :
 *   testerRelais(relaisNumero)     — impulsion ON/OFF de 2s
 *   getStatutConnexion()           — { connecte: bool }
 *   detecterSwitch()               — liste les périphériques série détectés
 */

import { SerialPort } from 'serialport'
import prisma from '../services/prismaClient.js'
import logger from '../config/logger.js'
import { getIO } from '../socket.js'

const BAUDRATE = 9600

// ─── Port série singleton ─────────────────────────────────────────────────────

let _port = null

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Convertit un numéro de relais (1–32) en code de commande 2 lettres.
 * allumer = true  → "AA"–"BF" (majuscules)
 * allumer = false → "aa"–"bf" (minuscules)
 */
export function portToCommand(port, allumer = true) {
  if (port < 1 || port > 32) {
    throw new Error(`Port invalide : ${port} (doit être entre 1 et 32)`)
  }
  const index = port - 1
  const premiereLettre = String.fromCharCode(65 + Math.floor(index / 26))
  const deuxiemeLettre = String.fromCharCode(65 + (index % 26))
  const code = premiereLettre + deuxiemeLettre
  return allumer ? code : code.toLowerCase()
}

/**
 * Retourne le numéro de relais USB associé à un poste.
 * Lance une erreur explicite si non configuré.
 */
async function getRelaisNumero(posteId) {
  const poste = await prisma.poste.findUnique({ where: { id: posteId } })
  if (!poste?.usbRelaisNumero) {
    throw new Error(
      `Poste ${posteId} : aucun relais USB associé. ` +
      `Configurez le numéro de relais depuis Admin → Postes.`
    )
  }
  return poste.usbRelaisNumero
}

/**
 * Envoie une commande brute sur le port série déjà ouvert.
 */
async function envoyerCommandeBrute(commande) {
  return new Promise((resolve, reject) => {
    _port.write(commande, (err) => {
      if (err) return reject(err)
      _port.drain((errDrain) => {
        if (errDrain) return reject(errDrain)
        resolve()
      })
    })
  })
}

// ─── Resynchronisation ───────────────────────────────────────────────────────

/**
 * À la reconnexion du switch, recalcule l'état attendu depuis la base
 * (sessions actives) et renvoie les commandes pour chaque relais.
 *
 * Limite assumée : quelques secondes de décalage entre le redémarrage
 * physique du switch et la fin de la resync — acceptable sans confirmation HW.
 */
async function resynchroniserTousLesRelais() {
  logger.info('[usb] Reconnexion détectée — resynchronisation de tous les relais')

  const postes = await prisma.poste.findMany({
    where: { usbRelaisNumero: { not: null } },
    include: {
      sessions: { where: { statut: 'ACTIVE' }, take: 1 }
    }
  })

  for (const poste of postes) {
    const doitEtreAllume = poste.sessions.length > 0
    try {
      const commande = portToCommand(poste.usbRelaisNumero, doitEtreAllume)
      await envoyerCommandeBrute(commande)
      await prisma.poste.update({
        where: { id: poste.id },
        data: { usbDernierEtat: doitEtreAllume ? 'ON' : 'OFF' }
      })
      logger.info(
        `[usb] Poste ${poste.id} (relais ${poste.usbRelaisNumero}) ` +
        `resynchronisé → ${doitEtreAllume ? 'ON' : 'OFF'}`
      )
    } catch (err) {
      logger.error(`[usb] Échec resynchronisation poste ${poste.id}: ${err.message}`)
    }
  }
}

// ─── Gestion du port série singleton ─────────────────────────────────────────

/**
 * Retourne le port série ouvert, ou l'ouvre si nécessaire.
 * Vérifie que le chemin configuré existe toujours dans la liste des ports système.
 * À la reconnexion (port était fermé), déclenche la resync des relais.
 */
async function getPort() {
  if (_port && _port.isOpen) return _port

  const salle = await prisma.salle.findFirst()
  if (!salle?.usbPortPath) {
    throw new Error(
      'Aucun port USB configuré. ' +
      'Lancez la détection depuis Admin → Paramètres → Switch.'
    )
  }

  // Vérifier que le port existe encore dans la liste des ports système
  const ports = await SerialPort.list()
  const portExiste = ports.find(p => p.path === salle.usbPortPath)
  if (!portExiste) {
    throw new Error(
      `Switch USB introuvable sur ${salle.usbPortPath}. ` +
      `Si le switch a été changé ou débranché, relancez la détection ` +
      `depuis Admin → Paramètres → Switch.`
    )
  }

  // true = vraie reconnexion après coupure (pas le premier démarrage)
  const etaitDejaFerme = _port !== null

  _port = new SerialPort({ path: salle.usbPortPath, baudRate: BAUDRATE })

  _port.on('error', (err) => {
    logger.error(`[usb] Erreur port série : ${err.message}`)
    _port = null
  })

  _port.on('close', () => {
    logger.warn('[usb] Port série fermé (câble débranché ?)')
    _port = null
    try {
      getIO().emit('usb:deconnecte', { message: 'Switch USB déconnecté' })
    } catch (_) {
      // socket pas encore init (ex: démarrage)
    }
  })

  return new Promise((resolve, reject) => {
    _port.once('open', async () => {
      logger.info(`[usb] Port série ouvert : ${salle.usbPortPath}`)
      if (etaitDejaFerme) {
        try {
          await resynchroniserTousLesRelais()
          getIO().emit('usb:resynchronisation', {
            message: 'Switch reconnecté, postes resynchronisés'
          })
        } catch (errResync) {
          logger.error(`[usb] Erreur resync : ${errResync.message}`)
        }
      }
      resolve(_port)
    })
    _port.once('error', reject)
  })
}

// ─── Interface obligatoire ────────────────────────────────────────────────────

export const allumerPoste = async (posteId) => {
  const relais = await getRelaisNumero(posteId)
  await getPort()
  const commande = portToCommand(relais, true)
  await envoyerCommandeBrute(commande)
  await prisma.poste.update({ where: { id: posteId }, data: { usbDernierEtat: 'ON' } })
  logger.info(`[usb] Poste ${posteId} (relais ${relais}) → ALLUMÉ (${commande})`)
  return { success: true, posteId, statut: 'ON' }
}

export const eteindrePoste = async (posteId) => {
  const relais = await getRelaisNumero(posteId)
  await getPort()
  const commande = portToCommand(relais, false)
  await envoyerCommandeBrute(commande)
  await prisma.poste.update({ where: { id: posteId }, data: { usbDernierEtat: 'OFF' } })
  logger.info(`[usb] Poste ${posteId} (relais ${relais}) → ÉTEINT (${commande})`)
  return { success: true, posteId, statut: 'OFF' }
}

export const getStatutPoste = async (posteId) => {
  const poste = await prisma.poste.findUnique({ where: { id: posteId } })
  return { posteId, statut: poste?.usbDernierEtat || 'INCONNU' }
}

export const getAllStatuts = async () => {
  const postes = await prisma.poste.findMany({
    where: { usbRelaisNumero: { not: null } },
    select: { id: true, usbDernierEtat: true }
  })
  return postes.map(p => ({ posteId: p.id, statut: p.usbDernierEtat || 'INCONNU' }))
}

// ─── Fonctions supplémentaires (Admin) ───────────────────────────────────────

/**
 * Impulsion ON pendant 2 secondes puis OFF sur un relais donné.
 * Utilisé depuis Admin pour tester physiquement l'assignation d'un relais.
 */
export const testerRelais = async (relaisNumero) => {
  if (relaisNumero < 1 || relaisNumero > 32) {
    throw new Error(`Numéro de relais invalide : ${relaisNumero}`)
  }
  await getPort()
  const commandeOn = portToCommand(relaisNumero, true)
  await envoyerCommandeBrute(commandeOn)
  logger.info(`[usb] Test relais ${relaisNumero} → ON`)
  await new Promise(r => setTimeout(r, 2000))
  const commandeOff = portToCommand(relaisNumero, false)
  await envoyerCommandeBrute(commandeOff)
  logger.info(`[usb] Test relais ${relaisNumero} → OFF (fin impulsion)`)
}

/**
 * Retourne l'état de la connexion série.
 */
export const getStatutConnexion = () => ({
  connecte: _port?.isOpen === true
})

/**
 * Détecte les périphériques série disponibles sur le système.
 * Ne filtre pas par vendorId — un switch peut utiliser n'importe quelle puce USB-série.
 * Retourne tous les ports ayant au moins un vendorId pour écarter les ports virtuels.
 */
export const detecterSwitch = async () => {
  const ports = await SerialPort.list()
  const candidats = ports.filter(p => p.vendorId)
  return candidats
}
