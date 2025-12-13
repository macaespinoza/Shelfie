// Controlador de Posts
const postService = require('../services/postService')
const shelfService = require('../services/shelfService')
const { POST_TYPES } = require('../models')

const postController = {
  // ========================================
  // VISTAS
  // ========================================

  // Mostrar post individual
  async showPost(req, res) {
    try {
      const { id } = req.params
      const viewerId = req.currentUser?.id || null

      const post = await postService.getPostById(id, viewerId)

      if (!post) {
        req.flash('error', 'Publicacion no encontrada')
        return res.redirect('/dashboard')
      }

      // Obtener todos los comentarios
      const { comments } = await postService.getComments(id, 1, 100)

      res.render('pages/post/show', {
        title: `Post de ${post.author.username} - Shelfie`,
        post: { ...post, comments },
        isOwner: viewerId === post.author.id
      })
    } catch (error) {
      console.error('Error al mostrar post:', error)
      req.flash('error', 'Error al cargar la publicacion')
      res.redirect('/dashboard')
    }
  },

  // ========================================
  // ACCIONES DE POSTS
  // ========================================

  // Crear nuevo post
  async createPost(req, res) {
    try {
      const { content, postType, referenceId } = req.body
      const userId = req.currentUser.id

      const result = await postService.createPost(userId, {
        content,
        postType: postType || POST_TYPES.TEXT,
        referenceId: referenceId ? parseInt(referenceId) : null
      })

      // Si es AJAX, responder JSON
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        if (!result.success) {
          return res.status(400).json({ success: false, errors: result.errors })
        }
        return res.json({ success: true, post: result.post })
      }

      if (!result.success) {
        req.flash('error', result.errors[0])
        return res.redirect('/dashboard')
      }

      req.flash('success', 'Publicacion creada')
      res.redirect('/dashboard')
    } catch (error) {
      console.error('Error al crear post:', error)

      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(500).json({ success: false, errors: ['Error al crear la publicacion'] })
      }

      req.flash('error', 'Error al crear la publicacion')
      res.redirect('/dashboard')
    }
  },

  // Eliminar post
  async deletePost(req, res) {
    try {
      const { id } = req.params
      const userId = req.currentUser.id

      const result = await postService.deletePost(id, userId)

      if (req.xhr || req.headers.accept?.includes('application/json')) {
        if (!result.success) {
          return res.status(400).json({ success: false, errors: result.errors })
        }
        return res.json({ success: true })
      }

      if (!result.success) {
        req.flash('error', result.errors[0])
      } else {
        req.flash('success', 'Publicacion eliminada')
      }

      res.redirect('/dashboard')
    } catch (error) {
      console.error('Error al eliminar post:', error)

      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(500).json({ success: false, errors: ['Error al eliminar'] })
      }

      req.flash('error', 'Error al eliminar la publicacion')
      res.redirect('/dashboard')
    }
  },

  // ========================================
  // COMENTARIOS
  // ========================================

  // Agregar comentario
  async addComment(req, res) {
    try {
      const { postId } = req.params
      const { content } = req.body
      const userId = req.currentUser.id

      const result = await postService.addComment(postId, userId, content)

      if (req.xhr || req.headers.accept?.includes('application/json')) {
        if (!result.success) {
          return res.status(400).json({ success: false, errors: result.errors })
        }
        return res.json({ success: true, comment: result.comment })
      }

      if (!result.success) {
        req.flash('error', result.errors[0])
      }

      res.redirect(`/post/${postId}`)
    } catch (error) {
      console.error('Error al agregar comentario:', error)

      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(500).json({ success: false, errors: ['Error al comentar'] })
      }

      req.flash('error', 'Error al agregar el comentario')
      res.redirect('back')
    }
  },

  // Eliminar comentario
  async deleteComment(req, res) {
    try {
      const { commentId } = req.params
      const userId = req.currentUser.id

      const result = await postService.deleteComment(commentId, userId)

      if (req.xhr || req.headers.accept?.includes('application/json')) {
        if (!result.success) {
          return res.status(400).json({ success: false, errors: result.errors })
        }
        return res.json({ success: true })
      }

      if (!result.success) {
        req.flash('error', result.errors[0])
      }

      res.redirect('back')
    } catch (error) {
      console.error('Error al eliminar comentario:', error)

      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(500).json({ success: false, errors: ['Error al eliminar'] })
      }

      req.flash('error', 'Error al eliminar el comentario')
      res.redirect('back')
    }
  },

  // ========================================
  // LIKES
  // ========================================

  // Toggle like
  async toggleLike(req, res) {
    try {
      const { postId } = req.params
      const userId = req.currentUser.id

      const result = await postService.toggleLike(postId, userId)

      // Siempre responder JSON para likes
      if (!result.success) {
        return res.status(400).json({ success: false, errors: result.errors })
      }

      return res.json({
        success: true,
        liked: result.liked,
        likeCount: result.likeCount
      })
    } catch (error) {
      console.error('Error al dar like:', error)
      return res.status(500).json({ success: false, errors: ['Error al procesar'] })
    }
  },

  // ========================================
  // API ENDPOINTS
  // ========================================

  // API: Obtener feed publico
  async apiFeed(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query
      const viewerId = req.currentUser?.id || null

      const feed = await postService.getPublicFeed(
        parseInt(page),
        parseInt(limit),
        viewerId
      )

      res.json({ success: true, ...feed })
    } catch (error) {
      console.error('Error al obtener feed:', error)
      res.status(500).json({ success: false, error: 'Error al cargar el feed' })
    }
  },

  // API: Obtener feed de usuario
  async apiUserFeed(req, res) {
    try {
      const { userId } = req.params
      const { page = 1, limit = 10 } = req.query
      const viewerId = req.currentUser?.id || null

      const feed = await postService.getUserFeed(
        parseInt(userId),
        parseInt(page),
        parseInt(limit),
        viewerId
      )

      res.json({ success: true, ...feed })
    } catch (error) {
      console.error('Error al obtener feed de usuario:', error)
      res.status(500).json({ success: false, error: 'Error al cargar el feed' })
    }
  },

  // API: Obtener comentarios de un post
  async apiComments(req, res) {
    try {
      const { postId } = req.params
      const { page = 1, limit = 20 } = req.query

      const result = await postService.getComments(
        parseInt(postId),
        parseInt(page),
        parseInt(limit)
      )

      res.json({ success: true, ...result })
    } catch (error) {
      console.error('Error al obtener comentarios:', error)
      res.status(500).json({ success: false, error: 'Error al cargar comentarios' })
    }
  },

  // API: Obtener repisas del usuario para compartir
  async apiUserShelves(req, res) {
    try {
      const userId = req.currentUser.id
      const shelves = await shelfService.getUserShelves(userId, userId)

      res.json({
        success: true,
        shelves: shelves.map(s => ({
          id: s.id,
          name: s.name,
          category: s.category,
          categoryInfo: s.categoryInfo,
          itemCount: s.itemCount
        }))
      })
    } catch (error) {
      console.error('Error al obtener repisas:', error)
      res.status(500).json({ success: false, error: 'Error al cargar repisas' })
    }
  }
}

module.exports = postController
