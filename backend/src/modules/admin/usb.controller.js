/**
 * usb.controller.js — Gestion du switch USB multi-relais
 *
 * Routes :
 *   GET  /admin/usb/detecter          — liste les périphériques série candidats
 *   POST /admin/usb/configurer        — enregistre le port choisi + nb relais
 *   GET  /admin/usb/statut            — { connecte: bool, portPath, nbRelais }
 *   POST /admin/usb/tester/:relais    — impulsion 2s sur un relais (pour vérification)
 */

import prisma from '../../services/prismaClient.js'
import logger from '../../config/logger.js'
import { detecterSwitch, testerRelais, getStatutConnexion } from '../../switch/usbSwitch.js'

// ─── GET /admin/usb/detecter ──────────────────────────────────────────────────

export const detecter = async (req, res) => {
  try {
    const candidats = await detecterSwitch()

    if (candidats.length === 0) {
      return res.status(404).json({
        message: 'Aucun périphérique série détecté. Vérifiez le branchement du switch USB.'
      })
    }

    if (candidats.length === 1) {
      return res.json({
        detecte: true,
        port: candidats[0].path,
        vendorId: candidats[0].vendorId,
        manufacturer: candidats[0].manufacturer || null,
        candidats
      })
    }

    // Plusieurs candidats → l'admin doit choisir

    return res.json({
      detecte: false,
      candidats: candidats.map(p => ({
        path: p.path,
        vendorId: p.vendorId,
        manufacturer: p.manufacturer || null,
        serialNumber: p.serialNumber || null,
      }))
    })
  } catch (err) {
    logger.error('[usb/detecter]', err.message)
    return res.status(500).json({ message: err.message })
  }
}

// ─── POST /admin/usb/configurer ───────────────────────────────────────────────

export const configurer = async (req, res) => {
  const { portPath, nbRelais } = req.body

  if (!portPath) {
    return res.status(400).json({ message: 'portPath est requis' })
  }

  const nb = Number(nbRelais)
  if (!nb || ![2, 4, 8, 16, 32].includes(nb)) {
    return res.status(400).json({
      message: 'nbRelais doit être 2, 4, 8, 16 ou 32'
    })
  }

  try {
    const salle = await prisma.salle.findFirst()
    if (!salle) return res.status(404).json({ message: 'Salle introuvable' })

    await prisma.salle.update({
      where: { id: salle.id },
      data: {
        usbPortPath: portPath,
        usbNbRelais: nb,
        switchType: 'USB',
      }
    })

    logger.info(`[usb] Switch configuré : port=${portPath}, nbRelais=${nb}`)
    return res.json({ success: true, portPath, nbRelais: nb })
  } catch (err) {
    logger.error('[usb/configurer]', err.message)
    return res.status(500).json({ message: err.message })
  }
}

// ─── GET /admin/usb/statut ────────────────────────────────────────────────────

export const statut = async (req, res) => {
  try {
    const salle = await prisma.salle.findFirst({
      select: { usbPortPath: true, usbNbRelais: true, switchType: true }
    })

    const connexion = getStatutConnexion()

    return res.json({
      connecte: connexion.connecte,
      portPath: salle?.usbPortPath || null,
      nbRelais: salle?.usbNbRelais || null,
      switchType: salle?.switchType || 'MOCK',
    })
  } catch (err) {
    logger.error('[usb/statut]', err.message)
    return res.status(500).json({ message: err.message })
  }
}

// ─── POST /admin/usb/tester/:relais ──────────────────────────────────────────

export const tester = async (req, res) => {
  const relaisNumero = parseInt(req.params.relais, 10)

  if (isNaN(relaisNumero) || relaisNumero < 1 || relaisNumero > 32) {
    return res.status(400).json({ message: 'Numéro de relais invalide (1–32)' })
  }

  try {
    // Vérifier que le relais est dans les limites du modèle installé
    const salle = await prisma.salle.findFirst()
    if (salle?.usbNbRelais && relaisNumero > salle.usbNbRelais) {
      return res.status(400).json({
        message: `Ce modèle de switch ne possède que ${salle.usbNbRelais} relais.`
      })
    }

    await testerRelais(relaisNumero)
    return res.json({ success: true, relaisNumero })
  } catch (err) {
    logger.error(`[usb/tester] relais ${relaisNumero} : ${err.message}`)
    return res.status(500).json({ success: false, message: err.message })
  }
}

// ─── PATCH /admin/usb/poste/:posteId ─────────────────────────────────────────
// Associe un numéro de relais à un poste (avec validations)

export const associerRelais = async (req, res) => {
  const posteId = Number(req.params.posteId)
  const { usbRelaisNumero } = req.body

  if (!usbRelaisNumero && usbRelaisNumero !== 0) {
    // null = dissociation
    try {
      await prisma.poste.update({
        where: { id: posteId },
        data: { usbRelaisNumero: null, usbDernierEtat: 'OFF' }
      })
      return res.json({ success: true, posteId, usbRelaisNumero: null })
    } catch (err) {
      return res.status(500).json({ message: err.message })
    }
  }

  const nouveauNumero = Number(usbRelaisNumero)

  if (isNaN(nouveauNumero) || nouveauNumero < 1 || nouveauNumero > 32) {
    return res.status(400).json({ message: 'Numéro de relais invalide (1–32)' })
  }

  try {
    // Vérifier que le numéro est dans la limite du modèle installé
    const salle = await prisma.salle.findFirst()
    if (salle?.usbNbRelais && nouveauNumero > salle.usbNbRelais) {
      return res.status(400).json({
        message: `Ce modèle de switch ne possède que ${salle.usbNbRelais} relais.`
      })
    }

    // Vérifier qu'aucun autre poste n'utilise déjà ce relais
    const conflit = await prisma.poste.findFirst({
      where: {
        usbRelaisNumero: nouveauNumero,
        id: { not: posteId }
      }
    })
    if (conflit) {
      return res.status(409).json({
        message: `Le relais ${nouveauNumero} est déjà utilisé par le poste "${conflit.nom}"`
      })
    }

    const poste = await prisma.poste.update({
      where: { id: posteId },
      data: { usbRelaisNumero: nouveauNumero }
    })

    logger.info(`[usb] Poste ${posteId} → relais ${nouveauNumero}`)
    return res.json({ success: true, posteId, usbRelaisNumero: poste.usbRelaisNumero })
  } catch (err) {
    logger.error(`[usb/associerRelais] poste ${posteId} : ${err.message}`)
    return res.status(500).json({ message: err.message })
  }
}
