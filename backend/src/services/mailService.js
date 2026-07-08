import nodemailer from 'nodemailer'
import logger from '../config/logger.js'

/**
 * Crée un transporteur nodemailer à partir des variables d'environnement.
 * Supporte Gmail, SMTP générique, ou Mailtrap pour les tests.
 */
function createTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error('SMTP non configuré — renseignez SMTP_HOST, SMTP_USER, SMTP_PASS dans .env')
  }

  return nodemailer.createTransport({
    host:   SMTP_HOST,
    port:   Number(SMTP_PORT) || 587,
    secure: SMTP_SECURE === 'true', // true pour port 465, false pour 587
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  })
}

/**
 * Envoie un email.
 * @param {Object} options
 * @param {string}   options.to      - Destinataire
 * @param {string}   options.subject - Objet du mail
 * @param {string}   options.html    - Corps HTML
 * @param {string}   [options.text]  - Corps texte brut (fallback)
 */
export async function envoyerEmail({ to, subject, html, text }) {
  const transporter = createTransporter()
  const from = process.env.SMTP_FROM || process.env.SMTP_USER

  const info = await transporter.sendMail({ from, to, subject, html, text })
  logger.info(`[mail] Envoyé à ${to} — messageId: ${info.messageId}`)
  return info
}

/**
 * Vérifie la connexion SMTP.
 * Utile au démarrage pour détecter une mauvaise config.
 */
export async function verifierSMTP() {
  try {
    const transporter = createTransporter()
    await transporter.verify()
    logger.info('[mail] Connexion SMTP OK')
    return true
  } catch (err) {
    logger.warn(`[mail] Connexion SMTP échouée : ${err.message}`)
    return false
  }
}
