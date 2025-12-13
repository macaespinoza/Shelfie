// Servicio de gestion de amistades
const { Op } = require('sequelize')
const { Friendship, User } = require('../models')

const friendshipService = {
  // ========================================
  // Enviar solicitud de amistad
  // ========================================
  async sendRequest(requesterId, addresseeId) {
    // Validar que no sea el mismo usuario
    if (requesterId === addresseeId) {
      return { success: false, error: 'No puedes enviarte una solicitud a ti mismo' }
    }

    // Verificar que el destinatario existe
    const addressee = await User.findByPk(addresseeId)
    if (!addressee) {
      return { success: false, error: 'Usuario no encontrado' }
    }

    // Verificar si ya existe una relacion
    const existingRelation = await Friendship.findRelation(requesterId, addresseeId)

    if (existingRelation) {
      switch (existingRelation.status) {
        case 'accepted':
          return { success: false, error: 'Ya son amigos' }
        case 'pending':
          if (existingRelation.requesterId === requesterId) {
            return { success: false, error: 'Ya enviaste una solicitud a este usuario' }
          } else {
            // El otro usuario ya envio solicitud, aceptarla automaticamente
            existingRelation.status = 'accepted'
            await existingRelation.save()
            return { success: true, status: 'accepted', message: 'Solicitud aceptada' }
          }
        case 'blocked':
          if (existingRelation.requesterId === addresseeId) {
            return { success: false, error: 'No puedes enviar solicitud a este usuario' }
          }
          break
      }
    }

    // Crear nueva solicitud
    const friendship = await Friendship.create({
      requesterId,
      addresseeId,
      status: 'pending'
    })

    return { success: true, status: 'pending', friendship }
  },

  // ========================================
  // Aceptar solicitud de amistad
  // ========================================
  async acceptRequest(friendshipId, userId) {
    const friendship = await Friendship.findByPk(friendshipId)

    if (!friendship) {
      return { success: false, error: 'Solicitud no encontrada' }
    }

    // Solo el destinatario puede aceptar
    if (friendship.addresseeId !== userId) {
      return { success: false, error: 'No tienes permiso para aceptar esta solicitud' }
    }

    if (friendship.status !== 'pending') {
      return { success: false, error: 'Esta solicitud ya fue procesada' }
    }

    friendship.status = 'accepted'
    await friendship.save()

    return { success: true, friendship }
  },

  // ========================================
  // Rechazar solicitud de amistad
  // ========================================
  async rejectRequest(friendshipId, userId) {
    const friendship = await Friendship.findByPk(friendshipId)

    if (!friendship) {
      return { success: false, error: 'Solicitud no encontrada' }
    }

    // Solo el destinatario puede rechazar
    if (friendship.addresseeId !== userId) {
      return { success: false, error: 'No tienes permiso para rechazar esta solicitud' }
    }

    if (friendship.status !== 'pending') {
      return { success: false, error: 'Esta solicitud ya fue procesada' }
    }

    // Eliminar la solicitud
    await friendship.destroy()

    return { success: true }
  },

  // ========================================
  // Cancelar solicitud enviada
  // ========================================
  async cancelRequest(friendshipId, userId) {
    const friendship = await Friendship.findByPk(friendshipId)

    if (!friendship) {
      return { success: false, error: 'Solicitud no encontrada' }
    }

    // Solo el solicitante puede cancelar
    if (friendship.requesterId !== userId) {
      return { success: false, error: 'No tienes permiso para cancelar esta solicitud' }
    }

    if (friendship.status !== 'pending') {
      return { success: false, error: 'Esta solicitud ya fue procesada' }
    }

    await friendship.destroy()

    return { success: true }
  },

  // ========================================
  // Eliminar amistad
  // ========================================
  async removeFriend(userId, friendId) {
    const friendship = await Friendship.findRelation(userId, friendId)

    if (!friendship) {
      return { success: false, error: 'No existe relacion con este usuario' }
    }

    if (friendship.status !== 'accepted') {
      return { success: false, error: 'No son amigos' }
    }

    await friendship.destroy()

    return { success: true }
  },

  // ========================================
  // Bloquear usuario
  // ========================================
  async blockUser(blockerId, blockedId) {
    if (blockerId === blockedId) {
      return { success: false, error: 'No puedes bloquearte a ti mismo' }
    }

    // Verificar que el usuario existe
    const blocked = await User.findByPk(blockedId)
    if (!blocked) {
      return { success: false, error: 'Usuario no encontrado' }
    }

    // Buscar relacion existente
    const existingRelation = await Friendship.findRelation(blockerId, blockedId)

    if (existingRelation) {
      // Si ya esta bloqueado por este usuario
      if (existingRelation.status === 'blocked' && existingRelation.requesterId === blockerId) {
        return { success: false, error: 'Este usuario ya esta bloqueado' }
      }

      // Actualizar a bloqueado
      existingRelation.requesterId = blockerId
      existingRelation.addresseeId = blockedId
      existingRelation.status = 'blocked'
      await existingRelation.save()
    } else {
      // Crear nuevo bloqueo
      await Friendship.create({
        requesterId: blockerId,
        addresseeId: blockedId,
        status: 'blocked'
      })
    }

    return { success: true }
  },

  // ========================================
  // Desbloquear usuario
  // ========================================
  async unblockUser(blockerId, blockedId) {
    const relation = await Friendship.findOne({
      where: {
        requesterId: blockerId,
        addresseeId: blockedId,
        status: 'blocked'
      }
    })

    if (!relation) {
      return { success: false, error: 'Este usuario no esta bloqueado' }
    }

    await relation.destroy()

    return { success: true }
  },

  // ========================================
  // Obtener solicitudes pendientes recibidas
  // ========================================
  async getPendingRequests(userId, page = 1, limit = 20) {
    const offset = (page - 1) * limit

    const { count, rows } = await Friendship.findAndCountAll({
      where: {
        addresseeId: userId,
        status: 'pending'
      },
      include: [{
        model: User,
        as: 'requester',
        attributes: ['id', 'username', 'avatar', 'bio']
      }],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    })

    const requests = rows.map(r => ({
      id: r.id,
      createdAt: r.createdAt,
      timeAgo: this.getTimeAgo(r.createdAt),
      user: {
        id: r.requester.id,
        username: r.requester.username,
        avatar: r.requester.avatar,
        bio: r.requester.bio
      }
    }))

    return {
      requests,
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
      hasMore: offset + rows.length < count
    }
  },

  // ========================================
  // Obtener solicitudes enviadas pendientes
  // ========================================
  async getSentRequests(userId, page = 1, limit = 20) {
    const offset = (page - 1) * limit

    const { count, rows } = await Friendship.findAndCountAll({
      where: {
        requesterId: userId,
        status: 'pending'
      },
      include: [{
        model: User,
        as: 'addressee',
        attributes: ['id', 'username', 'avatar', 'bio']
      }],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    })

    const requests = rows.map(r => ({
      id: r.id,
      createdAt: r.createdAt,
      timeAgo: this.getTimeAgo(r.createdAt),
      user: {
        id: r.addressee.id,
        username: r.addressee.username,
        avatar: r.addressee.avatar,
        bio: r.addressee.bio
      }
    }))

    return {
      requests,
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
      hasMore: offset + rows.length < count
    }
  },

  // ========================================
  // Obtener lista de amigos
  // ========================================
  async getFriends(userId, page = 1, limit = 20) {
    const offset = (page - 1) * limit

    const { count, rows } = await Friendship.findAndCountAll({
      where: {
        status: 'accepted',
        [Op.or]: [
          { requesterId: userId },
          { addresseeId: userId }
        ]
      },
      include: [
        {
          model: User,
          as: 'requester',
          attributes: ['id', 'username', 'avatar', 'bio']
        },
        {
          model: User,
          as: 'addressee',
          attributes: ['id', 'username', 'avatar', 'bio']
        }
      ],
      order: [['updatedAt', 'DESC']],
      limit,
      offset
    })

    const friends = rows.map(f => {
      // Determinar cual es el amigo (no el usuario actual)
      const friend = f.requesterId === userId ? f.addressee : f.requester
      return {
        friendshipId: f.id,
        friendsSince: f.updatedAt,
        user: {
          id: friend.id,
          username: friend.username,
          avatar: friend.avatar,
          bio: friend.bio
        }
      }
    })

    return {
      friends,
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
      hasMore: offset + rows.length < count
    }
  },

  // ========================================
  // Obtener usuarios bloqueados
  // ========================================
  async getBlockedUsers(userId, page = 1, limit = 20) {
    const offset = (page - 1) * limit

    const { count, rows } = await Friendship.findAndCountAll({
      where: {
        requesterId: userId,
        status: 'blocked'
      },
      include: [{
        model: User,
        as: 'addressee',
        attributes: ['id', 'username', 'avatar']
      }],
      order: [['updatedAt', 'DESC']],
      limit,
      offset
    })

    const blocked = rows.map(b => ({
      friendshipId: b.id,
      blockedAt: b.updatedAt,
      user: {
        id: b.addressee.id,
        username: b.addressee.username,
        avatar: b.addressee.avatar
      }
    }))

    return {
      blocked,
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
      hasMore: offset + rows.length < count
    }
  },

  // ========================================
  // Obtener estado de relacion entre usuarios
  // ========================================
  async getRelationshipStatus(userId, targetId) {
    if (userId === targetId) {
      return { status: 'self' }
    }

    const relation = await Friendship.getRelationStatus(userId, targetId)

    if (relation.status === 'none') {
      return { status: 'none', canSendRequest: true }
    }

    if (relation.status === 'accepted') {
      return {
        status: 'friends',
        friendshipId: relation.relation.id
      }
    }

    if (relation.status === 'pending') {
      if (relation.isRequester) {
        return {
          status: 'request_sent',
          friendshipId: relation.relation.id
        }
      } else {
        return {
          status: 'request_received',
          friendshipId: relation.relation.id
        }
      }
    }

    if (relation.status === 'blocked') {
      if (relation.isRequester) {
        return {
          status: 'blocked_by_you',
          friendshipId: relation.relation.id
        }
      } else {
        return { status: 'blocked_by_them' }
      }
    }

    return { status: 'none' }
  },

  // ========================================
  // Buscar amigos por nombre
  // ========================================
  async searchFriends(userId, query, limit = 10) {
    // Obtener IDs de amigos
    const friendIds = await Friendship.getFriendIds(userId)

    if (friendIds.length === 0) {
      return []
    }

    const friends = await User.findAll({
      where: {
        id: { [Op.in]: friendIds },
        username: { [Op.iLike]: `%${query}%` }
      },
      attributes: ['id', 'username', 'avatar'],
      limit
    })

    return friends
  },

  // ========================================
  // Obtener amigos mutuos
  // ========================================
  async getMutualFriends(userId, targetId, limit = 10) {
    const [userFriends, targetFriends] = await Promise.all([
      Friendship.getFriendIds(userId),
      Friendship.getFriendIds(targetId)
    ])

    // Encontrar interseccion
    const mutualIds = userFriends.filter(id => targetFriends.includes(id))

    if (mutualIds.length === 0) {
      return { mutualFriends: [], count: 0 }
    }

    const mutualFriends = await User.findAll({
      where: {
        id: { [Op.in]: mutualIds.slice(0, limit) }
      },
      attributes: ['id', 'username', 'avatar']
    })

    return {
      mutualFriends,
      count: mutualIds.length
    }
  },

  // ========================================
  // Helper: Calcular tiempo transcurrido
  // ========================================
  getTimeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000)

    const intervals = {
      año: 31536000,
      mes: 2592000,
      semana: 604800,
      dia: 86400,
      hora: 3600,
      minuto: 60
    }

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInUnit)
      if (interval >= 1) {
        const plural = interval > 1 ? (unit === 'mes' ? 'es' : 's') : ''
        return `hace ${interval} ${unit}${plural}`
      }
    }

    return 'hace un momento'
  }
}

module.exports = friendshipService
