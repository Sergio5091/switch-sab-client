import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// En dehors de Linux (ex: Windows en dev local), nmcli n'existe pas.
// On active le mode mock pour pouvoir tester les routes sans le Pi.
const IS_MOCK = process.platform !== 'linux'

// ─── Données mock (dev local Windows) ─────────────────────────────────────────

const MOCK_RESEAUX = [
  { ssid: 'Bbox-SalleDuGerant',  signal: 87, securise: true  },
  { ssid: 'FreeWifi_Secure',     signal: 64, securise: true  },
  { ssid: 'Orange-Invite',       signal: 51, securise: false },
  { ssid: 'SFR_Guest',           signal: 33, securise: true  },
]

// Simule l'état de connexion — false au départ (hotspot actif), passe à true
// après un appel POST /connect réussi, pour reproduire le vrai comportement.
let mockConnected = false

// ─── GET /api/network/status ──────────────────────────────────────────────────

export const getStatus = async (req, res) => {
  if (IS_MOCK) {
    return res.json({ connected: mockConnected, _mock: true })
  }

  try {
    const { stdout } = await execAsync('nmcli -t -f TYPE,STATE con show --active')
    const connected = stdout.includes('wifi') && !stdout.includes('SwitchSAB-Setup')
    return res.json({ connected })
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
}

// ─── GET /api/network/scan ────────────────────────────────────────────────────

export const scanReseaux = async (req, res) => {
  if (IS_MOCK) {
    return res.json(MOCK_RESEAUX)
  }

  try {
    const { stdout } = await execAsync('nmcli -t -f SSID,SIGNAL,SECURITY device wifi list')
    const reseaux = stdout
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [ssid, signal, security] = line.split(':')
        return {
          ssid,
          signal: parseInt(signal, 10),
          securise: security !== '',
        }
      })
      .filter((r) => r.ssid)
    return res.json(reseaux)
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
}

// ─── POST /api/network/connect ────────────────────────────────────────────────

export const connecter = async (req, res) => {
  const { ssid, password } = req.body
  if (!ssid) {
    return res.status(400).json({ message: 'SSID requis' })
  }

  if (IS_MOCK) {
    // Simule un échec si le mot de passe est "wrong" — utile pour tester le cas d'erreur
    if (password === 'wrong') {
      return res.status(400).json({
        success: false,
        message: 'Échec de connexion — vérifiez le mot de passe et réessayez',
      })
    }
    mockConnected = true
    return res.json({ success: true, message: `Connecté avec succès (mock) à "${ssid}"` })
  }

  try {
    const cmd = password
      ? `nmcli device wifi connect "${ssid}" password "${password}"`
      : `nmcli device wifi connect "${ssid}"`
    await execAsync(cmd)

    await new Promise((resolve) => setTimeout(resolve, 3000))

    const { stdout } = await execAsync('nmcli -t -f TYPE,STATE con show --active')
    const connected = stdout.includes('wifi') && !stdout.includes('SwitchSAB-Setup')

    if (connected) {
      await execAsync('nmcli con down SwitchSAB-Setup').catch(() => {})
      return res.json({ success: true, message: 'Connecté avec succès' })
    } else {
      return res.status(400).json({
        success: false,
        message: 'Échec de connexion — vérifiez le mot de passe et réessayez',
      })
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
}
