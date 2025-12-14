// Rutas de Repisas
const express = require('express')
const router = express.Router()
const shelfController = require('../controllers/shelfController')
const { isAuthenticated } = require('../middlewares/authMiddleware')
const { createContentLimiter } = require('../middlewares/securityMiddleware')

// ========================================
// RUTAS DE VISTAS (requieren autenticacion)
// ========================================

// GET /shelf/create - Mostrar formulario de crear repisa
router.get('/create', isAuthenticated, shelfController.showCreateShelf)

// POST /shelf/create - Crear nueva repisa
router.post('/create', isAuthenticated, shelfController.createShelf)

// GET /shelf/:id - Ver detalle de repisa
router.get('/:id', shelfController.showShelf)

// GET /shelf/:id/edit - Mostrar formulario de editar repisa
router.get('/:id/edit', isAuthenticated, shelfController.showEditShelf)

// POST /shelf/:id/edit - Actualizar repisa
router.post('/:id/edit', isAuthenticated, shelfController.updateShelf)

// POST /shelf/:id/delete - Eliminar repisa
router.post('/:id/delete', isAuthenticated, shelfController.deleteShelf)

// GET /shelf/:shelfId/search - Buscar contenido para agregar
router.get('/:shelfId/search', isAuthenticated, shelfController.showSearch)

// ========================================
// RUTAS DE ITEMS
// ========================================

// POST /shelf/:shelfId/item - Agregar item a repisa
router.post('/:shelfId/item', isAuthenticated, shelfController.addItem)

// POST /shelf/item/:itemId/update - Actualizar item (rating/review)
router.post('/item/:itemId/update', isAuthenticated, shelfController.updateItem)

// POST /shelf/item/:itemId/delete - Eliminar item de repisa
router.post('/item/:itemId/delete', isAuthenticated, shelfController.removeItem)

// ========================================
// RUTAS DE API (JSON responses)
// ========================================

// GET /shelf/api/search - Buscar contenido en APIs externas
router.get('/api/search', isAuthenticated, shelfController.apiSearchContent)

// GET /shelf/api/content/:category/:externalId - Obtener detalles de contenido
router.get('/api/content/:category/:externalId', isAuthenticated, shelfController.apiGetContentDetails)

// GET /shelf/api/:shelfId/items - Obtener items de una repisa
router.get('/api/:shelfId/items', shelfController.apiGetShelfItems)

module.exports = router
