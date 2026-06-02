import { Server } from 'socket.io'
import logger from './config/logger.js'

let io

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST']
    }
  })

  io.on('connection', (socket) => {
    logger.info(`Client connecté : ${socket.id}`)

    // ─── Events de session en temps réel ───────────────────────────

    /**
     * session:start — Une nouvelle session a démarré
     * Données: { sessionId, posteId, clientId, tempsRestant, estBonus }
     */
    socket.on('session:subscribe', (data) => {
      const { sessionId } = data
      socket.join(`session-${sessionId}`)
      logger.info(`Client ${socket.id} abonné à session ${sessionId}`)
    })

    /**
     * session:unsubscribe — Se désabonner d'une session
     */
    socket.on('session:unsubscribe', (data) => {
      const { sessionId } = data
      socket.leave(`session-${sessionId}`)
      logger.info(`Client ${socket.id} désabonné de session ${sessionId}`)
    })

    /**
     * Gestion déconnexion
     */
    socket.on('disconnect', () => {
      logger.info(`Client déconnecté : ${socket.id}`)
    })
  })

  return io
}

/**
 * Exporter getIO pour utilisation dans les controllers
 */
export const getIO = () => {
  if (!io) throw new Error('Socket.io non initialisé')
  return io
}

/**
 * Helpers pour émettre les événements de session
 */

export const emitSessionStart = (sessionId, data) => {
  io.emit('session:start', { sessionId, ...data })
}

export const emitSessionTick = (sessionId, posteId, tempsRestant) => {
  io.emit('session:tick', { sessionId, posteId, tempsRestant })
}

export const emitSessionEnd = (sessionId, posteId) => {
  io.emit('session:end', { sessionId, posteId })
}

export const emitSessionStop = (sessionId, posteId, tempsRestantConserve) => {
  io.emit('session:stop', { sessionId, posteId, tempsRestantConserve })
}
