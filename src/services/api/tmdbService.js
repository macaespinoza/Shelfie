// Servicio para la API de TMDB (The Movie Database)
// Documentacion: https://developers.themoviedb.org/3

const cacheService = require('../cacheService')
const { CACHE_TTL } = require('../cacheService')

const TMDB_BASE_URL = 'https://api.themoviedb.org/3'
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p'

// Tamanos de imagen disponibles
const IMAGE_SIZES = {
  poster: {
    small: 'w185',
    medium: 'w342',
    large: 'w500',
    original: 'original'
  },
  backdrop: {
    small: 'w300',
    medium: 'w780',
    large: 'w1280',
    original: 'original'
  }
}

const tmdbService = {
  // Obtener la API key desde las variables de entorno
  getApiKey() {
    return process.env.TMDB_API_KEY
  },

  // Construir URL de imagen
  getImageUrl(path, type = 'poster', size = 'medium') {
    if (!path) return null
    const sizeCode = IMAGE_SIZES[type]?.[size] || IMAGE_SIZES.poster.medium
    return `${TMDB_IMAGE_BASE}/${sizeCode}${path}`
  },

  // Hacer peticion a la API
  async fetchApi(endpoint, params = {}) {
    const apiKey = this.getApiKey()
    if (!apiKey) {
      console.warn('TMDB_API_KEY no configurada')
      return { results: [], error: 'API key no configurada' }
    }

    const url = new URL(`${TMDB_BASE_URL}${endpoint}`)
    url.searchParams.append('api_key', apiKey)
    url.searchParams.append('language', 'es-ES')

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value)
      }
    })

    try {
      const response = await fetch(url.toString())

      if (!response.ok) {
        throw new Error(`TMDB API error: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error en TMDB API:', error.message)
      return { results: [], error: error.message }
    }
  },

  // ========================================
  // PELICULAS
  // ========================================

  // Buscar peliculas
  async searchMovies(query, page = 1) {
    // Verificar caché primero
    const cacheKey = cacheService.generateKey('tmdb_search_movies', { query, page })
    const cached = cacheService.get(cacheKey)
    if (cached) return cached

    const data = await this.fetchApi('/search/movie', { query, page })

    if (data.error) return { results: [], error: data.error }

    const results = data.results?.map(movie => this.formatMovie(movie)) || []

    const result = {
      results,
      page: data.page,
      totalPages: data.total_pages,
      totalResults: data.total_results
    }

    // Guardar en caché
    cacheService.set(cacheKey, result, CACHE_TTL.SEARCH)

    return result
  },

  // Obtener detalles de una pelicula
  async getMovieDetails(movieId) {
    // Verificar caché primero
    const cacheKey = cacheService.generateKey('tmdb_movie_details', { id: movieId })
    const cached = cacheService.get(cacheKey)
    if (cached) return cached

    const data = await this.fetchApi(`/movie/${movieId}`)

    if (data.error) return null

    const result = this.formatMovie(data, true)

    // Guardar en caché (detalles duran más)
    cacheService.set(cacheKey, result, CACHE_TTL.DETAILS)

    return result
  },

  // Obtener peliculas populares
  async getPopularMovies(page = 1) {
    // Verificar caché primero
    const cacheKey = cacheService.generateKey('tmdb_popular_movies', { page })
    const cached = cacheService.get(cacheKey)
    if (cached) return cached

    const data = await this.fetchApi('/movie/popular', { page })

    if (data.error) return { results: [], error: data.error }

    const result = {
      results: data.results?.map(movie => this.formatMovie(movie)) || [],
      page: data.page,
      totalPages: data.total_pages
    }

    // Guardar en caché (contenido popular dura más)
    cacheService.set(cacheKey, result, CACHE_TTL.POPULAR)

    return result
  },

  // Formatear datos de pelicula
  formatMovie(movie, detailed = false) {
    const formatted = {
      externalId: String(movie.id),
      title: movie.title,
      imageUrl: this.getImageUrl(movie.poster_path, 'poster', 'medium'),
      apiSource: 'tmdb',
      type: 'movie',
      metadata: {
        original_title: movie.original_title,
        overview: movie.overview,
        release_date: movie.release_date,
        year: movie.release_date?.substring(0, 4),
        vote_average: movie.vote_average,
        vote_count: movie.vote_count,
        popularity: movie.popularity,
        genre_ids: movie.genre_ids,
        backdrop_path: movie.backdrop_path
      }
    }

    if (detailed) {
      formatted.metadata.genres = movie.genres?.map(g => g.name)
      formatted.metadata.runtime = movie.runtime
      formatted.metadata.budget = movie.budget
      formatted.metadata.revenue = movie.revenue
      formatted.metadata.tagline = movie.tagline
      formatted.metadata.production_companies = movie.production_companies?.map(c => c.name)
    }

    return formatted
  },

  // ========================================
  // SERIES
  // ========================================

  // Buscar series
  async searchSeries(query, page = 1) {
    // Verificar caché primero
    const cacheKey = cacheService.generateKey('tmdb_search_series', { query, page })
    const cached = cacheService.get(cacheKey)
    if (cached) return cached

    const data = await this.fetchApi('/search/tv', { query, page })

    if (data.error) return { results: [], error: data.error }

    const results = data.results?.map(series => this.formatSeries(series)) || []

    const result = {
      results,
      page: data.page,
      totalPages: data.total_pages,
      totalResults: data.total_results
    }

    // Guardar en caché
    cacheService.set(cacheKey, result, CACHE_TTL.SEARCH)

    return result
  },

  // Obtener detalles de una serie
  async getSeriesDetails(seriesId) {
    // Verificar caché primero
    const cacheKey = cacheService.generateKey('tmdb_series_details', { id: seriesId })
    const cached = cacheService.get(cacheKey)
    if (cached) return cached

    const data = await this.fetchApi(`/tv/${seriesId}`)

    if (data.error) return null

    const result = this.formatSeries(data, true)

    // Guardar en caché (detalles duran más)
    cacheService.set(cacheKey, result, CACHE_TTL.DETAILS)

    return result
  },

  // Obtener series populares
  async getPopularSeries(page = 1) {
    // Verificar caché primero
    const cacheKey = cacheService.generateKey('tmdb_popular_series', { page })
    const cached = cacheService.get(cacheKey)
    if (cached) return cached

    const data = await this.fetchApi('/tv/popular', { page })

    if (data.error) return { results: [], error: data.error }

    const result = {
      results: data.results?.map(series => this.formatSeries(series)) || [],
      page: data.page,
      totalPages: data.total_pages
    }

    // Guardar en caché (contenido popular dura más)
    cacheService.set(cacheKey, result, CACHE_TTL.POPULAR)

    return result
  },

  // Formatear datos de serie
  formatSeries(series, detailed = false) {
    const formatted = {
      externalId: String(series.id),
      title: series.name,
      imageUrl: this.getImageUrl(series.poster_path, 'poster', 'medium'),
      apiSource: 'tmdb',
      type: 'series',
      metadata: {
        original_name: series.original_name,
        overview: series.overview,
        first_air_date: series.first_air_date,
        year: series.first_air_date?.substring(0, 4),
        vote_average: series.vote_average,
        vote_count: series.vote_count,
        popularity: series.popularity,
        genre_ids: series.genre_ids,
        backdrop_path: series.backdrop_path
      }
    }

    if (detailed) {
      formatted.metadata.genres = series.genres?.map(g => g.name)
      formatted.metadata.number_of_seasons = series.number_of_seasons
      formatted.metadata.number_of_episodes = series.number_of_episodes
      formatted.metadata.status = series.status
      formatted.metadata.networks = series.networks?.map(n => n.name)
      formatted.metadata.created_by = series.created_by?.map(c => c.name)
    }

    return formatted
  }
}

module.exports = tmdbService
