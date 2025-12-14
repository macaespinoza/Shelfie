// ========================================
// Configuracion de Socket.io
// Sistema de chat en tiempo real
// ========================================

const { Server } = require('socket.io')
const { ChatMessage, User } = require('../models')

// Canales disponibles en el chat
const CHAT_CHANNELS = {
  GENERAL: 'general',
  MUSIC: 'music',
  MOVIES: 'movies',
  BOOKS: 'books',
  GAMES: 'games',
  SERIES: 'series',
  PODCASTS: 'podcasts'
}

// Informacion de cada canal
const CHANNEL_INFO = {
  general: {
    name: 'General',
    icon: 'bi-chat-dots',
    description: 'Conversaciones generales'
  },
  music: {
    name: 'Música',
    icon: 'bi-music-note-beamed',
    description: 'Habla sobre tus canciones favoritas'
  },
  movies: {
    name: 'Películas',
    icon: 'bi-film',
    description: 'Discute sobre películas'
  },
  books: {
    name: 'Libros',
    icon: 'bi-book',
    description: 'Comparte tus lecturas'
  },
  games: {
    name: 'Videojuegos',
    icon: 'bi-controller',
    description: 'Gaming y más'
  },
  series: {
    name: 'Series',
    icon: 'bi-tv',
    description: 'Series de TV'
  },
  podcasts: {
    name: 'Podcasts',
    icon: 'bi-broadcast',
    description: 'Podcasts y audio'
  }
}

// Configurar Socket.io
function initializeSocket(httpServer, sessionMiddleware) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true
    }
  })

  // Compartir sesion de Express con Socket.io
  io.use((socket, next) => {
    sessionMiddleware(socket.request, socket.request.res || {}, next)
  })

  // Middleware de autenticacion para Socket.io
  io.use(async (socket, next) => {
    const session = socket.request.session

    if (session && session.userId) {
      // Cargar datos del usuario desde la base de datos
      try {
        const user = await User.findByPk(session.userId)

        if (user) {
          socket.userId = user.id
          socket.username = user.username
          socket.userAvatar = user.getAvatarUrl() // Usar método que incluye la ruta correcta
          next()
        } else {
          next(new Error('Usuario no encontrado'))
        }
      } catch (error) {
        console.error('Error al autenticar socket:', error)
        next(new Error('Error de autenticación'))
      }
    } else {
      // Usuario no autenticado
      next(new Error('No autenticado'))
    }
  })

  // Almacenar usuarios conectados por canal
  const usersInChannels = {}
  Object.values(CHAT_CHANNELS).forEach(channel => {
    usersInChannels[channel] = new Set()
  })

  // Manejar conexiones
  io.on('connection', async (socket) => {
    console.log(`Usuario conectado: ${socket.username} (ID: ${socket.userId})`)

    // Unirse a un canal
    socket.on('join_channel', async (channel) => {
      // Validar que el canal existe
      if (!Object.values(CHAT_CHANNELS).includes(channel)) {
        socket.emit('error', { message: 'Canal inválido' })
        return
      }

      // Salir de todos los canales anteriores
      Object.values(CHAT_CHANNELS).forEach(ch => {
        socket.leave(ch)
        usersInChannels[ch].delete(socket.userId)
      })

      // Unirse al nuevo canal
      socket.join(channel)
      usersInChannels[channel].add(socket.userId)
      socket.currentChannel = channel

      console.log(`${socket.username} se unió al canal: ${channel}`)

      // Cargar historial de mensajes del canal (últimos 50)
      try {
        const messages = await ChatMessage.findAll({
          where: { channel },
          include: [{
            model: User,
            as: 'author',
            attributes: ['id', 'username', 'avatar']
          }],
          order: [['createdAt', 'DESC']],
          limit: 50
        })

        // Transformar mensajes para incluir URL correcta del avatar
        const messagesWithAvatars = messages.map(msg => {
          const msgData = msg.toJSON()
          if (msgData.author && msgData.author.avatar) {
            msgData.author.avatar = `/uploads/avatars/${msgData.author.avatar}`
          } else if (msgData.author) {
            msgData.author.avatar = null
          }
          return msgData
        })

        // Enviar mensajes en orden cronológico
        socket.emit('message_history', messagesWithAvatars.reverse())

        // Notificar a otros usuarios del canal
        socket.to(channel).emit('user_joined', {
          username: socket.username,
          userId: socket.userId,
          timestamp: new Date()
        })

        // Enviar lista de usuarios activos en el canal
        const activeUsers = Array.from(usersInChannels[channel])
        io.to(channel).emit('active_users', {
          count: activeUsers.length,
          users: activeUsers
        })
      } catch (error) {
        console.error('Error al cargar historial:', error)
        socket.emit('error', { message: 'Error al cargar mensajes' })
      }
    })

    // Recibir mensaje de chat
    socket.on('send_message', async (data) => {
      const { content } = data
      const channel = socket.currentChannel || CHAT_CHANNELS.GENERAL

      // Validar contenido
      if (!content || content.trim().length === 0) {
        socket.emit('error', { message: 'El mensaje no puede estar vacío' })
        return
      }

      if (content.length > 500) {
        socket.emit('error', { message: 'El mensaje es demasiado largo (máx. 500 caracteres)' })
        return
      }

      try {
        // Guardar mensaje en la base de datos
        const message = await ChatMessage.create({
          channel,
          userId: socket.userId,
          content: content.trim()
        })

        // Cargar información del usuario
        const messageWithUser = await ChatMessage.findByPk(message.id, {
          include: [{
            model: User,
            as: 'author',
            attributes: ['id', 'username', 'avatar']
          }]
        })

        // Transformar el mensaje para incluir URL correcta del avatar
        const msgData = messageWithUser.toJSON()
        if (msgData.author && msgData.author.avatar) {
          msgData.author.avatar = `/uploads/avatars/${msgData.author.avatar}`
        } else if (msgData.author) {
          msgData.author.avatar = null
        }

        // Emitir mensaje a todos los usuarios del canal (incluido el emisor)
        io.to(channel).emit('new_message', msgData)

        console.log(`[${channel}] ${socket.username}: ${content}`)
      } catch (error) {
        console.error('Error al guardar mensaje:', error)
        socket.emit('error', { message: 'Error al enviar el mensaje' })
      }
    })

    // Usuario está escribiendo
    socket.on('typing', (isTyping) => {
      const channel = socket.currentChannel
      if (channel) {
        socket.to(channel).emit('user_typing', {
          username: socket.username,
          userId: socket.userId,
          isTyping
        })
      }
    })

    // Desconexión
    socket.on('disconnect', () => {
      console.log(`Usuario desconectado: ${socket.username}`)

      // Remover usuario de todos los canales
      Object.values(CHAT_CHANNELS).forEach(channel => {
        if (usersInChannels[channel].has(socket.userId)) {
          usersInChannels[channel].delete(socket.userId)

          // Notificar al canal
          io.to(channel).emit('user_left', {
            username: socket.username,
            userId: socket.userId,
            timestamp: new Date()
          })

          // Actualizar lista de usuarios activos
          const activeUsers = Array.from(usersInChannels[channel])
          io.to(channel).emit('active_users', {
            count: activeUsers.length,
            users: activeUsers
          })
        }
      })
    })
  })

  return io
}

module.exports = {
  initializeSocket,
  CHAT_CHANNELS,
  CHANNEL_INFO
}
