// Servicio de Caché en Memoria
// Implementa un caché simple con TTL (Time To Live) para reducir llamadas a APIs externas

// Almacenamiento del caché
const cache = new Map()

// Estadísticas (para monitoreo)
const stats = {
  hits: 0,
  misses: 0,
  sets: 0
}

const cacheService = {
  /**
   * Guardar un valor en el caché con TTL
   * @param {string} key - Clave única
   * @param {any} value - Valor a guardar
   * @param {number} ttlMinutes - Tiempo de vida en minutos (default: 15)
   */
  set(key, value, ttlMinutes = 15) {
    const expiresAt = Date.now() + (ttlMinutes * 60 * 1000)
    
    cache.set(key, {
      value,
      expiresAt,
      createdAt: Date.now()
    })
    
    stats.sets++
    
    // Log para depuración (solo en desarrollo)
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[CACHE SET] ${key} (TTL: ${ttlMinutes}min)`)
    }
  },

  /**
   * Obtener un valor del caché
   * @param {string} key - Clave a buscar
   * @returns {any|null} - Valor o null si no existe o expiró
   */
  get(key) {
    const entry = cache.get(key)
    
    if (!entry) {
      stats.misses++
      return null
    }
    
    // Verificar si expiró
    if (Date.now() > entry.expiresAt) {
      cache.delete(key)
      stats.misses++
      
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[CACHE EXPIRED] ${key}`)
      }
      
      return null
    }
    
    stats.hits++
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[CACHE HIT] ${key}`)
    }
    
    return entry.value
  },

  /**
   * Eliminar una entrada específica del caché
   * @param {string} key - Clave a eliminar
   */
  delete(key) {
    cache.delete(key)
  },

  /**
   * Limpiar todo el caché
   */
  clear() {
    cache.clear()
    console.log('[CACHE] Caché limpiado completamente')
  },

  /**
   * Limpiar entradas expiradas (mantenimiento)
   * @returns {number} - Número de entradas eliminadas
   */
  cleanup() {
    const now = Date.now()
    let cleaned = 0
    
    for (const [key, entry] of cache.entries()) {
      if (now > entry.expiresAt) {
        cache.delete(key)
        cleaned++
      }
    }
    
    if (cleaned > 0) {
      console.log(`[CACHE CLEANUP] ${cleaned} entradas expiradas eliminadas`)
    }
    
    return cleaned
  },

  /**
   * Generar una clave única para el caché
   * @param {string} type - Tipo de contenido (ej: 'tmdb_movies', 'spotify_music')
   * @param {Object} params - Parámetros de la consulta
   * @returns {string} - Clave única
   */
  generateKey(type, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|')
    
    return `${type}::${sortedParams}`.toLowerCase()
  },

  /**
   * Obtener estadísticas del caché
   * @returns {Object} - Estadísticas de uso
   */
  getStats() {
    const hitRate = stats.hits + stats.misses > 0
      ? ((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(2)
      : 0
    
    return {
      ...stats,
      hitRate: `${hitRate}%`,
      size: cache.size,
      entries: Array.from(cache.keys())
    }
  },

  /**
   * Obtener el tamaño actual del caché
   * @returns {number} - Número de entradas
   */
  size() {
    return cache.size
  }
}

// Ejecutar limpieza automática cada 10 minutos
setInterval(() => {
  cacheService.cleanup()
}, 10 * 60 * 1000)

// TTL recomendados por tipo de contenido (en minutos)
const CACHE_TTL = {
  // Búsquedas - cambian frecuentemente
  SEARCH: 15,
  
  // Contenido popular - cambia más lento
  POPULAR: 60,
  
  // Detalles de items - muy estables
  DETAILS: 120,
  
  // Datos estáticos (géneros, plataformas)
  STATIC: 1440 // 24 horas
}

module.exports = cacheService
module.exports.CACHE_TTL = CACHE_TTL
