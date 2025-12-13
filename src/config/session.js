// Configuracion de sesiones con express-session y almacenamiento en PostgreSQL
const session = require('express-session')
const SequelizeStore = require('connect-session-sequelize')(session.Store)
const { sequelize } = require('./database')

// Crear el almacen de sesiones en la base de datos
const sessionStore = new SequelizeStore({
  db: sequelize,
  tableName: 'sessions',
  checkExpirationInterval: 15 * 60 * 1000, // Limpiar sesiones expiradas cada 15 min
  expiration: 24 * 60 * 60 * 1000 // Las sesiones expiran en 24 horas
})

// Configuracion del middleware de sesion
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'shelfie_secret_key_cambiar_en_produccion',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  name: 'shelfie.sid',
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS solo en produccion
    httpOnly: true, // Prevenir acceso desde JavaScript del cliente
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
    sameSite: 'lax' // Proteccion CSRF basica
  }
}

// Funcion para inicializar la tabla de sesiones
const initSessionStore = async () => {
  try {
    await sessionStore.sync()
    console.log('Tabla de sesiones inicializada')
  } catch (error) {
    console.error('Error al inicializar tabla de sesiones:', error.message)
  }
}

module.exports = {
  sessionMiddleware: session(sessionConfig),
  sessionStore,
  initSessionStore
}
