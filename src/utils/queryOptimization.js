// ========================================
// UTILIDADES DE OPTIMIZACIÓN DE CONSULTAS
// ========================================

const { User, Shelf, Post, Comment, Like, ShelfItem } = require('../models')

/**
 * Configuración común de includes para evitar N+1 queries
 */

// Include básico de usuario (sin datos sensibles)
const includeBasicUser = {
  model: User,
  as: 'author',
  attributes: ['id', 'username', 'avatarUrl', 'createdAt']
}

// Include de owner para repisas
const includeShelfOwner = {
  model: User,
  as: 'owner',
  attributes: ['id', 'username', 'avatarUrl']
}

// Include de items de repisa con límite
const includeShelfItems = (limit = 5) => ({
  model: ShelfItem,
  as: 'items',
  limit,
  order: [['createdAt', 'DESC']],
  attributes: ['id', 'title', 'imageUrl', 'rating', 'apiSource']
})

// Include completo de post con autor, likes y comentarios
const includePostComplete = (viewerId = null) => [
  includeBasicUser,
  {
    model: Like,
    as: 'likes',
    attributes: ['id', 'userId'],
    ...(viewerId && {
      where: { userId: viewerId },
      required: false
    })
  },
  {
    model: Comment,
    as: 'comments',
    attributes: ['id'],
    separate: true
  }
]

// Include de comentarios con autor
const includeCommentWithAuthor = {
  model: Comment,
  as: 'comments',
  include: [includeBasicUser],
  order: [['createdAt', 'DESC']],
  separate: true
}

/**
 * Opciones comunes de paginación
 */
const getPaginationOptions = (page = 1, limit = 10) => {
  const offset = (page - 1) * limit
  return {
    limit: parseInt(limit),
    offset: parseInt(offset)
  }
}

/**
 * Crear opciones de ordenamiento
 */
const getOrderOptions = (sortBy = 'createdAt', direction = 'DESC') => {
  const validSortFields = ['createdAt', 'updatedAt', 'username', 'name', 'rating']
  const validDirections = ['ASC', 'DESC']

  const field = validSortFields.includes(sortBy) ? sortBy : 'createdAt'
  const dir = validDirections.includes(direction.toUpperCase()) ? direction.toUpperCase() : 'DESC'

  return [[field, dir]]
}

/**
 * Optimizar consulta de posts para feed
 * Incluye eager loading de relaciones para evitar N+1
 */
const getOptimizedPostsQuery = (viewerId = null, page = 1, limit = 10) => {
  return {
    include: [
      {
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'avatarUrl']
      },
      {
        model: Like,
        as: 'likes',
        attributes: ['id', 'userId'],
        required: false
      },
      {
        model: Comment,
        as: 'comments',
        attributes: ['id'],
        separate: true
      }
    ],
    ...getPaginationOptions(page, limit),
    order: [['createdAt', 'DESC']],
    distinct: true
  }
}

/**
 * Optimizar consulta de repisas
 */
const getOptimizedShelvesQuery = (userId, page = 1, limit = 12) => {
  return {
    where: { userId },
    include: [
      {
        model: ShelfItem,
        as: 'items',
        limit: 5,
        order: [['createdAt', 'DESC']],
        separate: true,
        attributes: ['id', 'title', 'imageUrl', 'rating']
      }
    ],
    ...getPaginationOptions(page, limit),
    order: [['createdAt', 'DESC']]
  }
}

/**
 * Optimizar consulta de amigos
 * Reduce la cantidad de datos cargados
 */
const getOptimizedFriendsQuery = (userId) => {
  return {
    attributes: ['id', 'username', 'avatarUrl', 'bio', 'createdAt'],
    where: {
      id: { [require('sequelize').Op.ne]: userId }
    }
  }
}

/**
 * Batch loading de likes para múltiples posts
 * Evita N+1 queries al verificar si el usuario dio like
 */
async function batchLoadLikes(postIds, userId) {
  if (!userId || !postIds || postIds.length === 0) {
    return {}
  }

  const likes = await Like.findAll({
    where: {
      postId: postIds,
      userId
    },
    attributes: ['postId'],
    raw: true
  })

  // Crear un mapa de postId -> boolean
  const likesMap = {}
  likes.forEach(like => {
    likesMap[like.postId] = true
  })

  return likesMap
}

/**
 * Batch loading de conteo de items para múltiples repisas
 */
async function batchLoadItemCounts(shelfIds) {
  if (!shelfIds || shelfIds.length === 0) {
    return {}
  }

  const { sequelize } = require('../config/database')

  const counts = await ShelfItem.findAll({
    where: {
      shelfId: shelfIds
    },
    attributes: [
      'shelfId',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    group: ['shelfId'],
    raw: true
  })

  // Crear un mapa de shelfId -> count
  const countsMap = {}
  counts.forEach(item => {
    countsMap[item.shelfId] = parseInt(item.count)
  })

  return countsMap
}

/**
 * Crear índices en la base de datos para mejorar rendimiento
 * Debe ejecutarse durante la sincronización de la BD
 */
async function createOptimizationIndexes() {
  const { sequelize } = require('../config/database')

  try {
    // Índice compuesto para consultas de amistad
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_friendship_status
      ON "Friendships" ("status", "addresseeId", "requesterId")
    `)

    // Índice para búsqueda de posts por usuario
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_posts_user_created
      ON "Posts" ("userId", "createdAt" DESC)
    `)

    // Índice para búsqueda de repisas por usuario y categoría
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_shelves_user_category
      ON "Shelves" ("userId", "category", "isPrivate")
    `)

    // Índice para likes de usuario
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_likes_user_post
      ON "Likes" ("userId", "postId")
    `)

    // Índice para comentarios de posts
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_comments_post_created
      ON "Comments" ("postId", "createdAt" DESC)
    `)

    // Índice para items de repisas
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_shelf_items_shelf
      ON "ShelfItems" ("shelfId", "createdAt" DESC)
    `)

    console.log('✓ Índices de optimización creados exitosamente')
  } catch (error) {
    console.error('Error al crear índices de optimización:', error.message)
  }
}

/**
 * Analizar y reportar queries lentas
 */
function enableQueryLogging() {
  if (process.env.NODE_ENV === 'development') {
    const { sequelize } = require('../config/database')

    sequelize.options.benchmark = true
    sequelize.options.logging = (sql, timing) => {
      if (timing > 100) { // Queries más lentas que 100ms
        console.warn(`⚠️  Query lenta (${timing}ms):`, sql.substring(0, 100) + '...')
      }
    }
  }
}

module.exports = {
  // Includes reutilizables
  includeBasicUser,
  includeShelfOwner,
  includeShelfItems,
  includePostComplete,
  includeCommentWithAuthor,

  // Utilidades de query
  getPaginationOptions,
  getOrderOptions,
  getOptimizedPostsQuery,
  getOptimizedShelvesQuery,
  getOptimizedFriendsQuery,

  // Batch loading
  batchLoadLikes,
  batchLoadItemCounts,

  // Optimización de BD
  createOptimizationIndexes,
  enableQueryLogging
}
