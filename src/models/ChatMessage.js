// ========================================
// Modelo: ChatMessage
// Gestiona los mensajes del chat en tiempo real
// ========================================

const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/database')

const ChatMessage = sequelize.define('ChatMessage', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // Canal de chat (categoría)
  channel: {
    type: DataTypes.ENUM(
      'general',
      'music',
      'movies',
      'books',
      'games',
      'series',
      'podcasts'
    ),
    allowNull: false,
    defaultValue: 'general',
    comment: 'Canal del mensaje (general o por categoría)'
  },
  // ID del usuario que envía el mensaje
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
    field: 'user_id' // Nombre real de la columna en la BD
  },
  // Contenido del mensaje
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'El mensaje no puede estar vacío'
      },
      len: {
        args: [1, 500],
        msg: 'El mensaje debe tener entre 1 y 500 caracteres'
      }
    }
  }
}, {
  tableName: 'chat_messages',
  timestamps: true,
  updatedAt: false, // Los mensajes no se actualizan, solo se crean
  indexes: [
    {
      fields: ['channel', 'created_at']
    },
    {
      fields: ['user_id']
    }
  ]
})

module.exports = ChatMessage
