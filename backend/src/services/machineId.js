import { networkInterfaces, hostname } from 'os'
import { createHash } from 'crypto'

/**
 * Génère un identifiant unique et stable pour cette machine.
 * Basé sur : hostname + première adresse MAC non-loopback.
 * Résultat : hash SHA256 tronqué à 16 caractères.
 */
export const getMachineId = () => {
  const host = hostname()

  // Récupère la première adresse MAC non-loopback
  const interfaces = networkInterfaces()
  let mac = 'no-mac'

  for (const iface of Object.values(interfaces)) {
    for (const entry of iface) {
      if (!entry.internal && entry.mac && entry.mac !== '00:00:00:00:00:00') {
        mac = entry.mac
        break
      }
    }
    if (mac !== 'no-mac') break
  }

  const raw = `${host}::${mac}`
  return createHash('sha256').update(raw).digest('hex').slice(0, 16)
}
