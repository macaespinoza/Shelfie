// Servicio para la API de Spotify
// Documentacion: https://developer.spotify.com/documentation/web-api

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/api/token'
const SPOTIFY_API_URL = 'https://api.spotify.com/v1'

// Cache del token de acceso
let accessToken = null
let tokenExpiration = null

const spotifyService = {
  // Obtener credenciales desde las variables de entorno
  getCredentials() {
    return {
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET
    }
  },

  // Obtener token de acceso (Client Credentials Flow)
  async getAccessToken() {
    // Si el token existe y no ha expirado, usarlo
    if (accessToken && tokenExpiration && Date.now() < tokenExpiration) {
      return accessToken
    }

    const { clientId, clientSecret } = this.getCredentials()

    if (!clientId || !clientSecret) {
      console.warn('Credenciales de Spotify no configuradas')
      return null
    }

    try {
      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

      const response = await fetch(SPOTIFY_AUTH_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
      })

      if (!response.ok) {
        throw new Error(`Spotify auth error: ${response.status}`)
      }

      const data = await response.json()

      // Guardar token en cache
      accessToken = data.access_token
      tokenExpiration = Date.now() + (data.expires_in * 1000) - 60000 // 1 min antes de expirar

      return accessToken
    } catch (error) {
      console.error('Error al obtener token de Spotify:', error.message)
      return null
    }
  },

  // Hacer peticion a la API
  async fetchApi(endpoint, params = {}) {
    const token = await this.getAccessToken()

    if (!token) {
      return { items: [], error: 'No se pudo autenticar con Spotify' }
    }

    const url = new URL(`${SPOTIFY_API_URL}${endpoint}`)

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value)
      }
    })

    try {
      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error(`Spotify API error: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error en Spotify API:', error.message)
      return { items: [], error: error.message }
    }
  },

  // ========================================
  // MUSICA (Albums y Tracks)
  // ========================================

  // Buscar musica (albums)
  async searchMusic(query, page = 1, limit = 20) {
    const offset = (page - 1) * limit

    const data = await this.fetchApi('/search', {
      q: query,
      type: 'album',
      market: 'ES',
      limit,
      offset
    })

    if (data.error) return { results: [], error: data.error }

    const albums = data.albums?.items || []
    const results = albums.map(album => this.formatAlbum(album))

    return {
      results,
      page,
      totalResults: data.albums?.total || 0,
      totalPages: Math.ceil((data.albums?.total || 0) / limit)
    }
  },

  // Obtener detalles de un album
  async getAlbumDetails(albumId) {
    const data = await this.fetchApi(`/albums/${albumId}`, { market: 'ES' })

    if (data.error) return null

    return this.formatAlbum(data, true)
  },

  // Obtener nuevos lanzamientos
  async getNewReleases(page = 1, limit = 20) {
    const offset = (page - 1) * limit

    const data = await this.fetchApi('/browse/new-releases', {
      country: 'ES',
      limit,
      offset
    })

    if (data.error) return { results: [], error: data.error }

    return {
      results: data.albums?.items?.map(album => this.formatAlbum(album)) || [],
      page,
      totalResults: data.albums?.total || 0
    }
  },

  // Formatear datos de album
  formatAlbum(album, detailed = false) {
    const formatted = {
      externalId: album.id,
      title: album.name,
      imageUrl: album.images?.[0]?.url || null,
      apiSource: 'spotify',
      type: 'music',
      metadata: {
        artist: album.artists?.map(a => a.name).join(', '),
        artists: album.artists?.map(a => ({ id: a.id, name: a.name })),
        album_type: album.album_type,
        release_date: album.release_date,
        year: album.release_date?.substring(0, 4),
        total_tracks: album.total_tracks,
        external_urls: album.external_urls,
        images: album.images
      }
    }

    if (detailed) {
      formatted.metadata.tracks = album.tracks?.items?.map(track => ({
        id: track.id,
        name: track.name,
        duration_ms: track.duration_ms,
        track_number: track.track_number,
        preview_url: track.preview_url
      }))
      formatted.metadata.genres = album.genres
      formatted.metadata.label = album.label
      formatted.metadata.copyrights = album.copyrights
    }

    return formatted
  },

  // ========================================
  // PODCASTS (Shows)
  // ========================================

  // Buscar podcasts
  async searchPodcasts(query, page = 1, limit = 20) {
    const offset = (page - 1) * limit

    const data = await this.fetchApi('/search', {
      q: query,
      type: 'show',
      market: 'ES',
      limit,
      offset
    })

    if (data.error) return { results: [], error: data.error }

    const shows = data.shows?.items || []
    const results = shows.map(show => this.formatPodcast(show))

    return {
      results,
      page,
      totalResults: data.shows?.total || 0,
      totalPages: Math.ceil((data.shows?.total || 0) / limit)
    }
  },

  // Obtener detalles de un podcast
  async getPodcastDetails(showId) {
    const data = await this.fetchApi(`/shows/${showId}`, { market: 'ES' })

    if (data.error) return null

    return this.formatPodcast(data, true)
  },

  // Formatear datos de podcast
  formatPodcast(show, detailed = false) {
    const formatted = {
      externalId: show.id,
      title: show.name,
      imageUrl: show.images?.[0]?.url || null,
      apiSource: 'spotify',
      type: 'podcast',
      metadata: {
        publisher: show.publisher,
        description: show.description,
        total_episodes: show.total_episodes,
        languages: show.languages,
        explicit: show.explicit,
        external_urls: show.external_urls,
        images: show.images
      }
    }

    if (detailed) {
      formatted.metadata.episodes = show.episodes?.items?.map(ep => ({
        id: ep.id,
        name: ep.name,
        description: ep.description,
        release_date: ep.release_date,
        duration_ms: ep.duration_ms
      }))
    }

    return formatted
  }
}

module.exports = spotifyService
