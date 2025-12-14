// Middlewares de autenticacion y autorizacion

// Verificar si el usuario esta autenticado
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next()
  }

  // Guardar la URL a la que intentaba acceder para redirigir despues del login
  req.session.returnTo = req.originalUrl

  // Si es una peticion AJAX, devolver error JSON
  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return res.status(401).json({
      success: false,
      message: 'Debes iniciar sesion para acceder a este recurso'
    })
  }

  // Redirigir al login con mensaje
  req.session.flash = {
    type: 'warning',
    message: 'Debes iniciar sesion para acceder a esta pagina'
  }
  return res.redirect('/auth/login')
}

// Verificar si el usuario NO esta autenticado (para paginas de login/registro)
const isGuest = (req, res, next) => {
  if (req.session && req.session.userId) {
    return res.redirect('/dashboard')
  }
  return next()
}

// Middleware para cargar el usuario actual en todas las vistas
const loadCurrentUser = async (req, res, next) => {
  res.locals.currentUser = null
  res.locals.isAuthenticated = false
  res.locals.pendingFriendRequests = 0

  if (req.session && req.session.userId) {
    try {
      const { User, Friendship } = require('../models')
      const user = await User.findByPk(req.session.userId)

      if (user) {
        // Cargar datos del usuario y contador de solicitudes en paralelo
        const pendingCount = await Friendship.countPendingRequests(user.id)

        res.locals.currentUser = {
          id: user.id,
          username: user.username,
          email: user.email,
          bio: user.bio,
          avatar: user.getAvatarUrl(),
          coverImage: user.getCoverUrl()
        }
        res.locals.isAuthenticated = true
        res.locals.pendingFriendRequests = pendingCount
        // Tambien disponible en req para los controladores
        req.currentUser = user
      } else {
        // Usuario no encontrado, limpiar sesion
        delete req.session.userId
      }
    } catch (error) {
      console.error('Error al cargar usuario actual:', error.message)
    }
  }

  next()
}

// Middleware para manejar mensajes flash
const handleFlashMessages = (req, res, next) => {
  // Pasar mensajes flash a las vistas y limpiarlos
  res.locals.flash = req.session.flash || null
  delete req.session.flash

  // Helper para establecer mensajes flash desde controladores
  req.flash = (type, message) => {
    req.session.flash = { type, message }
  }

  next()
}

module.exports = {
  isAuthenticated,
  requireAuth: isAuthenticated, // Alias para claridad semantica
  isGuest,
  loadCurrentUser,
  handleFlashMessages
}
