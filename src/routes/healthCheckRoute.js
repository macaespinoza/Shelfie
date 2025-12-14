// ========================================
// HEALTH CHECK ROUTE
// Endpoint para verificar el estado del servidor
// ========================================

const express = require('express')
const router = express.Router()
const { sequelize } = require('../config/database')

/**
 * Endpoint de health check para Railway y monitoreo
 * GET /health
 */
router.get('/health', async (req, res) => {
  try {
    // Verificar conexión a base de datos
    await sequelize.authenticate()

    // Respuesta exitosa
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected',
      environment: process.env.NODE_ENV || 'development'
    })
  } catch (error) {
    // Si hay error en la base de datos, reportar estado degradado
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: process.env.NODE_ENV === 'production' ? 'Database connection failed' : error.message
    })
  }
})

/**
 * Endpoint de health check simple (sin verificación de DB)
 * GET /ping
 */
router.get('/ping', (req, res) => {
  res.status(200).send('pong')
})

module.exports = router
