// Rutas de Posts
const express = require('express')
const router = express.Router()
const postController = require('../controllers/postController')
const { isAuthenticated } = require('../middlewares/authMiddleware')

// ========================================
// RUTAS DE VISTAS
// ========================================

// GET /post/:id - Ver post individual
router.get('/:id', postController.showPost)

// ========================================
// RUTAS DE ACCIONES
// ========================================

// POST /post/create - Crear nuevo post
router.post('/create', isAuthenticated, postController.createPost)

// POST /post/:id/delete - Eliminar post
router.post('/:id/delete', isAuthenticated, postController.deletePost)

// ========================================
// RUTAS DE COMENTARIOS
// ========================================

// POST /post/:postId/comment - Agregar comentario
router.post('/:postId/comment', isAuthenticated, postController.addComment)

// POST /post/comment/:commentId/delete - Eliminar comentario
router.post('/comment/:commentId/delete', isAuthenticated, postController.deleteComment)

// ========================================
// RUTAS DE LIKES
// ========================================

// POST /post/:postId/like - Toggle like
router.post('/:postId/like', isAuthenticated, postController.toggleLike)

// ========================================
// RUTAS DE API
// ========================================

// GET /post/api/feed - Obtener feed publico
router.get('/api/feed', postController.apiFeed)

// GET /post/api/user/:userId/feed - Obtener feed de usuario
router.get('/api/user/:userId/feed', postController.apiUserFeed)

// GET /post/api/:postId/comments - Obtener comentarios de un post
router.get('/api/:postId/comments', postController.apiComments)

// GET /post/api/my-shelves - Obtener repisas del usuario para compartir
router.get('/api/my-shelves', isAuthenticated, postController.apiUserShelves)

module.exports = router
