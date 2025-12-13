// Rutas de usuario
const express = require('express')
const router = express.Router()
const userController = require('../controllers/userController')
const { isAuthenticated } = require('../middlewares/authMiddleware')
const {
  uploadAvatar,
  uploadCover,
  processAvatar,
  processCover,
  handleUploadError
} = require('../middlewares/uploadMiddleware')

// GET /user/edit - Mostrar formulario de edicion de perfil
router.get('/edit', isAuthenticated, userController.showEditProfile)

// POST /user/edit - Actualizar perfil
router.post('/edit', isAuthenticated, userController.updateProfile)

// POST /user/avatar - Actualizar avatar
router.post(
  '/avatar',
  isAuthenticated,
  uploadAvatar,
  handleUploadError,
  processAvatar,
  userController.updateAvatar
)

// POST /user/cover - Actualizar portada
router.post(
  '/cover',
  isAuthenticated,
  uploadCover,
  handleUploadError,
  processCover,
  userController.updateCover
)

// POST /user/password - Cambiar contrasena
router.post('/password', isAuthenticated, userController.changePassword)

// GET /user/search - API de busqueda de usuarios
router.get('/search', isAuthenticated, userController.searchUsers)

// GET /user/:username - Ver perfil de usuario (debe ir al final)
router.get('/:username', userController.showProfile)

module.exports = router
