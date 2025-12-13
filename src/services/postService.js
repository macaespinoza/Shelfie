// Servicio de Posts - Logica de negocio para publicaciones
const { Post, Comment, Like, User, Shelf, ShelfItem, POST_TYPES } = require('../models')
const { Op } = require('sequelize')

const postService = {
  // ========================================
  // CRUD DE POSTS
  // ========================================

  // Crear un nuevo post
  async createPost(userId, postData) {
    try {
      // Validar contenido minimo
      if (!postData.content && !postData.referenceId) {
        return { success: false, errors: ['La publicacion debe tener contenido'] }
      }

      // Si es compartir repisa o item, verificar que exista
      if (postData.postType === POST_TYPES.SHELF_SHARE && postData.referenceId) {
        const shelf = await Shelf.findByPk(postData.referenceId)
        if (!shelf || (!shelf.isPublic && shelf.userId !== userId)) {
          return { success: false, errors: ['Repisa no encontrada o no tienes acceso'] }
        }
      }

      if (postData.postType === POST_TYPES.ITEM_SHARE && postData.referenceId) {
        const item = await ShelfItem.findByPk(postData.referenceId, {
          include: [{ model: Shelf, as: 'shelf' }]
        })
        if (!item || (!item.shelf.isPublic && item.shelf.userId !== userId)) {
          return { success: false, errors: ['Item no encontrado o no tienes acceso'] }
        }
      }

      const post = await Post.create({
        userId,
        content: postData.content?.trim() || null,
        postType: postData.postType || POST_TYPES.TEXT,
        referenceId: postData.referenceId || null
      })

      // Cargar el post con datos completos
      const fullPost = await this.getPostById(post.id, userId)

      return { success: true, post: fullPost }
    } catch (error) {
      if (error.name === 'SequelizeValidationError') {
        const messages = error.errors.map(e => e.message)
        return { success: false, errors: messages }
      }
      throw error
    }
  },

  // Obtener post por ID con datos completos
  async getPostById(postId, viewerId = null) {
    const post = await Post.findByPk(postId, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'avatar']
        },
        {
          model: Comment,
          as: 'comments',
          include: [{
            model: User,
            as: 'author',
            attributes: ['id', 'username', 'avatar']
          }],
          order: [['created_at', 'ASC']],
          limit: 10
        },
        {
          model: Like,
          as: 'likes',
          attributes: ['userId']
        }
      ]
    })

    if (!post) return null

    return this.formatPost(post, viewerId)
  },

  // Formatear post con datos adicionales
  async formatPost(post, viewerId = null) {
    const postData = post.toJSON()

    // Agregar tiempo relativo
    postData.timeAgo = post.getTimeAgo()

    // Agregar conteo de likes
    postData.likeCount = postData.likes?.length || 0

    // Verificar si el viewer dio like
    postData.hasLiked = viewerId ? postData.likes?.some(like => like.userId === viewerId) : false

    // Agregar conteo de comentarios
    postData.commentCount = postData.comments?.length || 0

    // Formatear comentarios
    if (postData.comments) {
      postData.comments = postData.comments.map(comment => ({
        ...comment,
        timeAgo: new Comment(comment).getTimeAgo(),
        authorAvatar: comment.author?.avatar
          ? `/uploads/avatars/${comment.author.avatar}`
          : null
      }))
    }

    // Formatear avatar del autor
    postData.authorAvatar = postData.author?.avatar
      ? `/uploads/avatars/${postData.author.avatar}`
      : null

    // Si es compartir repisa o item, cargar datos adicionales
    if (postData.postType === POST_TYPES.SHELF_SHARE && postData.referenceId) {
      postData.sharedShelf = await this.getShelfPreview(postData.referenceId)
    }

    if (postData.postType === POST_TYPES.ITEM_SHARE && postData.referenceId) {
      postData.sharedItem = await this.getItemPreview(postData.referenceId)
    }

    // Limpiar datos innecesarios
    delete postData.likes

    return postData
  },

  // Obtener preview de repisa para compartir
  async getShelfPreview(shelfId) {
    const shelf = await Shelf.findByPk(shelfId, {
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'username']
        },
        {
          model: ShelfItem,
          as: 'items',
          attributes: ['imageUrl'],
          limit: 8
        }
      ]
    })

    if (!shelf) return null

    return {
      id: shelf.id,
      name: shelf.name,
      category: shelf.category,
      categoryInfo: shelf.getCategoryInfo(),
      itemCount: shelf.items?.length || 0,
      previewImages: shelf.items?.map(i => i.imageUrl).filter(Boolean),
      owner: shelf.owner
    }
  },

  // Obtener preview de item para compartir
  async getItemPreview(itemId) {
    const item = await ShelfItem.findByPk(itemId, {
      include: [{
        model: Shelf,
        as: 'shelf',
        include: [{
          model: User,
          as: 'owner',
          attributes: ['id', 'username']
        }]
      }]
    })

    if (!item) return null

    return {
      id: item.id,
      title: item.title,
      imageUrl: item.imageUrl,
      rating: item.rating,
      review: item.review,
      metadata: item.metadata,
      shelf: {
        id: item.shelf.id,
        name: item.shelf.name,
        category: item.shelf.category,
        categoryInfo: item.shelf.getCategoryInfo(),
        owner: item.shelf.owner
      }
    }
  },

  // Eliminar post
  async deletePost(postId, userId) {
    const post = await Post.findByPk(postId)

    if (!post) {
      return { success: false, errors: ['Publicacion no encontrada'] }
    }

    if (post.userId !== userId) {
      return { success: false, errors: ['No tienes permiso para eliminar esta publicacion'] }
    }

    await post.destroy()
    return { success: true }
  },

  // ========================================
  // FEED
  // ========================================

  // Obtener feed publico (todos los posts)
  async getPublicFeed(page = 1, limit = 10, viewerId = null) {
    const offset = (page - 1) * limit

    const { count, rows } = await Post.findAndCountAll({
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'avatar']
        },
        {
          model: Comment,
          as: 'comments',
          include: [{
            model: User,
            as: 'author',
            attributes: ['id', 'username', 'avatar']
          }],
          limit: 3,
          order: [['created_at', 'DESC']]
        },
        {
          model: Like,
          as: 'likes',
          attributes: ['userId']
        }
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset,
      distinct: true
    })

    const posts = await Promise.all(
      rows.map(post => this.formatPost(post, viewerId))
    )

    return {
      posts,
      page,
      totalPosts: count,
      totalPages: Math.ceil(count / limit),
      hasMore: offset + rows.length < count
    }
  },

  // Obtener feed de un usuario especifico
  async getUserFeed(userId, page = 1, limit = 10, viewerId = null) {
    const offset = (page - 1) * limit

    const { count, rows } = await Post.findAndCountAll({
      where: { userId },
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'avatar']
        },
        {
          model: Comment,
          as: 'comments',
          include: [{
            model: User,
            as: 'author',
            attributes: ['id', 'username', 'avatar']
          }],
          limit: 3,
          order: [['created_at', 'DESC']]
        },
        {
          model: Like,
          as: 'likes',
          attributes: ['userId']
        }
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset,
      distinct: true
    })

    const posts = await Promise.all(
      rows.map(post => this.formatPost(post, viewerId))
    )

    return {
      posts,
      page,
      totalPosts: count,
      totalPages: Math.ceil(count / limit),
      hasMore: offset + rows.length < count
    }
  },

  // ========================================
  // COMENTARIOS
  // ========================================

  // Agregar comentario a un post
  async addComment(postId, userId, content) {
    try {
      const post = await Post.findByPk(postId)

      if (!post) {
        return { success: false, errors: ['Publicacion no encontrada'] }
      }

      if (!content || content.trim().length === 0) {
        return { success: false, errors: ['El comentario no puede estar vacio'] }
      }

      const comment = await Comment.create({
        postId,
        userId,
        content: content.trim()
      })

      // Cargar datos del autor
      const fullComment = await Comment.findByPk(comment.id, {
        include: [{
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'avatar']
        }]
      })

      return {
        success: true,
        comment: {
          ...fullComment.toJSON(),
          timeAgo: fullComment.getTimeAgo(),
          authorAvatar: fullComment.author?.avatar
            ? `/uploads/avatars/${fullComment.author.avatar}`
            : null
        }
      }
    } catch (error) {
      if (error.name === 'SequelizeValidationError') {
        const messages = error.errors.map(e => e.message)
        return { success: false, errors: messages }
      }
      throw error
    }
  },

  // Eliminar comentario
  async deleteComment(commentId, userId) {
    const comment = await Comment.findByPk(commentId, {
      include: [{ model: Post, as: 'post' }]
    })

    if (!comment) {
      return { success: false, errors: ['Comentario no encontrado'] }
    }

    // Puede eliminar el autor del comentario o el autor del post
    if (comment.userId !== userId && comment.post.userId !== userId) {
      return { success: false, errors: ['No tienes permiso para eliminar este comentario'] }
    }

    await comment.destroy()
    return { success: true }
  },

  // Obtener comentarios de un post
  async getComments(postId, page = 1, limit = 20) {
    const offset = (page - 1) * limit

    const { count, rows } = await Comment.findAndCountAll({
      where: { postId },
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'avatar']
      }],
      order: [['created_at', 'ASC']],
      limit,
      offset
    })

    const comments = rows.map(comment => ({
      ...comment.toJSON(),
      timeAgo: comment.getTimeAgo(),
      authorAvatar: comment.author?.avatar
        ? `/uploads/avatars/${comment.author.avatar}`
        : null
    }))

    return {
      comments,
      page,
      totalComments: count,
      totalPages: Math.ceil(count / limit)
    }
  },

  // ========================================
  // LIKES
  // ========================================

  // Toggle like en un post
  async toggleLike(postId, userId) {
    const post = await Post.findByPk(postId)

    if (!post) {
      return { success: false, errors: ['Publicacion no encontrada'] }
    }

    const result = await Like.toggle(postId, userId)
    const likeCount = await Like.countByPost(postId)

    return {
      success: true,
      liked: result.liked,
      likeCount
    }
  },

  // Obtener usuarios que dieron like a un post
  async getLikeUsers(postId, limit = 10) {
    const likes = await Like.findAll({
      where: { postId },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'avatar']
      }],
      limit,
      order: [['created_at', 'DESC']]
    })

    return likes.map(like => ({
      id: like.user.id,
      username: like.user.username,
      avatar: like.user.avatar ? `/uploads/avatars/${like.user.avatar}` : null
    }))
  }
}

module.exports = postService
