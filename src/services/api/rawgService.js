// Servicio para la API de RAWG (Videojuegos)
// Documentacion: https://rawg.io/apidocs

const cacheService = require('../cacheService')
const { CACHE_TTL } = require('../cacheService')

const RAWG_API_URL = 'https://api.rawg.io/api'

const rawgService = {
  // Obtener la API key desde las variables de entorno
  getApiKey() {
    return process.env.RAWG_API_KEY
  },

  // Hacer peticion a la API
  async fetchApi(endpoint, params = {}) {
    const apiKey = this.getApiKey()

    if (!apiKey) {
      console.warn('RAWG_API_KEY no configurada')
      return { results: [], error: 'API key no configurada' }
    }

    const url = new URL(`${RAWG_API_URL}${endpoint}`)
    url.searchParams.append('key', apiKey)

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value)
      }
    })

    try {
      const response = await fetch(url.toString())

      if (!response.ok) {
        throw new Error(`RAWG API error: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error en RAWG API:', error.message)
      return { results: [], error: error.message }
    }
  },

  // ========================================
  // VIDEOJUEGOS
  // ========================================

  // Buscar videojuegos
  async searchGames(query, page = 1, pageSize = 20) {
    // Verificar caché primero
    const cacheKey = cacheService.generateKey('rawg_search_games', { query, page, pageSize })
    const cached = cacheService.get(cacheKey)
    if (cached) return cached

    const data = await this.fetchApi('/games', {
      search: query,
      page,
      page_size: pageSize,
      search_precise: true
    })

    if (data.error) return { results: [], error: data.error }

    const results = data.results?.map(game => this.formatGame(game)) || []

    const result = {
      results,
      page,
      totalResults: data.count || 0,
      totalPages: Math.ceil((data.count || 0) / pageSize),
      next: data.next,
      previous: data.previous
    }

    // Guardar en caché
    cacheService.set(cacheKey, result, CACHE_TTL.SEARCH)

    return result
  },

  // Obtener detalles de un juego
  async getGameDetails(gameId) {
    // Verificar caché primero
    const cacheKey = cacheService.generateKey('rawg_game_details', { id: gameId })
    const cached = cacheService.get(cacheKey)
    if (cached) return cached

    const data = await this.fetchApi(`/games/${gameId}`)

    if (data.error) return null

    const result = this.formatGame(data, true)

    // Guardar en caché (detalles duran más)
    cacheService.set(cacheKey, result, CACHE_TTL.DETAILS)

    return result
  },

  // Obtener juegos populares
  async getPopularGames(page = 1, pageSize = 20) {
    // Verificar caché primero
    const cacheKey = cacheService.generateKey('rawg_popular_games', { page, pageSize })
    const cached = cacheService.get(cacheKey)
    if (cached) return cached

    const data = await this.fetchApi('/games', {
      page,
      page_size: pageSize,
      ordering: '-rating',
      metacritic: '80,100' // Solo juegos con buena puntuacion
    })

    if (data.error) return { results: [], error: data.error }

    const result = {
      results: data.results?.map(game => this.formatGame(game)) || [],
      page,
      totalResults: data.count || 0
    }

    // Guardar en caché (contenido popular dura más)
    cacheService.set(cacheKey, result, CACHE_TTL.POPULAR)

    return result
  },

  // Obtener juegos recientes
  async getRecentGames(page = 1, pageSize = 20) {
    // Verificar caché primero
    const cacheKey = cacheService.generateKey('rawg_recent_games', { page, pageSize })
    const cached = cacheService.get(cacheKey)
    if (cached) return cached

    const today = new Date()
    const lastYear = new Date(today.setFullYear(today.getFullYear() - 1))
    const dateFrom = lastYear.toISOString().split('T')[0]
    const dateTo = new Date().toISOString().split('T')[0]

    const data = await this.fetchApi('/games', {
      page,
      page_size: pageSize,
      dates: `${dateFrom},${dateTo}`,
      ordering: '-released'
    })

    if (data.error) return { results: [], error: data.error }

    const result = {
      results: data.results?.map(game => this.formatGame(game)) || [],
      page,
      totalResults: data.count || 0
    }

    // Guardar en caché
    cacheService.set(cacheKey, result, CACHE_TTL.POPULAR)

    return result
  },

  // Obtener juegos por genero
  async getGamesByGenre(genreSlug, page = 1, pageSize = 20) {
    // Verificar caché primero
    const cacheKey = cacheService.generateKey('rawg_games_genre', { genre: genreSlug, page, pageSize })
    const cached = cacheService.get(cacheKey)
    if (cached) return cached

    const data = await this.fetchApi('/games', {
      genres: genreSlug,
      page,
      page_size: pageSize,
      ordering: '-rating'
    })

    if (data.error) return { results: [], error: data.error }

    const result = {
      results: data.results?.map(game => this.formatGame(game)) || [],
      page,
      totalResults: data.count || 0
    }

    // Guardar en caché
    cacheService.set(cacheKey, result, CACHE_TTL.POPULAR)

    return result
  },

  // Obtener lista de generos
  async getGenres() {
    // Verificar caché primero (datos estáticos, TTL largo)
    const cacheKey = cacheService.generateKey('rawg_genres', {})
    const cached = cacheService.get(cacheKey)
    if (cached) return cached

    const data = await this.fetchApi('/genres')

    if (data.error) return []

    const result = data.results?.map(genre => ({
      id: genre.id,
      name: genre.name,
      slug: genre.slug,
      gamesCount: genre.games_count,
      imageUrl: genre.image_background
    })) || []

    // Guardar en caché (datos estáticos duran mucho)
    cacheService.set(cacheKey, result, CACHE_TTL.STATIC)

    return result
  },

  // Obtener lista de plataformas
  async getPlatforms() {
    // Verificar caché primero (datos estáticos, TTL largo)
    const cacheKey = cacheService.generateKey('rawg_platforms', {})
    const cached = cacheService.get(cacheKey)
    if (cached) return cached

    const data = await this.fetchApi('/platforms')

    if (data.error) return []

    const result = data.results?.map(platform => ({
      id: platform.id,
      name: platform.name,
      slug: platform.slug,
      gamesCount: platform.games_count
    })) || []

    // Guardar en caché (datos estáticos duran mucho)
    cacheService.set(cacheKey, result, CACHE_TTL.STATIC)

    return result
  },

  // Formatear datos de juego
  formatGame(game, detailed = false) {
    const formatted = {
      externalId: String(game.id),
      title: game.name,
      imageUrl: game.background_image,
      apiSource: 'rawg',
      type: 'game',
      metadata: {
        slug: game.slug,
        released: game.released,
        year: game.released?.substring(0, 4),
        rating: game.rating,
        rating_top: game.rating_top,
        ratings_count: game.ratings_count,
        metacritic: game.metacritic,
        playtime: game.playtime,
        genres: game.genres?.map(g => g.name),
        platforms: game.platforms?.map(p => ({
          name: p.platform?.name,
          slug: p.platform?.slug
        })),
        stores: game.stores?.map(s => s.store?.name),
        tags: game.tags?.slice(0, 5).map(t => t.name),
        esrb_rating: game.esrb_rating?.name,
        short_screenshots: game.short_screenshots?.map(s => s.image)
      }
    }

    if (detailed) {
      formatted.metadata.description = game.description_raw || game.description,
      formatted.metadata.website = game.website
      formatted.metadata.developers = game.developers?.map(d => ({
        id: d.id,
        name: d.name,
        slug: d.slug
      }))
      formatted.metadata.publishers = game.publishers?.map(p => ({
        id: p.id,
        name: p.name,
        slug: p.slug
      }))
      formatted.metadata.reddit_url = game.reddit_url
      formatted.metadata.reddit_description = game.reddit_description
      formatted.metadata.metacritic_url = game.metacritic_url
      formatted.metadata.achievements_count = game.achievements_count
      formatted.metadata.parent_platforms = game.parent_platforms?.map(p => p.platform?.name)
    }

    return formatted
  }
}

module.exports = rawgService
