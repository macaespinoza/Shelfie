// Rutas de autenticacion
const express = require('express')
const router = express.Router()
const authController = require('../controllers/authController')
const { isGuest, isAuthenticated } = require('../middlewares/authMiddleware')

// GET /auth/login - Mostrar formulario de login
router.get('/login', isGuest, authController.showLogin)

// POST /auth/login - Procesar login
router.post('/login', isGuest, authController.login)

// GET /auth/register - Mostrar formulario de registro
router.get('/register', isGuest, authController.showRegister)

// POST /auth/register - Procesar registro
router.post('/register', isGuest, authController.register)

// POST /auth/logout - Cerrar sesion
router.post('/logout', isAuthenticated, authController.logout)

// GET /auth/logout - Cerrar sesion (alternativa por GET)
router.get('/logout', isAuthenticated, authController.logout)

module.exports = router
