// Archivo central de rutas
const express = require('express')
const router = express.Router()
const authRoutes = require('./authRoutes')
const userRoutes = require('./userRoutes')
const shelfRoutes = require('./shelfRoutes')
const postRoutes = require('./postRoutes')
const friendshipRoutes = require('./friendshipRoutes')
const userController = require('../controllers/userController')
const { isAuthenticated } = require('../middlewares/authMiddleware')

// Pagina principal
router.get('/', (req, res) => {
  // Si el usuario esta autenticado, redirigir al dashboard
  if (res.locals.isAuthenticated) {
    return res.redirect('/dashboard')
  }

  res.render('pages/home', {
    title: 'Shelfie - Tu repisa digital',
    isLanding: true
  })
})

// Dashboard (requiere autenticacion)
router.get('/dashboard', isAuthenticated, userController.showDashboard)

// Rutas de autenticacion
router.use('/auth', authRoutes)

// Rutas de usuario
router.use('/user', userRoutes)

// Rutas de repisas
router.use('/shelf', shelfRoutes)

// Rutas de posts
router.use('/post', postRoutes)

// Rutas de amistades
router.use('/friends', friendshipRoutes)

// Manejo de errores 404
router.use((req, res) => {
  res.status(404).render('pages/home', {
    title: '404 - Pagina no encontrada',
    error404: true
  })
})

module.exports = router
