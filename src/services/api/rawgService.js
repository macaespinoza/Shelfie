// Servicio para la API de RAWG (Videojuegos)
// Documentacion: https://rawg.io/apidocs

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
    const data = await this.fetchApi('/games', {
      search: query,
      page,
      page_size: pageSize,
      search_precise: true
    })

    if (data.error) return { results: [], error: data.error }

    const results = data.results?.map(game => this.formatGame(game)) || []

    return {
      results,
      page,
      totalResults: data.count || 0,
      totalPages: Math.ceil((data.count || 0) / pageSize),
      next: data.next,
      previous: data.previous
    }
  },

  // Obtener detalles de un juego
  async getGameDetails(gameId) {
    const data = await this.fetchApi(`/games/${gameId}`)

    if (data.error) return null

    return this.formatGame(data, true)
  },

  // Obtener juegos populares
  async getPopularGames(page = 1, pageSize = 20) {
    const data = await this.fetchApi('/games', {
      page,
      page_size: pageSize,
      ordering: '-rating',
      metacritic: '80,100' // Solo juegos con buena puntuacion
    })

    if (data.error) return { results: [], error: data.error }

    return {
      results: data.results?.map(game => this.formatGame(game)) || [],
      page,
      totalResults: data.count || 0
    }
  },

  // Obtener juegos recientes
  async getRecentGames(page = 1, pageSize = 20) {
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

    return {
      results: data.results?.map(game => this.formatGame(game)) || [],
      page,
      totalResults: data.count || 0
    }
  },

  // Obtener juegos por genero
  async getGamesByGenre(genreSlug, page = 1, pageSize = 20) {
    const data = await this.fetchApi('/games', {
      genres: genreSlug,
      page,
      page_size: pageSize,
      ordering: '-rating'
    })

    if (data.error) return { results: [], error: data.error }

    return {
      results: data.results?.map(game => this.formatGame(game)) || [],
      page,
      totalResults: data.count || 0
    }
  },

  // Obtener lista de generos
  async getGenres() {
    const data = await this.fetchApi('/genres')

    if (data.error) return []

    return data.results?.map(genre => ({
      id: genre.id,
      name: genre.name,
      slug: genre.slug,
      gamesCount: genre.games_count,
      imageUrl: genre.image_background
    })) || []
  },

  // Obtener lista de plataformas
  async getPlatforms() {
    const data = await this.fetchApi('/platforms')

    if (data.error) return []

    return data.results?.map(platform => ({
      id: platform.id,
      name: platform.name,
      slug: platform.slug,
      gamesCount: platform.games_count
    })) || []
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
