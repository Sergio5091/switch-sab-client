/**
 * switchService.js — Routeur automatique vers le bon driver
 * Lit salle.switchType en BDD et route vers le bon driver.
 *
 * Types supportés :
 *   MOCK   → simulateur (développement / démo)
 *   ZIGBEE → prises Zigbee via Zigbee2MQTT + MQTT
 *   WIFI   → driver WIFI HTTP local (non implémenté)
 *   USB    → driver USB série (non implémenté)
 *
 * Alessio appelle uniquement allumerPoste() et eteindrePoste().
 */

import prisma from '../services/prismaClient.js'
import * as mock   from './mockSwitch.js'
import * as wifi   from './wifiSwitch.js'
import * as zigbee from './zigbeeSwitch.js'
// usbSwitch n'est PAS importé statiquement ici — serialport n'est pas disponible
// en dev local (Windows) et n'est pas listé dans package.json.
// L'import est fait dynamiquement uniquement si switchType === 'USB'.

const getDriver = async () => {
  // Forcer le mock en développement si USE_MOCK_SWITCH=true
  if (process.env.USE_MOCK_SWITCH === 'true') {
    return mock
  }

  const salle = await prisma.salle.findFirst()
  if (!salle) return mock

  switch (salle.switchType) {
    case 'ZIGBEE': return zigbee
    case 'USB':    return await import('./usbSwitch.js')
    case 'WIFI':   return wifi
    default:       return mock
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
