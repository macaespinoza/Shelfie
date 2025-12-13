// Rutas de gestion de amistades
const express = require('express')
const router = express.Router()
const friendshipController = require('../controllers/friendshipController')
const { isAuthenticated } = require('../middlewares/authMiddleware')

// Todas las rutas requieren autenticacion
router.use(isAuthenticated)

// ========================================
// Vistas
// ========================================

// Lista de amigos
router.get('/', friendshipController.showFriends)

// Solicitudes de amistad
router.get('/requests', friendshipController.showRequests)

// Usuarios bloqueados
router.get('/blocked', friendshipController.showBlocked)

// ========================================
// Acciones de amistad
// ========================================

// Enviar solicitud de amistad
router.post('/request/:userId', friendshipController.sendRequest)

// Aceptar solicitud
router.post('/accept/:friendshipId', friendshipController.acceptRequest)

// Rechazar solicitud
router.post('/reject/:friendshipId', friendshipController.rejectRequest)

// Cancelar solicitud enviada
router.post('/cancel/:friendshipId', friendshipController.cancelRequest)

// Eliminar amigo
router.post('/remove/:friendId', friendshipController.removeFriend)

// Bloquear usuario
router.post('/block/:targetId', friendshipController.blockUser)

// Desbloquear usuario
router.post('/unblock/:targetId', friendshipController.unblockUser)

// ========================================
// API endpoints
// ========================================

// Obtener estado de relacion con usuario
router.get('/api/status/:targetId', friendshipController.getRelationshipStatus)

// Buscar entre amigos
router.get('/api/search', friendshipController.searchFriends)

// Obtener amigos mutuos
router.get('/api/mutual/:targetId', friendshipController.getMutualFriends)

module.exports = router
