// ========================================
// MIDDLEWARE DE MANEJO DE ERRORES
// ========================================

/**
 * Clase de error personalizado para errores de validación
 */
class ValidationError extends Error {
  constructor(errors) {
    super('Error de validación')
    this.name = 'ValidationError'
    this.errors = Array.isArray(errors) ? errors : [errors]
    this.statusCode = 400
  }
}

/**
 * Clase de error personalizado para errores de autenticación
 */
class AuthenticationError extends Error {
  constructor(message = 'No autorizado') {
    super(message)
    this.name = 'AuthenticationError'
    this.statusCode = 401
  }
}

/**
 * Clase de error personalizado para errores de permisos
 */
class ForbiddenError extends Error {
  constructor(message = 'Acceso denegado') {
    super(message)
    this.name = 'ForbiddenError'
    this.statusCode = 403
  }
}

/**
 * Clase de error personalizado para recursos no encontrados
 */
class NotFoundError extends Error {
  constructor(message = 'Recurso no encontrado') {
    super(message)
    this.name = 'NotFoundError'
    this.statusCode = 404
  }
}

/**
 * Middleware para manejo de errores asíncronos
 * Envuelve funciones async para capturar errores automáticamente
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

/**
 * Middleware principal de manejo de errores
 */
function errorHandler(err, req, res, next) {
  // Log del error completo en desarrollo
  if (process.env.NODE_ENV === 'development') {
    console.error('========== ERROR ==========')
    console.error('Nombre:', err.name)
    console.error('Mensaje:', err.message)
    console.error('Stack:', err.stack)
    console.error('===========================')
  } else {
    // En producción, solo log del mensaje
    console.error(`Error: ${err.name} - ${err.message}`)
  }

  // Determinar código de estado
  const statusCode = err.statusCode || 500

  // Si es una petición AJAX o API, devolver JSON
  if (req.xhr || req.headers.accept?.includes('application/json')) {
    const response = {
      success: false,
      error: {
        message: err.message || 'Error interno del servidor',
        type: err.name
      }
    }

    // Incluir errores de validación
    if (err.errors) {
      response.error.errors = err.errors
    }

    // En desarrollo, incluir stack trace
    if (process.env.NODE_ENV === 'development') {
      response.error.stack = err.stack
    }

    return res.status(statusCode).json(response)
  }

  // Para peticiones normales, renderizar página de error
  let errorView = 'pages/error'
  let errorData = {
    title: 'Error - Shelfie',
    error: {
      statusCode,
      message: err.message || 'Ha ocurrido un error',
      type: err.name
    }
  }

  // Errores específicos
  if (err instanceof ValidationError) {
    errorData.error.message = 'Error de validación'
    errorData.error.errors = err.errors
  } else if (err instanceof AuthenticationError) {
    errorData.error.message = 'Debes iniciar sesión para acceder a esta página'
  } else if (err instanceof ForbiddenError) {
    errorData.error.message = 'No tienes permiso para acceder a este recurso'
  } else if (err instanceof NotFoundError) {
    errorData.error.message = err.message
  } else if (statusCode === 500) {
    errorData.error.message = 'Error interno del servidor'
  }

  // En producción, no exponer detalles internos
  if (process.env.NODE_ENV !== 'development' && statusCode === 500) {
    errorData.error.message = 'Ha ocurrido un error. Por favor intenta de nuevo.'
  }

  res.status(statusCode).render(errorView, errorData)
}

/**
 * Middleware para rutas no encontradas (404)
 */
function notFoundHandler(req, res, next) {
  const err = new NotFoundError(`Página no encontrada: ${req.originalUrl}`)
  next(err)
}

/**
 * Validar datos con un validador específico
 * Lanza ValidationError si la validación falla
 */
function validate(validator) {
  return (req, res, next) => {
    const result = validator(req.body)

    if (!result.valid) {
      throw new ValidationError(result.errors)
    }

    next()
  }
}

module.exports = {
  ValidationError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  asyncHandler,
  errorHandler,
  notFoundHandler,
  validate
}
