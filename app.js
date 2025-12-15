// ========================================
// SHELFIE - Archivo Principal
// Red social de repisas con colecciones
// ========================================

// Cargar variables de entorno
require('dotenv').config()

const express = require('express')
const path = require('path')
const { engine } = require('express-handlebars')
const compression = require('compression')
const morgan = require('morgan')

// Importar configuraciones
const { testConnection, syncDatabase, sequelize } = require('./src/config/database')
const { sessionMiddleware, initSessionStore } = require('./src/config/session')

// Importar middlewares de seguridad
const {
  helmetConfig,
  generalLimiter,
  corsConfig,
  requestId,
  validateEnvironment,
  additionalSecurityHeaders
} = require('./src/middlewares/securityMiddleware')

// Importar logger
const logger = require('./src/utils/logger')

// Importar middlewares
const { loadCurrentUser, handleFlashMessages } = require('./src/middlewares/authMiddleware')
const { errorHandler, notFoundHandler } = require('./src/middlewares/errorHandler')

// Importar rutas
const routes = require('./src/routes')
const healthCheckRoute = require('./src/routes/healthCheckRoute')

// Validar variables de entorno críticas
validateEnvironment()

// Crear aplicacion Express
const app = express()
const PORT = process.env.PORT || 3000

// Confiar en proxy (necesario para Railway y otros PaaS)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1)
}

// ========================================
// Configuracion de Handlebars
// ========================================
app.engine('hbs', engine({
  extname: '.hbs',
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'src/views/layouts'),
  partialsDir: path.join(__dirname, 'src/views/partials'),
  runtimeOptions: {
    allowProtoPropertiesByDefault: true,
    allowProtoMethodsByDefault: true,
  },
  // Helpers personalizados
  helpers: {
    // Comparar valores
    eq: (a, b) => a === b,
    neq: (a, b) => a !== b,
    gt: (a, b) => a > b,
    gte: (a, b) => a >= b,
    lt: (a, b) => a < b,
    lte: (a, b) => a <= b,
    // Operadores logicos
    and: (...args) => args.slice(0, -1).every(Boolean),
    or: (...args) => args.slice(0, -1).some(Boolean),
    not: (value) => !value,
    // Formatear fecha
    formatDate: (date) => {
      if (!date) return ''
      const d = new Date(date)
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
      return `${months[d.getMonth()]} ${d.getFullYear()}`
    },
    // Formatear fecha completa
    formatDateTime: (date) => {
      if (!date) return ''
      const d = new Date(date)
      return d.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    },
    // Obtener ano actual
    currentYear: () => new Date().getFullYear(),
    // Substring para iniciales
    substring: (str, start, end) => {
      if (!str) return ''
      return str.substring(start, end).toUpperCase()
    },
    // Truncar texto
    truncate: (str, length) => {
      if (!str) return ''
      if (str.length <= length) return str
      return str.substring(0, length) + '...'
    },
    // JSON stringify para pasar datos a JS
    json: (obj) => JSON.stringify(obj),
    // Pluralizar
    pluralize: (count, singular, plural) => {
      return count === 1 ? singular : plural
    },
    // Verificar si un array contiene un elemento
    includes: (array, value) => {
      if (!array) return false
      return array.includes(value)
    },
    // Sumar 1 a un numero (util para indices)
    addOne: (num) => num + 1,
    // Restar numeros
    subtract: (a, b) => a - b,
    // Helper para iterar N veces
    times: function(n, block) {
      let result = ''
      for (let i = 0; i < n; i++) {
        result += block.fn(this, { data: { index: i } })
      }
      return result
    }
  }
}))

app.set('view engine', 'hbs')
app.set('views', path.join(__dirname, 'src/views'))

// ========================================
// Middlewares
// ========================================

// Seguridad - aplicar PRIMERO
app.use(helmetConfig)
app.use(corsConfig)
app.use(requestId)
app.use(additionalSecurityHeaders)

// Compresión de respuestas
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false
    }
    return compression.filter(req, res)
  },
  threshold: 1024 // Solo comprimir respuestas > 1KB
}))

// Logging de requests (en producción usar formato combinado)
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'))
} else {
  app.use(morgan('dev'))
}

// Rate limiting general
app.use(generalLimiter)

// Parsear body de peticiones
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Archivos estaticos
app.use(express.static(path.join(__dirname, 'src/public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0, // Cache en producción
  etag: true
}))

// Sesiones
app.use(sessionMiddleware)

// Cargar usuario actual y mensajes flash
app.use(loadCurrentUser)
app.use(handleFlashMessages)

// Agregar variables globales a las vistas
app.use((req, res, next) => {
  res.locals.currentYear = new Date().getFullYear()
  next()
})

// ========================================
// Rutas
// ========================================

// Health check endpoint (sin rate limiting)
app.use('/', healthCheckRoute)

// Rutas principales
app.use('/', routes)

// ========================================
// Manejo de errores
// ========================================

// Capturar rutas no encontradas (404)
app.use(notFoundHandler)

// Manejador global de errores
app.use(errorHandler)

// ========================================
// Iniciar servidor
// ========================================
async function startServer() {
  try {
    // Probar conexion a base de datos
    await testConnection()

    // Inicializar tabla de sesiones
    await initSessionStore()

    // Sincronizar modelos (sin forzar en produccion)
    const force = process.env.NODE_ENV === 'development' && process.argv.includes('--force')
    await syncDatabase(force)

    // Crear servidor HTTP (necesario para Socket.io)
    const http = require('http')
    const httpServer = http.createServer(app)

    // Inicializar Socket.io
    const { initializeSocket } = require('./src/config/socket')
    initializeSocket(httpServer, sessionMiddleware)

    // Iniciar servidor HTTP
    const server = httpServer.listen(PORT, () => {
      console.log('========================================')
      console.log(`  SHELFIE - Servidor iniciado`)
      console.log(`  URL: http://localhost:${PORT}`)
      console.log(`  Entorno: ${process.env.NODE_ENV || 'development'}`)
      console.log(`  Socket.io: Activado`)
      console.log('========================================')
    })

    // Manejo de cierre graceful para liberar el puerto
    const gracefulShutdown = () => {
      console.log('\nRecibida señal de terminación, cerrando servidor...')
      server.close(() => {
        console.log('Servidor HTTP cerrado.')
        sequelize.close().then(() => {
          console.log('Conexión a base de datos cerrada.')
          process.exit(0)
        }).catch((err) => {
          console.error('Error al cerrar base de datos:', err)
          process.exit(1)
        })
      })

      // Forzar cierre si falla el graceful shutdown
      setTimeout(() => {
        console.error('No se pudo cerrar las conexiones a tiempo, forzando cierre')
        process.exit(1)
      }, 10000)
    }

    // Escuchar señales de terminación
    process.on('SIGTERM', gracefulShutdown)
    process.on('SIGINT', gracefulShutdown)
  } catch (error) {
    console.error('Error al iniciar el servidor:', error)
    process.exit(1)
  }
}

// Iniciar la aplicacion
startServer()

module.exports = app
