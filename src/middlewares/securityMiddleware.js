// ========================================
// MIDDLEWARE DE SEGURIDAD
// ========================================

const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const cors = require('cors')

/**
 * Configurar headers de seguridad con Helmet
 * Protege contra vulnerabilidades comunes como XSS, clickjacking, etc.
 */
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdn.jsdelivr.net'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdn.jsdelivr.net'],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://cdn.socket.io'],
      imgSrc: ["'self'", 'data:', 'https:', 'http:'],
      connectSrc: ["'self'", 'wss:', 'ws:'],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000, // 1 año
    includeSubDomains: true,
    preload: true
  }
})

/**
 * Rate Limiter general para todas las rutas
 * Previene ataques de fuerza bruta y DoS
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.RATE_LIMIT_MAX || 100, // máximo de requests por ventana
  message: {
    success: false,
    message: 'Demasiadas solicitudes desde esta IP, por favor intenta de nuevo más tarde.'
  },
  standardHeaders: true, // Retornar info en headers `RateLimit-*`
  legacyHeaders: false, // Deshabilitar headers `X-RateLimit-*`
  skip: (req) => {
    // Deshabilitar en desarrollo si está configurado
    return process.env.NODE_ENV !== 'production' && process.env.RATE_LIMIT_ENABLED === 'false'
  }
})

/**
 * Rate Limiter estricto para rutas de autenticación
 * Previene ataques de fuerza bruta en login/registro
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 intentos de login por ventana
  message: {
    success: false,
    message: 'Demasiados intentos de inicio de sesión. Por favor intenta de nuevo en 15 minutos.'
  },
  skipSuccessfulRequests: true, // No contar requests exitosos
  skip: (req) => {
    return process.env.NODE_ENV !== 'production' && process.env.RATE_LIMIT_ENABLED === 'false'
  }
})

/**
 * Rate Limiter para creación de contenido
 * Previene spam de posts, shelves, etc.
 */
const createContentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 30, // máximo 30 creaciones por hora
  message: {
    success: false,
    message: 'Has alcanzado el límite de creación de contenido. Intenta de nuevo más tarde.'
  },
  skip: (req) => {
    return process.env.NODE_ENV !== 'production' && process.env.RATE_LIMIT_ENABLED === 'false'
  }
})

/**
 * Configuración de CORS
 * Controla qué dominios pueden acceder a la API
 * TEMPORAL: CORS deshabilitado completamente para desarrollo local
 */
const corsOptions = {
  origin: true, // PERMITIR TODOS LOS ORÍGENES (temporal para desarrollo)
  credentials: true, // Permitir cookies
  optionsSuccessStatus: 200
}

/**
 * Middleware para agregar Request ID único a cada petición
 * Útil para tracking y debugging
 */
const requestId = (req, res, next) => {
  req.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  res.setHeader('X-Request-Id', req.id)
  next()
}

/**
 * Middleware para validar variables de entorno críticas
 */
const validateEnvironment = () => {
  const requiredEnvVars = [
    'DATABASE_URL',
    'SESSION_SECRET'
  ]

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName])

  if (missingVars.length > 0 && process.env.NODE_ENV === 'production') {
    console.error('❌ ERROR: Variables de entorno faltantes:')
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`)
    })
    console.error('\nEl servidor no puede iniciar sin estas variables.')
    process.exit(1)
  }

  // Advertencias para variables opcionales pero recomendadas
  const recommendedVars = ['PORT', 'NODE_ENV', 'ALLOWED_ORIGINS']
  const missingRecommended = recommendedVars.filter(varName => !process.env[varName])
  
  if (missingRecommended.length > 0) {
    console.warn('⚠️  ADVERTENCIA: Variables de entorno recomendadas faltantes:')
    missingRecommended.forEach(varName => {
      console.warn(`   - ${varName}`)
    })
  }
}

/**
 * Middleware de seguridad adicional para headers personalizados
 */
const additionalSecurityHeaders = (req, res, next) => {
  // Prevenir MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff')
  
  // Deshabilitar caching de páginas sensibles
  if (req.path.startsWith('/auth') || req.path.startsWith('/dashboard')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')
  }
  
  next()
}

module.exports = {
  helmetConfig,
  generalLimiter,
  authLimiter,
  createContentLimiter,
  corsConfig: cors(corsOptions),
  requestId,
  validateEnvironment,
  additionalSecurityHeaders
}
