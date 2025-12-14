// ========================================
// Rutas: Chat
// Endpoints para el sistema de chat en tiempo real
// ========================================

const express = require('express')
const router = express.Router()
const chatController = require('../controllers/chatController')
const { requireAuth } = require('../middlewares/authMiddleware')

// Todas las rutas de chat requieren autenticación
router.use(requireAuth)

// Página principal del chat
router.get('/', chatController.showChat)

// API: Obtener historial de mensajes de un canal
router.get('/api/:channel/messages', chatController.getMessages)

// API: Buscar mensajes en un canal
router.get('/api/:channel/search', chatController.searchMessages)

// API: Obtener estadísticas de un canal
router.get('/api/:channel/stats', chatController.getChatStats)

module.exports = router
