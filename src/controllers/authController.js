// Controlador de autenticacion
const userService = require('../services/userService')
const { validateRegistration, validateLogin, sanitizeString } = require('../utils/validators')
const { ValidationError } = require('../middlewares/errorHandler')

const authController = {
  // Mostrar pagina de login
  showLogin(req, res) {
    res.render('pages/auth/login', {
      title: 'Iniciar Sesion - Shelfie',
      layout: 'main'
    })
  },

  // Mostrar pagina de registro
  showRegister(req, res) {
    res.render('pages/auth/register', {
      title: 'Crear Cuenta - Shelfie',
      layout: 'main'
    })
  },

  // Procesar registro de usuario
  async register(req, res) {
    try {
      // Sanitizar datos de entrada
      const username = sanitizeString(req.body.username)
      const email = sanitizeString(req.body.email)
      const { password, confirmPassword } = req.body

      // Validar datos con el validador centralizado
      const validation = validateRegistration({ username, email, password, confirmPassword })

      if (!validation.valid) {
        return res.render('pages/auth/register', {
          title: 'Crear Cuenta - Shelfie',
          errors: validation.errors,
          formData: { username, email }
        })
      }

      // Intentar crear el usuario
      const result = await userService.create({ username, email, password })

      if (!result.success) {
        return res.render('pages/auth/register', {
          title: 'Crear Cuenta - Shelfie',
          errors: result.errors,
          formData: { username, email }
        })
      }

      // Regenerar sesion para prevenir session fixation
      req.session.regenerate((err) => {
        if (err) {
          console.error('Error al regenerar sesión:', err)
          return res.render('pages/auth/register', {
            title: 'Crear Cuenta - Shelfie',
            errors: ['Error al crear la sesión. Intenta iniciar sesión.'],
            formData: { username, email }
          })
        }

        // Iniciar sesion automaticamente despues del registro
        req.session.userId = result.user.id
        req.flash('success', 'Cuenta creada exitosamente. Bienvenido a Shelfie!')

        // Redirigir al dashboard o a la URL guardada
        const returnTo = req.session.returnTo || '/dashboard'
        delete req.session.returnTo
        res.redirect(returnTo)
      })
    } catch (error) {
      console.error('Error en registro:', error)
      res.render('pages/auth/register', {
        title: 'Crear Cuenta - Shelfie',
        errors: ['Error interno del servidor. Intenta de nuevo.'],
        formData: req.body
      })
    }
  },

  // Procesar inicio de sesion
  async login(req, res) {
    try {
      // Sanitizar datos de entrada
      const identifier = sanitizeString(req.body.identifier)
      const { password } = req.body

      // Validar datos con el validador centralizado
      const validation = validateLogin({ identifier, password })

      if (!validation.valid) {
        return res.render('pages/auth/login', {
          title: 'Iniciar Sesion - Shelfie',
          errors: validation.errors,
          formData: { identifier }
        })
      }

      // Buscar usuario
      const user = await userService.findByCredentials(identifier)

      if (!user) {
        return res.render('pages/auth/login', {
          title: 'Iniciar Sesion - Shelfie',
          errors: ['Usuario o contrasena incorrectos'],
          formData: { identifier }
        })
      }

      // Verificar contrasena
      const isValidPassword = await user.validatePassword(password)

      if (!isValidPassword) {
        return res.render('pages/auth/login', {
          title: 'Iniciar Sesion - Shelfie',
          errors: ['Usuario o contraseña incorrectos'],
          formData: { identifier }
        })
      }

      // Regenerar sesion para prevenir session fixation
      req.session.regenerate((err) => {
        if (err) {
          console.error('Error al regenerar sesión:', err)
          return res.render('pages/auth/login', {
            title: 'Iniciar Sesion - Shelfie',
            errors: ['Error al crear la sesión. Intenta de nuevo.'],
            formData: { identifier }
          })
        }

        // Crear sesion
        req.session.userId = user.id
        req.flash('success', `Bienvenido de nuevo, ${user.username}!`)

        // Redirigir al dashboard o a la URL guardada
        const returnTo = req.session.returnTo || '/dashboard'
        delete req.session.returnTo
        res.redirect(returnTo)
      })
    } catch (error) {
      console.error('Error en login:', error)
      res.render('pages/auth/login', {
        title: 'Iniciar Sesion - Shelfie',
        errors: ['Error interno del servidor. Intenta de nuevo.'],
        formData: req.body
      })
    }
  },

  // Cerrar sesion
  logout(req, res) {
    req.session.destroy((err) => {
      if (err) {
        console.error('Error al cerrar sesion:', err)
      }
      res.redirect('/')
    })
  }
}

module.exports = authController
