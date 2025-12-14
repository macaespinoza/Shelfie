// ========================================
// LOGGER - Sistema de logging estructurado
// ========================================

const fs = require('fs')
const path = require('path')

// Asegurar que el directorio de logs existe
const logsDir = path.join(__dirname, '../../logs')
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true })
}

// Niveles de log
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
}

// Nivel mínimo de log según el entorno
const MIN_LOG_LEVEL = process.env.LOG_LEVEL 
  ? LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()] 
  : (process.env.NODE_ENV === 'production' ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG)

/**
 * Formatear fecha en formato ISO
 */
const formatDate = () => {
  return new Date().toISOString()
}

/**
 * Sanitizar datos sensibles antes de logear
 */
const sanitizeData = (data) => {
  if (!data || typeof data !== 'object') return data

  const sensitiveKeys = ['password', 'token', 'secret', 'authorization', 'cookie']
  const sanitized = { ...data }

  Object.keys(sanitized).forEach(key => {
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeData(sanitized[key])
    }
  })

  return sanitized
}

/**
 * Crear mensaje de log estructurado
 */
const createLogMessage = (level, message, context = {}) => {
  const logEntry = {
    timestamp: formatDate(),
    level,
    message,
    ...sanitizeData(context)
  }

  return JSON.stringify(logEntry)
}

/**
 * Escribir log a archivo
 */
const writeToFile = (level, message) => {
  // Solo escribir a archivo en producción
  if (process.env.NODE_ENV !== 'production') return

  const filename = path.join(logsDir, `${level.toLowerCase()}-${new Date().toISOString().split('T')[0]}.log`)
  
  fs.appendFile(filename, message + '\n', (err) => {
    if (err) {
      console.error('Error al escribir log:', err)
    }
  })
}

/**
 * Logger principal
 */
const logger = {
  /**
   * Log de debug - solo en desarrollo
   */
  debug: (message, context = {}) => {
    if (LOG_LEVELS.DEBUG < MIN_LOG_LEVEL) return

    const logMessage = createLogMessage('DEBUG', message, context)
    console.log(`🔍 ${logMessage}`)
  },

  /**
   * Log de información general
   */
  info: (message, context = {}) => {
    if (LOG_LEVELS.INFO < MIN_LOG_LEVEL) return

    const logMessage = createLogMessage('INFO', message, context)
    console.log(`ℹ️  ${logMessage}`)
    writeToFile('INFO', logMessage)
  },

  /**
   * Log de advertencias
   */
  warn: (message, context = {}) => {
    if (LOG_LEVELS.WARN < MIN_LOG_LEVEL) return

    const logMessage = createLogMessage('WARN', message, context)
    console.warn(`⚠️  ${logMessage}`)
    writeToFile('WARN', logMessage)
  },

  /**
   * Log de errores
   */
  error: (message, error = null, context = {}) => {
    if (LOG_LEVELS.ERROR < MIN_LOG_LEVEL) return

    const errorContext = {
      ...context,
      error: error ? {
        message: error.message,
        stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
        name: error.name
      } : undefined
    }

    const logMessage = createLogMessage('ERROR', message, errorContext)
    console.error(`❌ ${logMessage}`)
    writeToFile('ERROR', logMessage)
  },

  /**
   * Log de request HTTP
   */
  request: (req, res, duration) => {
    const message = `${req.method} ${req.originalUrl}`
    const context = {
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('user-agent'),
      ip: req.ip || req.connection.remoteAddress,
      userId: req.session?.userId
    }

    // Log de error si status >= 400
    if (res.statusCode >= 400) {
      logger.warn(message, context)
    } else {
      logger.info(message, context)
    }
  }
}

/**
 * Middleware Express para logging de requests
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now()

  // Capturar cuando la respuesta termina
  res.on('finish', () => {
    const duration = Date.now() - startTime
    logger.request(req, res, duration)
  })

  next()
}

module.exports = logger
module.exports.requestLogger = requestLogger
