// ========================================
// Controlador: Chat
// Gestiona la interfaz del chat en tiempo real
// ========================================

const { CHANNEL_INFO } = require('../config/socket')
const { ChatMessage, User } = require('../models')
const { Op } = require('sequelize')

// Renderizar página principal del chat
exports.showChat = async (req, res) => {
  try {
    const channel = req.query.channel || 'general'

    // El usuario ya está en res.locals.currentUser gracias al middleware loadCurrentUser
    res.render('pages/chat/index', {
      title: 'Chat - Shelfie',
      currentChannel: channel,
      channels: CHANNEL_INFO
    })
  } catch (error) {
    console.error('Error al mostrar chat:', error)
    req.session.flash = {
      type: 'error',
      message: 'Error al cargar el chat'
    }
    res.redirect('/')
  }
}

// API: Obtener historial de mensajes de un canal
exports.getMessages = async (req, res) => {
  try {
    const { channel } = req.params
    const { limit = 50, before } = req.query

    const whereClause = { channel }

    // Si se especifica un timestamp, obtener mensajes anteriores
    if (before) {
      whereClause.createdAt = {
        [Op.lt]: new Date(parseInt(before))
      }
    }

    const messages = await ChatMessage.findAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'avatar']
      }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit)
    })

    res.json({
      success: true,
      messages: messages.reverse(),
      hasMore: messages.length === parseInt(limit)
    })
  } catch (error) {
    console.error('Error al obtener mensajes:', error)
    res.status(500).json({
      success: false,
      message: 'Error al obtener mensajes'
    })
  }
}

// API: Buscar mensajes en un canal
exports.searchMessages = async (req, res) => {
  try {
    const { channel } = req.params
    const { query, limit = 20 } = req.query

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'La búsqueda debe tener al menos 2 caracteres'
      })
    }

    const messages = await ChatMessage.findAll({
      where: {
        channel,
        content: {
          [Op.iLike]: `%${query}%`
        }
      },
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'avatar']
      }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit)
    })

    res.json({
      success: true,
      messages: messages.reverse(),
      count: messages.length
    })
  } catch (error) {
    console.error('Error al buscar mensajes:', error)
    res.status(500).json({
      success: false,
      message: 'Error al buscar mensajes'
    })
  }
}

// API: Obtener estadísticas del chat
exports.getChatStats = async (req, res) => {
  try {
    const { channel } = req.params

    // Contar mensajes totales
    const totalMessages = await ChatMessage.count({
      where: { channel }
    })

    // Contar usuarios únicos que han participado
    const uniqueUsers = await ChatMessage.findAll({
      where: { channel },
      attributes: ['userId'],
      group: ['userId']
    })

    // Obtener mensaje más reciente
    const lastMessage = await ChatMessage.findOne({
      where: { channel },
      order: [['createdAt', 'DESC']],
      include: [{
        model: User,
        as: 'author',
        attributes: ['username']
      }]
    })

    res.json({
      success: true,
      stats: {
        totalMessages,
        uniqueUsers: uniqueUsers.length,
        lastMessage: lastMessage ? {
          content: lastMessage.content,
          author: lastMessage.author.username,
          createdAt: lastMessage.createdAt
        } : null
      }
    })
  } catch (error) {
    console.error('Error al obtener estadísticas:', error)
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas'
    })
  }
}
