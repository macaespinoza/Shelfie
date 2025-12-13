// Servicio para la API de Open Library
// Documentacion: https://openlibrary.org/developers/api
// Esta API es gratuita y no requiere autenticacion

const cacheService = require('../cacheService')
const { CACHE_TTL } = require('../cacheService')

const OPENLIB_API_URL = 'https://openlibrary.org'
const OPENLIB_COVERS_URL = 'https://covers.openlibrary.org'

const openLibraryService = {
  // Construir URL de portada de libro
  getCoverUrl(coverId, size = 'M') {
    if (!coverId) return null
    // Tamanos: S (small), M (medium), L (large)
    return `${OPENLIB_COVERS_URL}/b/id/${coverId}-${size}.jpg`
  },

  // Construir URL de portada por ISBN
  getCoverByIsbn(isbn, size = 'M') {
    if (!isbn) return null
    return `${OPENLIB_COVERS_URL}/b/isbn/${isbn}-${size}.jpg`
  },

  // Hacer peticion a la API
  async fetchApi(endpoint, params = {}) {
    const url = new URL(`${OPENLIB_API_URL}${endpoint}`)

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value)
      }
    })

    try {
      const response = await fetch(url.toString())

      if (!response.ok) {
        throw new Error(`Open Library API error: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error en Open Library API:', error.message)
      return { docs: [], error: error.message }
    }
  },

  // ========================================
  // LIBROS
  // ========================================

  // Buscar libros
  async searchBooks(query, page = 1, limit = 20) {
    // Verificar caché primero
    const cacheKey = cacheService.generateKey('openlib_search_books', { query, page, limit })
    const cached = cacheService.get(cacheKey)
    if (cached) return cached

    const data = await this.fetchApi('/search.json', {
      q: query,
      page,
      limit,
      language: 'spa' // Priorizar libros en espanol
    })

    if (data.error) return { results: [], error: data.error }

    const results = data.docs?.map(book => this.formatBook(book)) || []

    const result = {
      results,
      page,
      totalResults: data.numFound || 0,
      totalPages: Math.ceil((data.numFound || 0) / limit)
    }

    // Guardar en caché (libros cambian poco)
    cacheService.set(cacheKey, result, CACHE_TTL.POPULAR)

    return result
  },

  // Buscar libros por autor
  async searchByAuthor(author, page = 1, limit = 20) {
    // Verificar caché primero
    const cacheKey = cacheService.generateKey('openlib_search_author', { author, page, limit })
    const cached = cacheService.get(cacheKey)
    if (cached) return cached

    const data = await this.fetchApi('/search.json', {
      author,
      page,
      limit
    })

    if (data.error) return { results: [], error: data.error }

    const result = {
      results: data.docs?.map(book => this.formatBook(book)) || [],
      page,
      totalResults: data.numFound || 0
    }

    // Guardar en caché
    cacheService.set(cacheKey, result, CACHE_TTL.POPULAR)

    return result
  },

  // Buscar libros por titulo
  async searchByTitle(title, page = 1, limit = 20) {
    // Verificar caché primero
    const cacheKey = cacheService.generateKey('openlib_search_title', { title, page, limit })
    const cached = cacheService.get(cacheKey)
    if (cached) return cached

    const data = await this.fetchApi('/search.json', {
      title,
      page,
      limit
    })

    if (data.error) return { results: [], error: data.error }

    const result = {
      results: data.docs?.map(book => this.formatBook(book)) || [],
      page,
      totalResults: data.numFound || 0
    }

    // Guardar en caché
    cacheService.set(cacheKey, result, CACHE_TTL.POPULAR)

    return result
  },

  // Obtener detalles de un libro por su work key
  async getBookDetails(workKey) {
    // Verificar caché primero
    const cacheKey = cacheService.generateKey('openlib_book_details', { key: workKey })
    const cached = cacheService.get(cacheKey)
    if (cached) return cached

    // workKey viene en formato "/works/OL123W"
    const cleanKey = workKey.startsWith('/works/') ? workKey : `/works/${workKey}`

    const data = await this.fetchApi(`${cleanKey}.json`)

    if (data.error) return null

    const result = this.formatBookDetails(data)

    // Guardar en caché (detalles de libros duran mucho)
    cacheService.set(cacheKey, result, CACHE_TTL.DETAILS)

    return result
  },

  // Obtener detalles por ISBN
  async getBookByIsbn(isbn) {
    // Verificar caché primero
    const cacheKey = cacheService.generateKey('openlib_isbn', { isbn })
    const cached = cacheService.get(cacheKey)
    if (cached) return cached

    const data = await this.fetchApi(`/isbn/${isbn}.json`)

    if (data.error) return null

    let result
    // Obtener mas detalles del work asociado
    if (data.works?.[0]?.key) {
      const workData = await this.fetchApi(`${data.works[0].key}.json`)
      result = this.formatBookFromEdition(data, workData)
    } else {
      result = this.formatBookFromEdition(data)
    }

    // Guardar en caché (detalles de libros duran mucho)
    cacheService.set(cacheKey, result, CACHE_TTL.DETAILS)

    return result
  },

  // Formatear resultado de busqueda
  formatBook(book) {
    return {
      externalId: book.key, // e.g., "/works/OL123W"
      title: book.title,
      imageUrl: book.cover_i ? this.getCoverUrl(book.cover_i, 'M') : null,
      apiSource: 'openlibrary',
      type: 'book',
      metadata: {
        author: book.author_name?.join(', '),
        authors: book.author_name,
        author_keys: book.author_key,
        first_publish_year: book.first_publish_year,
        year: book.first_publish_year?.toString(),
        isbn: book.isbn,
        publisher: book.publisher,
        language: book.language,
        subject: book.subject?.slice(0, 5), // Primeros 5 temas
        edition_count: book.edition_count,
        cover_i: book.cover_i,
        number_of_pages: book.number_of_pages_median
      }
    }
  },

  // Formatear detalles completos de un work
  formatBookDetails(work) {
    const description = typeof work.description === 'string'
      ? work.description
      : work.description?.value || ''

    return {
      externalId: work.key,
      title: work.title,
      imageUrl: work.covers?.[0] ? this.getCoverUrl(work.covers[0], 'M') : null,
      apiSource: 'openlibrary',
      type: 'book',
      metadata: {
        description,
        subjects: work.subjects?.slice(0, 10),
        subject_places: work.subject_places,
        subject_times: work.subject_times,
        covers: work.covers,
        first_publish_date: work.first_publish_date,
        year: work.first_publish_date
      }
    }
  },

  // Formatear libro desde edicion (ISBN lookup)
  formatBookFromEdition(edition, work = null) {
    return {
      externalId: work?.key || edition.key,
      title: edition.title,
      imageUrl: edition.covers?.[0]
        ? this.getCoverUrl(edition.covers[0], 'M')
        : (edition.isbn_13?.[0] ? this.getCoverByIsbn(edition.isbn_13[0], 'M') : null),
      apiSource: 'openlibrary',
      type: 'book',
      metadata: {
        description: typeof work?.description === 'string'
          ? work.description
          : work?.description?.value || '',
        publishers: edition.publishers,
        publish_date: edition.publish_date,
        year: edition.publish_date?.match(/\d{4}/)?.[0],
        number_of_pages: edition.number_of_pages,
        isbn_10: edition.isbn_10,
        isbn_13: edition.isbn_13,
        covers: edition.covers,
        subjects: work?.subjects?.slice(0, 10)
      }
    }
  },

  // Obtener libros trending/populares
  async getTrendingBooks(limit = 20) {
    // Verificar caché primero
    const cacheKey = cacheService.generateKey('openlib_trending', { limit })
    const cached = cacheService.get(cacheKey)
    if (cached) return cached

    // Open Library no tiene endpoint de trending, usamos una busqueda popular
    const data = await this.fetchApi('/search.json', {
      q: 'subject:fiction',
      sort: 'editions',
      limit
    })

    if (data.error) return { results: [], error: data.error }

    const result = {
      results: data.docs?.map(book => this.formatBook(book)) || []
    }

    // Guardar en caché (contenido popular dura más)
    cacheService.set(cacheKey, result, CACHE_TTL.POPULAR)

    return result
  }
}

module.exports = openLibraryService
