/**
 * switchService.js — Routeur USB/WIFI automatique
 * Lit salle.switchType en BDD et route vers le bon driver.
 * Alessio appelle uniquement allumerPoste() et eteindrePoste().
 */

import prisma from '../services/prismaClient.js'
import * as mock from './mockSwitch.js'
import * as usb  from './usbSwitch.js'
import * as wifi from './wifiSwitch.js'

const getDriver = async () => {
  // En dev, forcer le mock si pas de BDD configurée
  if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK_SWITCH === 'true') {
    return mock
  }

  const salle = await prisma.salle.findFirst()
  if (!salle) return mock

  switch (salle.switchType) {
    case 'USB':  return usb
    case 'WIFI': return wifi
    default:     return mock
  }
}

export const allumerPoste = async (posteId) => {
  const driver = await getDriver()
  return driver.allumerPoste(posteId)
}

export const eteindrePoste = async (posteId) => {
  const driver = await getDriver()
  return driver.eteindrePoste(posteId)
}

export const getStatutPoste = async (posteId) => {
  const driver = await getDriver()
  return driver.getStatutPoste(posteId)
}

export const getAllStatuts = async () => {
  const driver = await getDriver()
  return driver.getAllStatuts()
}
