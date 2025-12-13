// Controlador de usuarios
const userService = require('../services/userService')
const shelfService = require('../services/shelfService')
const postService = require('../services/postService')
const friendshipService = require('../services/friendshipService')
const { Friendship } = require('../models')
const { deleteOldFile } = require('../middlewares/uploadMiddleware')

const userController = {
  // Mostrar dashboard del usuario actual
  async showDashboard(req, res) {
    try {
      const userId = req.currentUser.id

      // Cargar datos en paralelo
      const [recentUsers, feedData, userShelves] = await Promise.all([
        userService.getRecentUsers(5, userId),
        postService.getPublicFeed(1, 10, userId),
        shelfService.getUserShelves(userId, userId)
      ])

      res.render('pages/home', {
        title: 'Dashboard - Shelfie',
        recentUsers,
        posts: feedData.posts,
        hasMorePosts: feedData.hasMore,
        userShelves,
        isDashboard: true
      })
    } catch (error) {
      console.error('Error al cargar dashboard:', error)
      req.flash('error', 'Error al cargar el dashboard')
      res.redirect('/')
    }
  },

  // Mostrar perfil de un usuario
  async showProfile(req, res) {
    try {
      const { username } = req.params
      const viewerId = req.currentUser?.id || null

      const profile = await userService.getPublicProfile(username, viewerId)

      if (!profile) {
        req.flash('error', 'Usuario no encontrado')
        return res.redirect('/dashboard')
      }

      const isOwnProfile = viewerId && viewerId === profile.id

      // Verificar si hay bloqueo entre usuarios
      let relationshipStatus = { status: 'self' }
      let isBlocked = false

      if (viewerId && !isOwnProfile) {
        relationshipStatus = await friendshipService.getRelationshipStatus(viewerId, profile.id)

        // Verificar si alguno bloqueo al otro
        if (relationshipStatus.status === 'blocked_by_them') {
          // El perfil nos bloqueo - mostrar pagina de perfil no disponible
          return res.render('pages/user/blocked-profile', {
            title: 'Perfil no disponible - Shelfie',
            username: profile.username
          })
        }

        if (relationshipStatus.status === 'blocked_by_you') {
          isBlocked = true
        }
      }

      // Obtener datos en paralelo (solo si no esta bloqueado por nosotros)
      const [shelves, friendsCount, mutualFriends] = await Promise.all([
        !isBlocked ? shelfService.getUserShelves(profile.id, viewerId) : [],
        Friendship.countFriends(profile.id),
        viewerId && !isOwnProfile && !isBlocked
          ? friendshipService.getMutualFriends(viewerId, profile.id, 3)
          : { mutualFriends: [], count: 0 }
      ])

      res.render('pages/user/profile', {
        title: `${profile.username} - Shelfie`,
        profile,
        isOwnProfile,
        shelves,
        friendsCount,
        relationshipStatus,
        mutualFriends: mutualFriends.mutualFriends,
        mutualFriendsCount: mutualFriends.count,
        isBlocked
      })
    } catch (error) {
      console.error('Error al cargar perfil:', error)
      req.flash('error', 'Error al cargar el perfil')
      res.redirect('/dashboard')
    }
  },

  // Mostrar formulario de edicion de perfil
  async showEditProfile(req, res) {
    res.render('pages/user/edit-profile', {
      title: 'Editar Perfil - Shelfie'
    })
  },

  // Actualizar perfil del usuario
  async updateProfile(req, res) {
    try {
      const { username, email, bio } = req.body
      const userId = req.currentUser.id

      const result = await userService.updateProfile(userId, { username, email, bio })

      if (!result.success) {
        return res.render('pages/user/edit-profile', {
          title: 'Editar Perfil - Shelfie',
          errors: result.errors
        })
      }

      req.flash('success', 'Perfil actualizado correctamente')
      res.redirect(`/user/${result.user.username}`)
    } catch (error) {
      console.error('Error al actualizar perfil:', error)
      req.flash('error', 'Error al actualizar el perfil')
      res.redirect('/user/edit')
    }
  },

  // Actualizar avatar
  async updateAvatar(req, res) {
    try {
      if (!req.processedFile) {
        req.flash('error', 'No se selecciono ninguna imagen')
        return res.redirect('/user/edit')
      }

      const result = await userService.updateAvatar(
        req.currentUser.id,
        req.processedFile.filename
      )

      if (!result) {
        req.flash('error', 'Error al actualizar el avatar')
        return res.redirect('/user/edit')
      }

      // Eliminar avatar anterior si existe
      if (result.oldAvatar) {
        await deleteOldFile(result.oldAvatar, 'avatars')
      }

      req.flash('success', 'Avatar actualizado correctamente')
      res.redirect('/user/edit')
    } catch (error) {
      console.error('Error al actualizar avatar:', error)
      req.flash('error', 'Error al procesar la imagen')
      res.redirect('/user/edit')
    }
  },

  // Actualizar imagen de portada
  async updateCover(req, res) {
    try {
      if (!req.processedFile) {
        req.flash('error', 'No se selecciono ninguna imagen')
        return res.redirect('/user/edit')
      }

      const result = await userService.updateCover(
        req.currentUser.id,
        req.processedFile.filename
      )

      if (!result) {
        req.flash('error', 'Error al actualizar la portada')
        return res.redirect('/user/edit')
      }

      // Eliminar portada anterior si existe
      if (result.oldCover) {
        await deleteOldFile(result.oldCover, 'covers')
      }

      req.flash('success', 'Imagen de portada actualizada correctamente')
      res.redirect('/user/edit')
    } catch (error) {
      console.error('Error al actualizar portada:', error)
      req.flash('error', 'Error al procesar la imagen')
      res.redirect('/user/edit')
    }
  },

  // Cambiar contrasena
  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword, confirmPassword } = req.body

      // Validaciones
      if (!currentPassword || !newPassword || !confirmPassword) {
        req.flash('error', 'Todos los campos son requeridos')
        return res.redirect('/user/edit')
      }

      if (newPassword !== confirmPassword) {
        req.flash('error', 'Las nuevas contrasenas no coinciden')
        return res.redirect('/user/edit')
      }

      const result = await userService.changePassword(
        req.currentUser.id,
        currentPassword,
        newPassword
      )

      if (!result.success) {
        req.flash('error', result.errors[0])
        return res.redirect('/user/edit')
      }

      req.flash('success', 'Contrasena actualizada correctamente')
      res.redirect('/user/edit')
    } catch (error) {
      console.error('Error al cambiar contrasena:', error)
      req.flash('error', 'Error al cambiar la contrasena')
      res.redirect('/user/edit')
    }
  },

  // API: Buscar usuarios
  async searchUsers(req, res) {
    try {
      const { q } = req.query

      if (!q || q.length < 2) {
        return res.json({ success: true, users: [] })
      }

      const users = await userService.searchUsers(q, req.currentUser.id)

      res.json({
        success: true,
        users: users.map(u => ({
          id: u.id,
          username: u.username,
          avatar: u.avatar ? `/uploads/avatars/${u.avatar}` : null,
          bio: u.bio
        }))
      })
    } catch (error) {
      console.error('Error en busqueda de usuarios:', error)
      res.status(500).json({
        success: false,
        message: 'Error al buscar usuarios'
      })
    }
  }
}

module.exports = userController
