import { createServer } from 'http'
import app from './src/index.js'
import { initSocket } from './src/socket.js'

const httpServer = createServer(app)
initSocket(httpServer)

const PORT = process.env.PORT || 3000
httpServer.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`)
})
