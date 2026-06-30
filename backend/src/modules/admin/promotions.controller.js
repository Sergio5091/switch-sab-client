import prisma from '../../services/prismaClient.js'
import logger from '../../config/logger.js'

// ─── Utilitaire : générer le contenu VCF ─────────────────────────────────────

function buildVcf(clients) {
  return clients.map((c, i) => {
    const nom = c.nom && c.prenom
      ? `${c.prenom} ${c.nom}`
      : c.pseudo ?? `Client ${i + 1}`
    // Normaliser le numéro : ajouter + si absent
    const tel = c.telephone.startsWith('+') ? c.telephone : `+${c.telephone}`
    return [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${nom}`,
      `TEL;TYPE=CELL:${tel}`,
      'END:VCARD'
    ].join('\r\n')
  }).join('\r\n')
}

// POST /admin/promotions
export const creerPromotion = async (req, res) => {
  const { titre, message, image } = req.body

  if (!titre) return res.status(400).json({ message: 'Le titre est requis' })

  try {
    const promo = await prisma.promo.create({
      data: {
        titre,
        message: message || null,
        image:   image   || null,
        salleId: req.user.salle_id,
      }
    })
    return res.status(201).json(promo)
  } catch (err) {
    console.error('[admin/promotions POST]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}

// GET /admin/promotions
export const listerPromotions = async (req, res) => {
  try {
    const promos = await prisma.promo.findMany({
      where: { salleId: req.user.salle_id },
      orderBy: { createdAt: 'desc' }
    })
    return res.json(promos)
  } catch (err) {
    console.error('[admin/promotions GET]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}

// POST /admin/promotions/:id/envoyer — TODO Phase 2.8 Twilio
export const envoyerPromotion = async (req, res) => {
  const id = Number(req.params.id)

  try {
    const promo = await prisma.promo.findFirst({
      where: { id, salleId: req.user.salle_id }
    })
    if (!promo) return res.status(404).json({ message: 'Promotion introuvable' })

    const clients = await prisma.user.findMany({
      where: { salleId: req.user.salle_id, role: 'CLIENT', active: true },
      select: { telephone: true }
    })

    // TODO Phase 2.8 — intégration Twilio SMS/WhatsApp
    logger.info(`[promotions] Envoi à ${clients.length} clients — Twilio non configuré`)

    await prisma.promo.update({
      where: { id },
      data: { envoyee: true }
    })

    return res.json({
      message: `Promotion marquée comme envoyée (${clients.length} clients)`,
      note:    'Intégration Twilio à configurer en Phase 2.8'
    })
  } catch (err) {
    console.error('[admin/promotions/envoyer]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}

// ─── GET /admin/contacts/export → Export VCF tous les clients ────────────────

export const exportContacts = async (req, res) => {
  try {
    const clients = await prisma.user.findMany({
      where: { salleId: req.user.salle_id, role: 'CLIENT', active: true },
      select: { pseudo: true, nom: true, prenom: true, telephone: true },
      orderBy: { createdAt: 'asc' }
    })

    if (clients.length === 0) {
      return res.status(404).json({ message: 'Aucun client enregistré' })
    }

    // Mettre à jour la date du dernier export
    await prisma.salle.update({
      where: { id: req.user.salle_id },
      data: { dernierExportContacts: new Date() }
    })

    const vcf = buildVcf(clients)

    res.setHeader('Content-Type', 'text/vcard; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="clients_switch_sab.vcf"')
    return res.send(vcf)
  } catch (err) {
    console.error('[admin/contacts/export]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}

// ─── GET /admin/contacts/export/nouveaux → Export VCF nouveaux clients ───────

export const exportNouveauxContacts = async (req, res) => {
  try {
    const salle = await prisma.salle.findUnique({
      where: { id: req.user.salle_id },
      select: { dernierExportContacts: true }
    })

    const depuisLe = salle?.dernierExportContacts ?? null

    // Si jamais exporté → retourner tous les clients
    const where = {
      salleId: req.user.salle_id,
      role: 'CLIENT',
      active: true,
      ...(depuisLe ? { createdAt: { gt: depuisLe } } : {})
    }

    const clients = await prisma.user.findMany({
      where,
      select: { pseudo: true, nom: true, prenom: true, telephone: true },
      orderBy: { createdAt: 'asc' }
    })

    if (clients.length === 0) {
      return res.status(404).json({
        message: depuisLe
          ? `Aucun nouveau client depuis le ${depuisLe.toLocaleDateString('fr-FR')}`
          : 'Aucun client enregistré'
      })
    }

    // Mettre à jour la date du dernier export
    await prisma.salle.update({
      where: { id: req.user.salle_id },
      data: { dernierExportContacts: new Date() }
    })

    const vcf = buildVcf(clients)

    res.setHeader('Content-Type', 'text/vcard; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="nouveaux_clients_switch_sab.vcf"')
    return res.send(vcf)
  } catch (err) {
    console.error('[admin/contacts/export/nouveaux]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}

// ─── GET /admin/contacts/statut → Infos sur les contacts exportables ─────────

export const statutContacts = async (req, res) => {
  try {
    const salle = await prisma.salle.findUnique({
      where: { id: req.user.salle_id },
      select: { dernierExportContacts: true }
    })

    const depuisLe = salle?.dernierExportContacts ?? null

    const [totalClients, nouveauxClients] = await Promise.all([
      prisma.user.count({
        where: { salleId: req.user.salle_id, role: 'CLIENT', active: true }
      }),
      depuisLe
        ? prisma.user.count({
            where: { salleId: req.user.salle_id, role: 'CLIENT', active: true, createdAt: { gt: depuisLe } }
          })
        : prisma.user.count({
            where: { salleId: req.user.salle_id, role: 'CLIENT', active: true }
          })
    ])

    return res.json({
      totalClients,
      nouveauxClients,
      dernierExport: depuisLe
    })
  } catch (err) {
    console.error('[admin/contacts/statut]', err)
    return res.status(500).json({ message: 'Erreur serveur' })
  }
}
