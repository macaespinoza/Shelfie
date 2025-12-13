// Servicio de usuario - Logica de negocio para usuarios
const { User, Friendship } = require('../models')
const { Op } = require('sequelize')

const userService = {
  // Crear un nuevo usuario
  async create(userData) {
    try {
      const user = await User.create({
        username: userData.username.toLowerCase().trim(),
        email: userData.email.toLowerCase().trim(),
        password: userData.password
      })
      return { success: true, user }
    } catch (error) {
      // Manejar errores de validacion de Sequelize
      if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
        const messages = error.errors.map(e => e.message)
        return { success: false, errors: messages }
      }
      throw error
    }
  },

  // Buscar usuario por email o username
  async findByCredentials(identifier) {
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { email: identifier.toLowerCase().trim() },
          { username: identifier.toLowerCase().trim() }
        ]
      }
    })
    return user
  },

  // Buscar usuario por ID
  async findById(userId) {
    return await User.findByPk(userId)
  },

  // Buscar usuario por username
  async findByUsername(username) {
    return await User.findOne({
      where: { username: username.toLowerCase().trim() }
    })
  },

  // Actualizar perfil de usuario
  async updateProfile(userId, updateData) {
    try {
      const user = await User.findByPk(userId)

      if (!user) {
        return { success: false, errors: ['Usuario no encontrado'] }
      }

      // Solo actualizar campos permitidos
      const allowedFields = ['username', 'email', 'bio']
      const updates = {}

      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          updates[field] = field === 'bio'
            ? updateData[field]
            : updateData[field].toLowerCase().trim()
        }
      }

      await user.update(updates)
      return { success: true, user }
    } catch (error) {
      if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
        const messages = error.errors.map(e => e.message)
        return { success: false, errors: messages }
      }
      throw error
    }
  },

  // Actualizar avatar
  async updateAvatar(userId, filename) {
    const user = await User.findByPk(userId)
    if (!user) return null

    const oldAvatar = user.avatar
    await user.update({ avatar: filename })

    return { user, oldAvatar }
  },

  // Actualizar imagen de portada
  async updateCover(userId, filename) {
    const user = await User.findByPk(userId)
    if (!user) return null

    const oldCover = user.coverImage
    await user.update({ coverImage: filename })

    return { user, oldCover }
  },

  // Cambiar contrasena
  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findByPk(userId)

    if (!user) {
      return { success: false, errors: ['Usuario no encontrado'] }
    }

    const isValid = await user.validatePassword(currentPassword)
    if (!isValid) {
      return { success: false, errors: ['La contrasena actual es incorrecta'] }
    }

    if (newPassword.length < 6) {
      return { success: false, errors: ['La nueva contrasena debe tener al menos 6 caracteres'] }
    }

    user.password = newPassword
    await user.save()

    return { success: true }
  },

  // Buscar usuarios (para agregar amigos)
  async searchUsers(query, currentUserId, limit = 10) {
    const users = await User.findAll({
      where: {
        id: { [Op.ne]: currentUserId },
        [Op.or]: [
          { username: { [Op.iLike]: `%${query}%` } },
          { email: { [Op.iLike]: `%${query}%` } }
        ]
      },
      attributes: ['id', 'username', 'avatar', 'bio'],
      limit
    })

    return users
  },

  // Obtener perfil publico de un usuario
  async getPublicProfile(username, viewerId = null) {
    const user = await User.findOne({
      where: { username: username.toLowerCase() },
      attributes: ['id', 'username', 'bio', 'avatar', 'coverImage', 'created_at']
    })

    if (!user) return null

    // Obtener estado de amistad si hay un viewer
    let friendshipStatus = 'none'
    if (viewerId && viewerId !== user.id) {
      const status = await Friendship.getRelationStatus(viewerId, user.id)
      friendshipStatus = typeof status === 'object' ? status : { status: 'none' }
    }

    return {
      ...user.toJSON(),
      avatarUrl: user.getAvatarUrl(),
      coverUrl: user.getCoverUrl(),
      friendshipStatus
    }
  },

  // Obtener usuarios recientes
  async getRecentUsers(limit = 10, excludeUserId = null) {
    const where = excludeUserId ? { id: { [Op.ne]: excludeUserId } } : {}

    const users = await User.findAll({
      where,
      attributes: ['id', 'username', 'avatar', 'bio', 'created_at'],
      order: [['created_at', 'DESC']],
      limit
    })

    return users.map(user => ({
      ...user.toJSON(),
      avatarUrl: user.getAvatarUrl()
    }))
  }
}

module.exports = userService
