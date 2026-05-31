import { Server } from 'socket.io'

let io

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST']
    }
  })

  io.on('connection', (socket) => {
    console.log(`Client connecté : ${socket.id}`)
    socket.on('disconnect', () => {
      console.log(`Client déconnecté : ${socket.id}`)
    })
  })

  return io
}

export const getIO = () => {
  if (!io) throw new Error('Socket.io non initialisé')
  return io
}
