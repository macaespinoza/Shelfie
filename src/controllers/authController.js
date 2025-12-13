// Controlador de autenticacion
const userService = require('../services/userService')

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
      const { username, email, password, confirmPassword } = req.body

      // Validaciones basicas
      const errors = []

      if (!username || !email || !password || !confirmPassword) {
        errors.push('Todos los campos son requeridos')
      }

      if (password !== confirmPassword) {
        errors.push('Las contrasenas no coinciden')
      }

      if (password && password.length < 6) {
        errors.push('La contrasena debe tener al menos 6 caracteres')
      }

      if (errors.length > 0) {
        return res.render('pages/auth/register', {
          title: 'Crear Cuenta - Shelfie',
          errors,
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

      // Iniciar sesion automaticamente despues del registro
      req.session.userId = result.user.id
      req.flash('success', 'Cuenta creada exitosamente. Bienvenido a Shelfie!')

      // Redirigir al dashboard o a la URL guardada
      const returnTo = req.session.returnTo || '/dashboard'
      delete req.session.returnTo
      res.redirect(returnTo)
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
      const { identifier, password } = req.body

      // Validaciones basicas
      if (!identifier || !password) {
        return res.render('pages/auth/login', {
          title: 'Iniciar Sesion - Shelfie',
          errors: ['Por favor ingresa tu usuario/email y contrasena'],
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
          errors: ['Usuario o contrasena incorrectos'],
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
