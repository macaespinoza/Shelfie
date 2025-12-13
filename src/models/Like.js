// Modelo de Like
const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/database')

const Like = sequelize.define('Like', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  postId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'post_id',
    references: {
      model: 'posts',
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'likes',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false, // No necesitamos updated_at para likes
  indexes: [
    // Indice unico para evitar likes duplicados
    {
      unique: true,
      fields: ['post_id', 'user_id']
    },
    {
      fields: ['post_id']
    },
    {
      fields: ['user_id']
    }
  ]
})

// Metodo estatico para verificar si un usuario dio like a un post
Like.hasLiked = async function(postId, userId) {
  const like = await this.findOne({
    where: { postId, userId }
  })
  return !!like
}

// Metodo estatico para contar likes de un post
Like.countByPost = async function(postId) {
  return await this.count({ where: { postId } })
}

// Metodo estatico para toggle like
Like.toggle = async function(postId, userId) {
  const existingLike = await this.findOne({
    where: { postId, userId }
  })

  if (existingLike) {
    await existingLike.destroy()
    return { liked: false }
  } else {
    await this.create({ postId, userId })
    return { liked: true }
  }
}

module.exports = Like
