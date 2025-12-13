// Modelo de Item de Repisa (ShelfItem)
const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/database')

// Fuentes de API disponibles
const API_SOURCES = {
  TMDB: 'tmdb',           // Peliculas y Series
  SPOTIFY: 'spotify',     // Musica y Podcasts
  OPENLIB: 'openlibrary', // Libros
  RAWG: 'rawg',           // Videojuegos
  MANUAL: 'manual'        // Agregado manualmente
}

const ShelfItem = sequelize.define('ShelfItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  shelfId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'shelf_id',
    references: {
      model: 'shelves',
      key: 'id'
    }
  },
  externalId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'external_id',
    comment: 'ID del item en la API externa'
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'El titulo es requerido'
      },
      len: {
        args: [1, 255],
        msg: 'El titulo debe tener entre 1 y 255 caracteres'
      }
    }
  },
  imageUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'image_url',
    validate: {
      isUrl: {
        msg: 'La URL de imagen no es valida'
      }
    }
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: {
        args: [1],
        msg: 'La calificacion minima es 1'
      },
      max: {
        args: [10],
        msg: 'La calificacion maxima es 10'
      }
    }
  },
  review: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: {
        args: [0, 2000],
        msg: 'La resena no puede exceder 2000 caracteres'
      }
    }
  },
  apiSource: {
    type: DataTypes.ENUM(...Object.values(API_SOURCES)),
    allowNull: false,
    defaultValue: API_SOURCES.MANUAL,
    field: 'api_source'
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Datos adicionales del item (autor, ano, genero, etc.)'
  }
}, {
  tableName: 'shelf_items',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['shelf_id']
    },
    {
      fields: ['external_id', 'api_source']
    },
    {
      fields: ['rating']
    }
  ]
})

// Metodo de instancia para obtener datos formateados
ShelfItem.prototype.getFormattedData = function() {
  const metadata = this.metadata || {}

  return {
    id: this.id,
    title: this.title,
    imageUrl: this.imageUrl,
    rating: this.rating,
    review: this.review,
    apiSource: this.apiSource,
    // Datos adicionales del metadata
    year: metadata.year || metadata.release_date?.substring(0, 4),
    author: metadata.author || metadata.artist || metadata.developer,
    genre: metadata.genre || metadata.genres?.join(', '),
    description: metadata.description || metadata.overview,
    // Datos especificos por tipo
    ...this.getTypeSpecificData()
  }
}

// Obtener datos especificos segun el tipo de contenido
ShelfItem.prototype.getTypeSpecificData = function() {
  const metadata = this.metadata || {}

  switch (this.apiSource) {
    case API_SOURCES.TMDB:
      return {
        releaseDate: metadata.release_date || metadata.first_air_date,
        voteAverage: metadata.vote_average,
        originalTitle: metadata.original_title || metadata.original_name
      }
    case API_SOURCES.SPOTIFY:
      return {
        artist: metadata.artist || metadata.artists?.map(a => a.name).join(', '),
        album: metadata.album,
        previewUrl: metadata.preview_url,
        spotifyUrl: metadata.external_urls?.spotify
      }
    case API_SOURCES.OPENLIB:
      return {
        author: metadata.author || metadata.authors?.join(', '),
        publishYear: metadata.first_publish_year,
        isbn: metadata.isbn?.[0],
        pageCount: metadata.number_of_pages
      }
    case API_SOURCES.RAWG:
      return {
        developer: metadata.developers?.map(d => d.name).join(', '),
        platforms: metadata.platforms?.map(p => p.platform?.name).join(', '),
        metacritic: metadata.metacritic,
        releaseDate: metadata.released
      }
    default:
      return {}
  }
}

// Metodo estatico para obtener fuentes de API
ShelfItem.getApiSources = function() {
  return API_SOURCES
}

module.exports = ShelfItem
module.exports.API_SOURCES = API_SOURCES
