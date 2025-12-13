// Servicio de Repisas - Logica de negocio para repisas e items
const { Shelf, ShelfItem, User, Friendship, SHELF_CATEGORIES, CATEGORY_INFO, VISIBILITY_OPTIONS } = require('../models')
const { Op } = require('sequelize')

// Importar servicios de APIs
const tmdbService = require('./api/tmdbService')
const spotifyService = require('./api/spotifyService')
const openLibraryService = require('./api/openLibraryService')
const rawgService = require('./api/rawgService')

// Mapeo de categoria a servicio de API
const API_SERVICES = {
  movies: { service: tmdbService, method: 'searchMovies', detailMethod: 'getMovieDetails' },
  series: { service: tmdbService, method: 'searchSeries', detailMethod: 'getSeriesDetails' },
  music: { service: spotifyService, method: 'searchMusic', detailMethod: 'getAlbumDetails' },
  podcasts: { service: spotifyService, method: 'searchPodcasts', detailMethod: 'getPodcastDetails' },
  books: { service: openLibraryService, method: 'searchBooks', detailMethod: 'getBookDetails' },
  games: { service: rawgService, method: 'searchGames', detailMethod: 'getGameDetails' }
}

const shelfService = {
  // ========================================
  // CRUD DE REPISAS
  // ========================================

  // Crear una nueva repisa
  async createShelf(userId, shelfData) {
    try {
      // Determinar visibilidad (nuevo campo) y isPublic (retrocompatibilidad)
      const visibility = shelfData.visibility || 'public'
      const isPublic = visibility === 'public'

      const shelf = await Shelf.create({
        userId,
        category: shelfData.category,
        name: shelfData.name,
        description: shelfData.description || null,
        isPublic,
        visibility
      })

      return { success: true, shelf }
    } catch (error) {
      if (error.name === 'SequelizeValidationError') {
        const messages = error.errors.map(e => e.message)
        return { success: false, errors: messages }
      }
      throw error
    }
  },

  // Obtener repisa por ID
  async getShelfById(shelfId, includeItems = true) {
    const include = includeItems ? [{
      model: ShelfItem,
      as: 'items'
    }] : []

    const shelf = await Shelf.findByPk(shelfId, {
      include: [
        ...include,
        { model: User, as: 'owner', attributes: ['id', 'username', 'avatar'] }
      ],
      order: includeItems ? [[{ model: ShelfItem, as: 'items' }, 'updated_at', 'DESC']] : []
    })

    return shelf
  },

  // Obtener todas las repisas de un usuario (respetando visibilidad y amistad)
  async getUserShelves(userId, viewerId = null) {
    const where = { userId }

    // Si el viewer no es el dueno, filtrar por visibilidad
    if (viewerId !== userId) {
      // Verificar si son amigos
      const areFriends = viewerId ? await Friendship.areFriends(viewerId, userId) : false

      if (areFriends) {
        // Amigos pueden ver repisas publicas y de amigos
        where.visibility = { [Op.in]: ['public', 'friends'] }
      } else {
        // No amigos solo pueden ver repisas publicas
        where.visibility = 'public'
      }
    }

    const shelves = await Shelf.findAll({
      where,
      include: [{
        model: ShelfItem,
        as: 'items',
        attributes: ['id', 'imageUrl'],
        limit: 8,
        separate: true, // Necesario para que limit funcione con order en includes
        order: [['updated_at', 'DESC']] // Items mas recientes primero
      }],
      order: [['created_at', 'DESC']]
    })

    // Agregar info de categoria y conteo de items a cada repisa
    return shelves.map(shelf => ({
      ...shelf.toJSON(),
      categoryInfo: shelf.getCategoryInfo(),
      itemCount: shelf.items?.length || 0,
      previewImages: shelf.items?.map(item => item.imageUrl).filter(Boolean)
    }))
  },

  // Obtener repisas de un usuario agrupadas por categoria
  async getUserShelvesByCategory(userId, viewerId = null) {
    const shelves = await this.getUserShelves(userId, viewerId)

    const byCategory = {}
    Object.keys(CATEGORY_INFO).forEach(cat => {
      byCategory[cat] = {
        ...CATEGORY_INFO[cat],
        shelves: []
      }
    })

    shelves.forEach(shelf => {
      if (byCategory[shelf.category]) {
        byCategory[shelf.category].shelves.push(shelf)
      }
    })

    return byCategory
  },

  // Actualizar repisa
  async updateShelf(shelfId, userId, updateData) {
    try {
      const shelf = await Shelf.findOne({ where: { id: shelfId, userId } })

      if (!shelf) {
        return { success: false, errors: ['Repisa no encontrada'] }
      }

      const allowedFields = ['name', 'description', 'visibility']
      const updates = {}

      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          updates[field] = updateData[field]
        }
      })

      // Actualizar isPublic basado en visibility para retrocompatibilidad
      if (updates.visibility) {
        updates.isPublic = updates.visibility === 'public'
      }

      await shelf.update(updates)
      return { success: true, shelf }
    } catch (error) {
      if (error.name === 'SequelizeValidationError') {
        const messages = error.errors.map(e => e.message)
        return { success: false, errors: messages }
      }
      throw error
    }
  },

  // Eliminar repisa
  async deleteShelf(shelfId, userId) {
    const shelf = await Shelf.findOne({ where: { id: shelfId, userId } })

    if (!shelf) {
      return { success: false, errors: ['Repisa no encontrada'] }
    }

    await shelf.destroy()
    return { success: true }
  },

  // ========================================
  // ITEMS DE REPISA
  // ========================================

  // Agregar item a repisa
  async addItemToShelf(shelfId, userId, itemData) {
    try {
      // Verificar que la repisa existe y pertenece al usuario
      const shelf = await Shelf.findOne({ where: { id: shelfId, userId } })

      if (!shelf) {
        return { success: false, errors: ['Repisa no encontrada'] }
      }

      // Verificar si el item ya existe en la repisa
      if (itemData.externalId) {
        const existingItem = await ShelfItem.findOne({
          where: {
            shelfId,
            externalId: itemData.externalId,
            apiSource: itemData.apiSource
          }
        })

        if (existingItem) {
          return { success: false, errors: ['Este item ya esta en la repisa'] }
        }
      }

      const item = await ShelfItem.create({
        shelfId,
        externalId: itemData.externalId,
        title: itemData.title,
        imageUrl: itemData.imageUrl,
        rating: itemData.rating || null,
        review: itemData.review || null,
        apiSource: itemData.apiSource || 'manual',
        metadata: itemData.metadata || {}
      })

      return { success: true, item }
    } catch (error) {
      if (error.name === 'SequelizeValidationError') {
        const messages = error.errors.map(e => e.message)
        return { success: false, errors: messages }
      }
      throw error
    }
  },

  // Actualizar item (rating y review)
  async updateItem(itemId, userId, updateData) {
    try {
      // Encontrar item y verificar que pertenece al usuario
      const item = await ShelfItem.findByPk(itemId, {
        include: [{
          model: Shelf,
          as: 'shelf',
          where: { userId }
        }]
      })

      if (!item) {
        return { success: false, errors: ['Item no encontrado'] }
      }

      const updates = {}
      if (updateData.rating !== undefined) updates.rating = updateData.rating
      if (updateData.review !== undefined) updates.review = updateData.review

      await item.update(updates)
      return { success: true, item }
    } catch (error) {
      if (error.name === 'SequelizeValidationError') {
        const messages = error.errors.map(e => e.message)
        return { success: false, errors: messages }
      }
      throw error
    }
  },

  // Eliminar item de repisa
  async removeItemFromShelf(itemId, userId) {
    const item = await ShelfItem.findByPk(itemId, {
      include: [{
        model: Shelf,
        as: 'shelf',
        where: { userId }
      }]
    })

    if (!item) {
      return { success: false, errors: ['Item no encontrado'] }
    }

    await item.destroy()
    return { success: true }
  },

  // Obtener items de una repisa
  async getShelfItems(shelfId, page = 1, limit = 20) {
    const offset = (page - 1) * limit

    const { count, rows } = await ShelfItem.findAndCountAll({
      where: { shelfId },
      order: [['updated_at', 'DESC']], // Items mas recientes/modificados primero
      limit,
      offset
    })

    return {
      items: rows.map(item => ({
        ...item.toJSON(),
        formattedData: item.getFormattedData()
      })),
      page,
      totalItems: count,
      totalPages: Math.ceil(count / limit)
    }
  },

  // ========================================
  // BUSQUEDA EN APIs EXTERNAS
  // ========================================

  // Buscar contenido en la API correspondiente
  async searchContent(category, query, page = 1) {
    const apiConfig = API_SERVICES[category]

    if (!apiConfig) {
      return { results: [], error: 'Categoria no valida' }
    }

    const { service, method } = apiConfig
    return await service[method](query, page)
  },

  // Obtener detalles de un item de API externa
  async getContentDetails(category, externalId) {
    const apiConfig = API_SERVICES[category]

    if (!apiConfig) {
      return null
    }

    const { service, detailMethod } = apiConfig
    return await service[detailMethod](externalId)
  },

  // Obtener contenido popular/trending por categoria
  async getPopularContent(category, page = 1) {
    switch (category) {
      case 'movies':
        return await tmdbService.getPopularMovies(page)
      case 'series':
        return await tmdbService.getPopularSeries(page)
      case 'music':
        return await spotifyService.getNewReleases(page)
      case 'games':
        return await rawgService.getPopularGames(page)
      case 'books':
        return await openLibraryService.getTrendingBooks()
      case 'podcasts':
        // Spotify no tiene endpoint de podcasts populares sin query
        return { results: [] }
      default:
        return { results: [] }
    }
  },

  // ========================================
  // UTILIDADES
  // ========================================

  // Obtener todas las categorias
  getCategories() {
    return Shelf.getAllCategoriesInfo()
  },

  // Obtener info de una categoria
  getCategoryInfo(category) {
    return CATEGORY_INFO[category] || null
  },

  // Verificar si el usuario puede ver una repisa (considerando visibilidad y amistad)
  async canViewShelf(shelfId, viewerId) {
    const shelf = await Shelf.findByPk(shelfId)

    if (!shelf) return false

    // El dueno siempre puede ver sus repisas
    if (shelf.userId === viewerId) return true

    // Verificar segun visibilidad
    const visibility = shelf.visibility || (shelf.isPublic ? 'public' : 'private')

    switch (visibility) {
      case 'public':
        return true

      case 'friends':
        // Solo amigos pueden ver
        if (!viewerId) return false
        return await Friendship.areFriends(viewerId, shelf.userId)

      case 'private':
        // Solo el dueno puede ver
        return false

      default:
        return shelf.isPublic
    }
  },

  // Obtener estadisticas de repisas de un usuario
  async getUserStats(userId) {
    const shelves = await Shelf.findAll({
      where: { userId },
      include: [{
        model: ShelfItem,
        as: 'items',
        attributes: ['id', 'rating']
      }]
    })

    const stats = {
      totalShelves: shelves.length,
      totalItems: 0,
      byCategory: {},
      averageRating: null
    }

    let totalRatings = 0
    let ratingSum = 0

    shelves.forEach(shelf => {
      const itemCount = shelf.items?.length || 0
      stats.totalItems += itemCount

      if (!stats.byCategory[shelf.category]) {
        stats.byCategory[shelf.category] = {
          ...CATEGORY_INFO[shelf.category],
          shelfCount: 0,
          itemCount: 0
        }
      }

      stats.byCategory[shelf.category].shelfCount++
      stats.byCategory[shelf.category].itemCount += itemCount

      shelf.items?.forEach(item => {
        if (item.rating) {
          totalRatings++
          ratingSum += item.rating
        }
      })
    })

    if (totalRatings > 0) {
      stats.averageRating = (ratingSum / totalRatings).toFixed(1)
    }

    return stats
  }
}

module.exports = shelfService
