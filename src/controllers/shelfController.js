// Controlador de Repisas
const shelfService = require('../services/shelfService')

const shelfController = {
  // ========================================
  // VISTAS DE REPISAS
  // ========================================

  // Mostrar pagina de crear repisa
  showCreateShelf(req, res) {
    const categories = shelfService.getCategories()

    res.render('pages/shelf/create', {
      title: 'Crear Repisa - Shelfie',
      categories
    })
  },

  // Mostrar detalle de una repisa
  async showShelf(req, res) {
    try {
      const { id } = req.params
      const viewerId = req.currentUser?.id

      const shelf = await shelfService.getShelfById(id, true)

      if (!shelf) {
        req.flash('error', 'Repisa no encontrada')
        return res.redirect('/dashboard')
      }

      // Verificar permisos de visualizacion
      const canView = await shelfService.canViewShelf(id, viewerId)
      if (!canView) {
        req.flash('error', 'No tienes permiso para ver esta repisa')
        return res.redirect('/dashboard')
      }

      const isOwner = viewerId === shelf.userId
      const categoryInfo = shelf.getCategoryInfo()
      const portraitCategories = ['movies', 'series', 'books', 'games']
      const isPortrait = portraitCategories.includes(shelf.category)

      res.render('pages/shelf/show', {
        title: `${shelf.name} - Shelfie`,
        shelf: {
          ...shelf.toJSON(),
          categoryInfo
        },
        isOwner,
        isPortrait
      })
    } catch (error) {
      console.error('Error al mostrar repisa:', error)
      req.flash('error', 'Error al cargar la repisa')
      res.redirect('/dashboard')
    }
  },

  // Mostrar pagina de editar repisa
  async showEditShelf(req, res) {
    try {
      const { id } = req.params
      const userId = req.currentUser.id

      const shelf = await shelfService.getShelfById(id, false)

      if (!shelf || shelf.userId !== userId) {
        req.flash('error', 'Repisa no encontrada')
        return res.redirect('/dashboard')
      }

      res.render('pages/shelf/edit', {
        title: 'Editar Repisa - Shelfie',
        shelf: shelf.toJSON()
      })
    } catch (error) {
      console.error('Error al cargar edicion de repisa:', error)
      req.flash('error', 'Error al cargar la repisa')
      res.redirect('/dashboard')
    }
  },

  // Mostrar pagina de busqueda de contenido
  async showSearch(req, res) {
    try {
      const { shelfId } = req.params
      const { q, page = 1 } = req.query
      const userId = req.currentUser.id

      const shelf = await shelfService.getShelfById(shelfId, false)

      if (!shelf || shelf.userId !== userId) {
        req.flash('error', 'Repisa no encontrada')
        return res.redirect('/dashboard')
      }

      let searchResults = { results: [] }
      let popularContent = { results: [] }

      if (q) {
        // Buscar contenido
        searchResults = await shelfService.searchContent(shelf.category, q, parseInt(page))
      } else {
        // Mostrar contenido popular
        popularContent = await shelfService.getPopularContent(shelf.category)
      }

      const categoryInfo = shelf.getCategoryInfo()
      const portraitCategories = ['movies', 'series', 'books', 'games']
      const isPortrait = portraitCategories.includes(shelf.category)

      res.render('pages/shelf/search', {
        title: `Agregar a ${shelf.name} - Shelfie`,
        shelf: {
          ...shelf.toJSON(),
          categoryInfo
        },
        query: q || '',
        searchResults,
        popularContent,
        currentPage: parseInt(page),
        isPortrait
      })
    } catch (error) {
      console.error('Error en busqueda:', error)
      req.flash('error', 'Error al buscar contenido')
      res.redirect('/dashboard')
    }
  },

  // ========================================
  // ACCIONES DE REPISAS
  // ========================================

  // Crear nueva repisa
  async createShelf(req, res) {
    try {
      const { category, name, description, isPublic } = req.body
      const userId = req.currentUser.id

      const result = await shelfService.createShelf(userId, {
        category,
        name,
        description,
        isPublic: isPublic === 'on' || isPublic === true
      })

      if (!result.success) {
        const categories = shelfService.getCategories()
        return res.render('pages/shelf/create', {
          title: 'Crear Repisa - Shelfie',
          categories,
          errors: result.errors,
          formData: req.body
        })
      }

      req.flash('success', 'Repisa creada exitosamente')
      res.redirect(`/shelf/${result.shelf.id}`)
    } catch (error) {
      console.error('Error al crear repisa:', error)
      req.flash('error', 'Error al crear la repisa')
      res.redirect('/shelf/create')
    }
  },

  // Actualizar repisa
  async updateShelf(req, res) {
    try {
      const { id } = req.params
      const { name, description, isPublic } = req.body
      const userId = req.currentUser.id

      const result = await shelfService.updateShelf(id, userId, {
        name,
        description,
        isPublic: isPublic === 'on' || isPublic === true
      })

      if (!result.success) {
        req.flash('error', result.errors[0])
        return res.redirect(`/shelf/${id}/edit`)
      }

      req.flash('success', 'Repisa actualizada')
      res.redirect(`/shelf/${id}`)
    } catch (error) {
      console.error('Error al actualizar repisa:', error)
      req.flash('error', 'Error al actualizar la repisa')
      res.redirect(`/shelf/${req.params.id}/edit`)
    }
  },

  // Eliminar repisa
  async deleteShelf(req, res) {
    try {
      const { id } = req.params
      const userId = req.currentUser.id

      const result = await shelfService.deleteShelf(id, userId)

      if (!result.success) {
        req.flash('error', result.errors[0])
        return res.redirect(`/shelf/${id}`)
      }

      req.flash('success', 'Repisa eliminada')
      res.redirect(`/user/${req.currentUser.username}`)
    } catch (error) {
      console.error('Error al eliminar repisa:', error)
      req.flash('error', 'Error al eliminar la repisa')
      res.redirect(`/shelf/${req.params.id}`)
    }
  },

  // ========================================
  // ACCIONES DE ITEMS
  // ========================================

  // Agregar item a repisa
  async addItem(req, res) {
    try {
      const { shelfId } = req.params
      const userId = req.currentUser.id
      const itemData = req.body

      // Parsear metadata si viene como string
      if (typeof itemData.metadata === 'string') {
        try {
          itemData.metadata = JSON.parse(itemData.metadata)
        } catch (e) {
          itemData.metadata = {}
        }
      }

      const result = await shelfService.addItemToShelf(shelfId, userId, itemData)

      // Si es peticion AJAX, responder JSON
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        if (!result.success) {
          return res.status(400).json({ success: false, errors: result.errors })
        }
        return res.json({ success: true, item: result.item })
      }

      if (!result.success) {
        req.flash('error', result.errors[0])
        return res.redirect(`/shelf/${shelfId}/search`)
      }

      req.flash('success', 'Item agregado a la repisa')
      res.redirect(`/shelf/${shelfId}`)
    } catch (error) {
      console.error('Error al agregar item:', error)

      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(500).json({ success: false, errors: ['Error al agregar el item'] })
      }

      req.flash('error', 'Error al agregar el item')
      res.redirect(`/shelf/${req.params.shelfId}/search`)
    }
  },

  // Actualizar item (rating/review)
  async updateItem(req, res) {
    try {
      const { itemId } = req.params
      const { rating, review } = req.body
      const userId = req.currentUser.id

      const result = await shelfService.updateItem(itemId, userId, {
        rating: rating ? parseInt(rating) : null,
        review
      })

      if (req.xhr || req.headers.accept?.includes('application/json')) {
        if (!result.success) {
          return res.status(400).json({ success: false, errors: result.errors })
        }
        return res.json({ success: true, item: result.item })
      }

      if (!result.success) {
        req.flash('error', result.errors[0])
      } else {
        req.flash('success', 'Item actualizado')
      }

      res.redirect('back')
    } catch (error) {
      console.error('Error al actualizar item:', error)

      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(500).json({ success: false, errors: ['Error al actualizar'] })
      }

      req.flash('error', 'Error al actualizar el item')
      res.redirect('back')
    }
  },

  // Eliminar item de repisa
  async removeItem(req, res) {
    try {
      const { itemId } = req.params
      const userId = req.currentUser.id

      const result = await shelfService.removeItemFromShelf(itemId, userId)

      if (req.xhr || req.headers.accept?.includes('application/json')) {
        if (!result.success) {
          return res.status(400).json({ success: false, errors: result.errors })
        }
        return res.json({ success: true })
      }

      if (!result.success) {
        req.flash('error', result.errors[0])
      } else {
        req.flash('success', 'Item eliminado de la repisa')
      }

      res.redirect('back')
    } catch (error) {
      console.error('Error al eliminar item:', error)

      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(500).json({ success: false, errors: ['Error al eliminar'] })
      }

      req.flash('error', 'Error al eliminar el item')
      res.redirect('back')
    }
  },

  // ========================================
  // API ENDPOINTS
  // ========================================

  // API: Buscar contenido en APIs externas
  async apiSearchContent(req, res) {
    try {
      const { category, q, page = 1 } = req.query

      if (!category || !q) {
        return res.status(400).json({
          success: false,
          error: 'Se requiere categoria y termino de busqueda'
        })
      }

      const results = await shelfService.searchContent(category, q, parseInt(page))

      res.json({
        success: true,
        ...results
      })
    } catch (error) {
      console.error('Error en busqueda API:', error)
      res.status(500).json({
        success: false,
        error: 'Error al buscar contenido'
      })
    }
  },

  // API: Obtener detalles de contenido
  async apiGetContentDetails(req, res) {
    try {
      const { category, externalId } = req.params

      const details = await shelfService.getContentDetails(category, externalId)

      if (!details) {
        return res.status(404).json({
          success: false,
          error: 'Contenido no encontrado'
        })
      }

      res.json({
        success: true,
        data: details
      })
    } catch (error) {
      console.error('Error al obtener detalles:', error)
      res.status(500).json({
        success: false,
        error: 'Error al obtener detalles'
      })
    }
  },

  // API: Obtener items de repisa
  async apiGetShelfItems(req, res) {
    try {
      const { shelfId } = req.params
      const { page = 1, limit = 20 } = req.query
      const viewerId = req.currentUser?.id

      const canView = await shelfService.canViewShelf(shelfId, viewerId)
      if (!canView) {
        return res.status(403).json({
          success: false,
          error: 'No tienes permiso para ver esta repisa'
        })
      }

      const result = await shelfService.getShelfItems(shelfId, parseInt(page), parseInt(limit))

      res.json({
        success: true,
        ...result
      })
    } catch (error) {
      console.error('Error al obtener items:', error)
      res.status(500).json({
        success: false,
        error: 'Error al obtener items'
      })
    }
  }
}

module.exports = shelfController
