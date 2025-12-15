// Modelo de Repisa (Shelf)
const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/database')

// Categorias disponibles para las repisas
const SHELF_CATEGORIES = {
  MUSIC: 'music',
  MOVIES: 'movies',
  BOOKS: 'books',
  GAMES: 'games',
  SERIES: 'series',
  PODCASTS: 'podcasts'
}

// Opciones de visibilidad para las repisas
const VISIBILITY_OPTIONS = {
  PUBLIC: 'public',         // Visible para todos
  FRIENDS_ONLY: 'friends',  // Solo visible para amigos
  PRIVATE: 'private'        // Solo visible para el dueno
}

// Informacion de cada categoria
const CATEGORY_INFO = {
  music: {
    name: 'Música',
    icon: 'musica',
    color: 'music',
    description: 'Álbumes, canciones y artistas favoritos'
  },
  movies: {
    name: 'Películas',
    icon: 'peliculas',
    color: 'movies',
    description: 'Películas que amas'
  },
  books: {
    name: 'Libros',
    icon: 'libros',
    color: 'books',
    description: 'Lecturas recomendadas'
  },
  games: {
    name: 'Videojuegos',
    icon: 'videojuegos',
    color: 'games',
    description: 'Juegos favoritos'
  },
  series: {
    name: 'Series',
    icon: 'series',
    color: 'series',
    description: 'Series de TV imperdibles'
  },
  podcasts: {
    name: 'Podcasts',
    icon: 'podcasts',
    color: 'podcasts',
    description: 'Podcasts que escuchas'
  }
}

const Shelf = sequelize.define('Shelf', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  category: {
    type: DataTypes.ENUM(...Object.values(SHELF_CATEGORIES)),
    allowNull: false,
    validate: {
      isIn: {
        args: [Object.values(SHELF_CATEGORIES)],
        msg: 'Categoria no valida'
      }
    }
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'El nombre de la repisa es requerido'
      },
      len: {
        args: [1, 100],
        msg: 'El nombre debe tener entre 1 y 100 caracteres'
      }
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: {
        args: [0, 500],
        msg: 'La descripcion no puede exceder 500 caracteres'
      }
    }
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_public'
  },
  visibility: {
    type: DataTypes.ENUM('public', 'friends', 'private'),
    allowNull: false,
    defaultValue: 'public',
    validate: {
      isIn: {
        args: [['public', 'friends', 'private']],
        msg: 'Visibilidad no valida'
      }
    }
  }
}, {
  tableName: 'shelves',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['user_id', 'category']
    },
    {
      fields: ['user_id', 'is_public']
    }
  ]
})

// Metodo de instancia para obtener info de la categoria
Shelf.prototype.getCategoryInfo = function() {
  return CATEGORY_INFO[this.category] || {}
}

// Metodo estatico para obtener todas las categorias
Shelf.getCategories = function() {
  return SHELF_CATEGORIES
}

// Metodo estatico para obtener info de categorias
Shelf.getCategoryInfo = function(category) {
  return CATEGORY_INFO[category] || null
}

// Metodo estatico para obtener todas las categorias con info
Shelf.getAllCategoriesInfo = function() {
  return Object.entries(CATEGORY_INFO).map(([key, info]) => ({
    value: key,
    ...info
  }))
}

module.exports = Shelf
module.exports.SHELF_CATEGORIES = SHELF_CATEGORIES
module.exports.CATEGORY_INFO = CATEGORY_INFO
module.exports.VISIBILITY_OPTIONS = VISIBILITY_OPTIONS
