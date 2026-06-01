/**
 * mockSwitch.js — Simulateur de switch (développement / test)
 * Simule l'allumage et l'extinction de postes sans matériel réel.
 */

const etatsPostes = {} // { [posteId]: 'ON' | 'OFF' }

export const allumerPoste = async (posteId) => {
  etatsPostes[posteId] = 'ON'
  console.log(`[MOCK] Poste ${posteId} → ALLUMÉ`)
  return { success: true, posteId, statut: 'ON' }
}

export const eteindrePoste = async (posteId) => {
  etatsPostes[posteId] = 'OFF'
  console.log(`[MOCK] Poste ${posteId} → ÉTEINT`)
  return { success: true, posteId, statut: 'OFF' }
}

export const getStatutPoste = async (posteId) => {
  const statut = etatsPostes[posteId] || 'OFF'
  return { posteId, statut }
}

export const getAllStatuts = async () => {
  return Object.entries(etatsPostes).map(([posteId, statut]) => ({
    posteId: Number(posteId),
    statut
  }))
}
