// Configuracion de la base de datos PostgreSQL con Sequelize
const { Sequelize } = require('sequelize')
require('dotenv').config()

// Crear instancia de Sequelize usando la URL de conexion
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  define: {
    // Usar snake_case para nombres de columnas en la BD
    underscored: true,
    // Agregar timestamps automaticamente
    timestamps: true,
    // Nombres de tablas en plural
    freezeTableName: false
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
})

// Funcion para probar la conexion
const testConnection = async () => {
  try {
    await sequelize.authenticate()
    console.log('Conexion a PostgreSQL establecida correctamente')
  } catch (error) {
    console.error('Error al conectar con la base de datos:', error.message)
    process.exit(1)
  }
}

// Funcion para sincronizar modelos con la BD
const syncDatabase = async (force = false) => {
  try {
    await sequelize.sync({ force })
    console.log(`Base de datos sincronizada ${force ? '(tablas recreadas)' : ''}`)
  } catch (error) {
    console.error('Error al sincronizar la base de datos:', error.message)
    throw error
  }
}

// Si se ejecuta directamente con --sync, sincronizar la BD
if (require.main === module) {
  const forceSync = process.argv.includes('--force')
  testConnection()
    .then(() => syncDatabase(forceSync))
    .then(() => {
      console.log('Sincronizacion completada')
      process.exit(0)
    })
    .catch(() => process.exit(1))
}

module.exports = {
  sequelize,
  testConnection,
  syncDatabase
}
