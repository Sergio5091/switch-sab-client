/**
 * usbSwitch.js — Driver USB série
 *
 * Communication via port série (COM ou /dev/ttyUSBx) :
 *   Allumer : envoie la commande "AA\n"  (ou "switch\n")
 *   Éteindre: envoie la commande "aa\n"
 *
 * Le port COM est lu depuis salle.switchConfig en base de données.
 * Exemple de valeur : "COM3"  ou  "/dev/ttyUSB0"
 *
 * Si chaque poste a son propre port série, stocker le port dans
 * le champ poste.zigbeeName (ex: "COM3", "COM4"...) plutôt que
 * dans salle.switchConfig — modifier getPortPoste() en conséquence.
 */

import { SerialPort } from 'serialport'
import prisma from '../services/prismaClient.js'
import logger from '../config/logger.js'

// ─── Récupération du port COM configuré ──────────────────────────────────────

/**
 * Retourne le port série à utiliser pour un poste donné.
 *
 * Stratégie actuelle : port unique pour toute la salle (salle.switchConfig).
 * Si chaque poste a son propre câble USB, remplacer par :
 *   const poste = await prisma.poste.findUnique({ where: { id: posteId } })
 *   return poste?.zigbeeName  // stocker "COM3" dans zigbeeName
 */
const getPortPoste = async (posteId) => {
  const salle = await prisma.salle.findFirst()
  if (!salle?.switchConfig) {
    throw new Error('[usbSwitch] Aucun port COM configuré dans salle.switchConfig')
  }
  return salle.switchConfig.trim()
}

// ─── Envoi d'une commande sur le port série ───────────────────────────────────

/**
 * Ouvre le port série, envoie une commande texte, puis ferme le port.
 * On ouvre/ferme à chaque commande (connexion éphémère) pour éviter
 * de bloquer le port si plusieurs postes tournent en parallèle.
 *
 * @param {string} portPath  - ex: "COM3" ou "/dev/ttyUSB0"
 * @param {string} commande  - "AA" pour allumer, "aa" pour éteindre
 */
const envoyerCommande = (portPath, commande) => {
  return new Promise((resolve, reject) => {
    const port = new SerialPort({
      path: portPath,
      baudRate: 9600,   // à adapter si ton switch USB utilise un autre débit
      autoOpen: false,
    })

    port.open((errOuverture) => {
      if (errOuverture) {
        return reject(
          new Error(`[usbSwitch] Impossible d'ouvrir ${portPath} : ${errOuverture.message}`)
        )
      }

      // Envoie la commande avec un retour à la ligne (la plupart des
      // firmwares série attendent un '\n' ou '\r\n' comme terminateur)
      port.write(`${commande}\n`, 'ascii', (errEcriture) => {
        if (errEcriture) {
          port.close()
          return reject(
            new Error(`[usbSwitch] Erreur écriture sur ${portPath} : ${errEcriture.message}`)
          )
        }

        // drain() attend que les données soient bien parties avant de fermer
        port.drain((errDrain) => {
          port.close()
          if (errDrain) {
            return reject(
              new Error(`[usbSwitch] Erreur drain sur ${portPath} : ${errDrain.message}`)
            )
          }
          resolve()
        })
      })
    })

    port.on('error', (err) => {
      reject(new Error(`[usbSwitch] Erreur port ${portPath} : ${err.message}`))
    })
  })
}

// ─── Interface publique (même contrat que mockSwitch / zigbeeSwitch) ──────────

export const allumerPoste = async (posteId) => {
  try {
    const portPath = await getPortPoste(posteId)
    logger.info(`[usbSwitch] allumer poste ${posteId} → commande "AA" sur ${portPath}`)
    await envoyerCommande(portPath, 'AA')
    logger.info(`[usbSwitch] ✅ Poste ${posteId} allumé`)
    return { success: true, posteId, statut: 'ON' }
  } catch (err) {
    logger.error(`[usbSwitch] ❌ allumerPoste(${posteId}) : ${err.message}`)
    throw err
  }
}

export const eteindrePoste = async (posteId) => {
  try {
    const portPath = await getPortPoste(posteId)
    logger.info(`[usbSwitch] éteindre poste ${posteId} → commande "aa" sur ${portPath}`)
    await envoyerCommande(portPath, 'aa')
    logger.info(`[usbSwitch] ✅ Poste ${posteId} éteint`)
    return { success: true, posteId, statut: 'OFF' }
  } catch (err) {
    logger.error(`[usbSwitch] ❌ eteindrePoste(${posteId}) : ${err.message}`)
    throw err
  }
}

/**
 * L'état du switch USB ne peut pas être lu directement via le port série
 * (le switch ne répond pas à des requêtes de statut avec ce protocole).
 * On retourne donc l'état connu depuis la base de données (statut du poste).
 */
export const getStatutPoste = async (posteId) => {
  try {
    const poste = await prisma.poste.findUnique({ where: { id: posteId } })
    const statut = poste?.statut === 'OCCUPE' ? 'ON' : 'OFF'
    return { posteId, statut }
  } catch (err) {
    logger.error(`[usbSwitch] getStatutPoste(${posteId}) : ${err.message}`)
    return { posteId, statut: 'OFF' }
  }
}

export const getAllStatuts = async () => {
  try {
    const postes = await prisma.poste.findMany()
    return postes.map((p) => ({
      posteId: p.id,
      statut: p.statut === 'OCCUPE' ? 'ON' : 'OFF',
    }))
  } catch (err) {
    logger.error(`[usbSwitch] getAllStatuts : ${err.message}`)
    return []
  }
}
