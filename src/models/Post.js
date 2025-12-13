// Modelo de Publicacion (Post)
const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/database')

// Tipos de publicacion
const POST_TYPES = {
  TEXT: 'text',           // Publicacion de solo texto
  SHELF_SHARE: 'shelf_share',   // Compartir una repisa
  ITEM_SHARE: 'item_share'      // Compartir un item de repisa
}

const Post = sequelize.define('Post', {
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
  content: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: {
        args: [0, 2000],
        msg: 'El contenido no puede exceder 2000 caracteres'
      },
      // Validar que haya contenido o referencia
      contentOrReference(value) {
        if (!value && !this.referenceId) {
          throw new Error('La publicacion debe tener contenido o una referencia')
        }
      }
    }
  },
  postType: {
    type: DataTypes.ENUM(...Object.values(POST_TYPES)),
    allowNull: false,
    defaultValue: POST_TYPES.TEXT,
    field: 'post_type'
  },
  referenceId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'reference_id',
    comment: 'ID de la repisa o item compartido'
  }
}, {
  tableName: 'posts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['post_type']
    },
    {
      fields: ['created_at']
    }
  ]
})

// Metodo para obtener el tiempo relativo
Post.prototype.getTimeAgo = function() {
  const now = new Date()
  const created = new Date(this.created_at)
  const diffMs = now - created
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)
  const diffWeek = Math.floor(diffDay / 7)
  const diffMonth = Math.floor(diffDay / 30)

  if (diffSec < 60) return 'hace un momento'
  if (diffMin < 60) return `hace ${diffMin} ${diffMin === 1 ? 'minuto' : 'minutos'}`
  if (diffHour < 24) return `hace ${diffHour} ${diffHour === 1 ? 'hora' : 'horas'}`
  if (diffDay < 7) return `hace ${diffDay} ${diffDay === 1 ? 'dia' : 'dias'}`
  if (diffWeek < 4) return `hace ${diffWeek} ${diffWeek === 1 ? 'semana' : 'semanas'}`
  return `hace ${diffMonth} ${diffMonth === 1 ? 'mes' : 'meses'}`
}

// Metodo estatico para obtener tipos de post
Post.getPostTypes = function() {
  return POST_TYPES
}

module.exports = Post
module.exports.POST_TYPES = POST_TYPES
