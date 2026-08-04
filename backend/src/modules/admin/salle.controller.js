import prisma from '../../services/prismaClient.js'
import logger from '../../config/logger.js'

// ─── GET /admin/salle ─────────────────────────────────────────────────────────

export const getSalle = async (req, res) => {
  try {
    const salle = await prisma.salle.findUnique({
      where: { id: req.user.salle_id },
      select: {
        id: true,
        nom: true,
        pays: true,
        indicatifPays: true,
        ville: true,
        quartier: true,
        telephone: true,
        switchType: true,
        switchConfig: true,
        usbPortPath: true,
        usbNbRelais: true,
      }
    })
    if (!salle) return res.status(404).json({ message: 'Salle introuvable' })
    return res.json(salle)
  } catch (err) {
    logger.error('[admin/salle GET]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}

// ─── PATCH /admin/salle ───────────────────────────────────────────────────────

export const modifierSalle = async (req, res) => {
  const { nom, pays, indicatifPays, ville, quartier, telephone, switchType, switchConfig } = req.body

  // Validation : IP obligatoire si WIFI
  if (switchType === 'WIFI' && !switchConfig?.trim()) {
    return res.status(400).json({ message: "L'adresse IP est requise pour le mode WIFI" })
  }

  try {
    // ── Garde : blocage si changement de switchType avec sessions actives ────
    if (switchType !== undefined) {
      const salleActuelle = await prisma.salle.findUnique({
        where: { id: req.user.salle_id },
        select: { switchType: true }
      })

      if (salleActuelle && salleActuelle.switchType !== switchType) {
        const sessionActive = await prisma.session.findFirst({
          where: {
            statut: 'ACTIVE',
            poste: { categorie: { salleId: req.user.salle_id } }
          }
        })

        if (sessionActive) {
          return res.status(409).json({
            message: `Impossible de changer le type de switch : ${sessionActive.id ? 'une' : 'des'} session(s) sont actives en ce moment. Attendez la fin de toutes les sessions avant de modifier cette configuration.`
          })
        }
      }
    }
    // ────────────────────────────────────────────────────────────────────────
    const salle = await prisma.salle.update({
      where: { id: req.user.salle_id },
      data: {
        ...(nom          !== undefined && { nom }),
        ...(pays         !== undefined && { pays }),
        ...(indicatifPays !== undefined && { indicatifPays: indicatifPays.toUpperCase() }),
        ...(ville        !== undefined && { ville }),
        ...(quartier     !== undefined && { quartier }),
        ...(telephone    !== undefined && { telephone }),
        ...(switchType   !== undefined && { switchType }),
        // Si passage à USB, on efface la config IP
        switchConfig: switchType === 'USB' ? (switchConfig || null) : (switchConfig ?? undefined),
      },
      select: {
        id: true,
        nom: true,
        pays: true,
        indicatifPays: true,
        ville: true,
        quartier: true,
        telephone: true,
        switchType: true,
        switchConfig: true,
        usbPortPath: true,
        usbNbRelais: true,
      }
    })

    logger.info(`[admin/salle] Config mise à jour : switchType=${salle.switchType}, switchConfig=${salle.switchConfig}`)
    return res.json({ message: 'Configuration mise à jour', salle })
  } catch (err) {
    logger.error('[admin/salle PATCH]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}
