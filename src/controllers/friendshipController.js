// Controlador de amistades
const friendshipService = require('../services/friendshipService')
const { Friendship } = require('../models')

const friendshipController = {
  // ========================================
  // Enviar solicitud de amistad
  // ========================================
  async sendRequest(req, res) {
    try {
      const requesterId = req.session.user.id
      const { userId } = req.params

      const result = await friendshipService.sendRequest(requesterId, parseInt(userId))

      // Si es peticion AJAX
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        if (result.success) {
          return res.json({
            success: true,
            status: result.status,
            message: result.message || 'Solicitud enviada'
          })
        } else {
          return res.status(400).json({
            success: false,
            error: result.error
          })
        }
      }

      // Peticion normal
      if (result.success) {
        req.session.successMessage = result.message || 'Solicitud de amistad enviada'
      } else {
        req.session.errorMessage = result.error
      }

      res.redirect('back')
    } catch (error) {
      console.error('Error al enviar solicitud:', error)

      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(500).json({
          success: false,
          error: 'Error al enviar solicitud'
        })
      }

      req.session.errorMessage = 'Error al enviar solicitud'
      res.redirect('back')
    }
  },

  // ========================================
  // Aceptar solicitud de amistad
  // ========================================
  async acceptRequest(req, res) {
    try {
      const userId = req.session.user.id
      const { friendshipId } = req.params

      const result = await friendshipService.acceptRequest(parseInt(friendshipId), userId)

      if (req.xhr || req.headers.accept?.includes('application/json')) {
        if (result.success) {
          return res.json({ success: true, message: 'Solicitud aceptada' })
        } else {
          return res.status(400).json({ success: false, error: result.error })
        }
      }

      if (result.success) {
        req.session.successMessage = 'Solicitud aceptada'
      } else {
        req.session.errorMessage = result.error
      }

      res.redirect('/friends/requests')
    } catch (error) {
      console.error('Error al aceptar solicitud:', error)

      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(500).json({ success: false, error: 'Error al aceptar solicitud' })
      }

      req.session.errorMessage = 'Error al aceptar solicitud'
      res.redirect('/friends/requests')
    }
  },

  // ========================================
  // Rechazar solicitud de amistad
  // ========================================
  async rejectRequest(req, res) {
    try {
      const userId = req.session.user.id
      const { friendshipId } = req.params

      const result = await friendshipService.rejectRequest(parseInt(friendshipId), userId)

      if (req.xhr || req.headers.accept?.includes('application/json')) {
        if (result.success) {
          return res.json({ success: true, message: 'Solicitud rechazada' })
        } else {
          return res.status(400).json({ success: false, error: result.error })
        }
      }

      if (result.success) {
        req.session.successMessage = 'Solicitud rechazada'
      } else {
        req.session.errorMessage = result.error
      }

      res.redirect('/friends/requests')
    } catch (error) {
      console.error('Error al rechazar solicitud:', error)

      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(500).json({ success: false, error: 'Error al rechazar solicitud' })
      }

      req.session.errorMessage = 'Error al rechazar solicitud'
      res.redirect('/friends/requests')
    }
  },

  // ========================================
  // Cancelar solicitud enviada
  // ========================================
  async cancelRequest(req, res) {
    try {
      const userId = req.session.user.id
      const { friendshipId } = req.params

      const result = await friendshipService.cancelRequest(parseInt(friendshipId), userId)

      if (req.xhr || req.headers.accept?.includes('application/json')) {
        if (result.success) {
          return res.json({ success: true, message: 'Solicitud cancelada' })
        } else {
          return res.status(400).json({ success: false, error: result.error })
        }
      }

      if (result.success) {
        req.session.successMessage = 'Solicitud cancelada'
      } else {
        req.session.errorMessage = result.error
      }

      res.redirect('back')
    } catch (error) {
      console.error('Error al cancelar solicitud:', error)

      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(500).json({ success: false, error: 'Error al cancelar solicitud' })
      }

      req.session.errorMessage = 'Error al cancelar solicitud'
      res.redirect('back')
    }
  },

  // ========================================
  // Eliminar amigo
  // ========================================
  async removeFriend(req, res) {
    try {
      const userId = req.session.user.id
      const { friendId } = req.params

      const result = await friendshipService.removeFriend(userId, parseInt(friendId))

      if (req.xhr || req.headers.accept?.includes('application/json')) {
        if (result.success) {
          return res.json({ success: true, message: 'Amigo eliminado' })
        } else {
          return res.status(400).json({ success: false, error: result.error })
        }
      }

      if (result.success) {
        req.session.successMessage = 'Amigo eliminado'
      } else {
        req.session.errorMessage = result.error
      }

      res.redirect('/friends')
    } catch (error) {
      console.error('Error al eliminar amigo:', error)

      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(500).json({ success: false, error: 'Error al eliminar amigo' })
      }

      req.session.errorMessage = 'Error al eliminar amigo'
      res.redirect('/friends')
    }
  },

  // ========================================
  // Bloquear usuario
  // ========================================
  async blockUser(req, res) {
    try {
      const userId = req.session.user.id
      const { targetId } = req.params

      const result = await friendshipService.blockUser(userId, parseInt(targetId))

      if (req.xhr || req.headers.accept?.includes('application/json')) {
        if (result.success) {
          return res.json({ success: true, message: 'Usuario bloqueado' })
        } else {
          return res.status(400).json({ success: false, error: result.error })
        }
      }

      if (result.success) {
        req.session.successMessage = 'Usuario bloqueado'
      } else {
        req.session.errorMessage = result.error
      }

      res.redirect('back')
    } catch (error) {
      console.error('Error al bloquear usuario:', error)

      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(500).json({ success: false, error: 'Error al bloquear usuario' })
      }

      req.session.errorMessage = 'Error al bloquear usuario'
      res.redirect('back')
    }
  },

  // ========================================
  // Desbloquear usuario
  // ========================================
  async unblockUser(req, res) {
    try {
      const userId = req.session.user.id
      const { targetId } = req.params

      const result = await friendshipService.unblockUser(userId, parseInt(targetId))

      if (req.xhr || req.headers.accept?.includes('application/json')) {
        if (result.success) {
          return res.json({ success: true, message: 'Usuario desbloqueado' })
        } else {
          return res.status(400).json({ success: false, error: result.error })
        }
      }

      if (result.success) {
        req.session.successMessage = 'Usuario desbloqueado'
      } else {
        req.session.errorMessage = result.error
      }

      res.redirect('/friends/blocked')
    } catch (error) {
      console.error('Error al desbloquear usuario:', error)

      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(500).json({ success: false, error: 'Error al desbloquear usuario' })
      }

      req.session.errorMessage = 'Error al desbloquear usuario'
      res.redirect('/friends/blocked')
    }
  },

  // ========================================
  // Ver lista de amigos
  // ========================================
  async showFriends(req, res) {
    try {
      const userId = req.session.user.id
      const page = parseInt(req.query.page) || 1

      const friendsData = await friendshipService.getFriends(userId, page, 20)
      const pendingCount = await Friendship.countPendingRequests(userId)

      res.render('pages/friends/list', {
        title: 'Mis Amigos',
        friends: friendsData.friends,
        pagination: {
          page: friendsData.page,
          totalPages: friendsData.totalPages,
          hasMore: friendsData.hasMore,
          total: friendsData.total
        },
        pendingCount,
        activeTab: 'friends'
      })
    } catch (error) {
      console.error('Error al cargar amigos:', error)
      req.session.errorMessage = 'Error al cargar la lista de amigos'
      res.redirect('/home')
    }
  },

  // ========================================
  // Ver solicitudes pendientes
  // ========================================
  async showRequests(req, res) {
    try {
      const userId = req.session.user.id
      const page = parseInt(req.query.page) || 1
      const tab = req.query.tab || 'received'

      let requestsData
      if (tab === 'sent') {
        requestsData = await friendshipService.getSentRequests(userId, page, 20)
      } else {
        requestsData = await friendshipService.getPendingRequests(userId, page, 20)
      }

      const pendingCount = await Friendship.countPendingRequests(userId)

      res.render('pages/friends/requests', {
        title: 'Solicitudes de Amistad',
        requests: requestsData.requests,
        pagination: {
          page: requestsData.page,
          totalPages: requestsData.totalPages,
          hasMore: requestsData.hasMore,
          total: requestsData.total
        },
        pendingCount,
        activeTab: 'requests',
        requestTab: tab
      })
    } catch (error) {
      console.error('Error al cargar solicitudes:', error)
      req.session.errorMessage = 'Error al cargar las solicitudes'
      res.redirect('/home')
    }
  },

  // ========================================
  // Ver usuarios bloqueados
  // ========================================
  async showBlocked(req, res) {
    try {
      const userId = req.session.user.id
      const page = parseInt(req.query.page) || 1

      const blockedData = await friendshipService.getBlockedUsers(userId, page, 20)
      const pendingCount = await Friendship.countPendingRequests(userId)

      res.render('pages/friends/blocked', {
        title: 'Usuarios Bloqueados',
        blocked: blockedData.blocked,
        pagination: {
          page: blockedData.page,
          totalPages: blockedData.totalPages,
          hasMore: blockedData.hasMore,
          total: blockedData.total
        },
        pendingCount,
        activeTab: 'blocked'
      })
    } catch (error) {
      console.error('Error al cargar usuarios bloqueados:', error)
      req.session.errorMessage = 'Error al cargar usuarios bloqueados'
      res.redirect('/home')
    }
  },

  // ========================================
  // API: Obtener estado de relacion
  // ========================================
  async getRelationshipStatus(req, res) {
    try {
      const userId = req.session.user.id
      const { targetId } = req.params

      const status = await friendshipService.getRelationshipStatus(userId, parseInt(targetId))

      res.json({ success: true, ...status })
    } catch (error) {
      console.error('Error al obtener estado de relacion:', error)
      res.status(500).json({ success: false, error: 'Error al obtener estado' })
    }
  },

  // ========================================
  // API: Buscar amigos
  // ========================================
  async searchFriends(req, res) {
    try {
      const userId = req.session.user.id
      const { q } = req.query

      if (!q || q.length < 2) {
        return res.json({ success: true, friends: [] })
      }

      const friends = await friendshipService.searchFriends(userId, q, 10)

      res.json({ success: true, friends })
    } catch (error) {
      console.error('Error al buscar amigos:', error)
      res.status(500).json({ success: false, error: 'Error en la busqueda' })
    }
  },

  // ========================================
  // API: Obtener amigos mutuos
  // ========================================
  async getMutualFriends(req, res) {
    try {
      const userId = req.session.user.id
      const { targetId } = req.params

      const result = await friendshipService.getMutualFriends(userId, parseInt(targetId), 5)

      res.json({ success: true, ...result })
    } catch (error) {
      console.error('Error al obtener amigos mutuos:', error)
      res.status(500).json({ success: false, error: 'Error al obtener amigos mutuos' })
    }
  }
}

module.exports = friendshipController
