// ========================================
// SHELFIE - JavaScript Principal
// ========================================

document.addEventListener('DOMContentLoaded', function() {
  // Inicializar componentes
  initPasswordToggle()
  initSearchBar()
  initFormValidation()
  initAlertDismiss()
  initPostInteractions()
  initCreatePostForm()
  initLoadMorePosts()
})

// ========================================
// Toggle de visibilidad de contrasena
// ========================================
function initPasswordToggle() {
  const toggleButtons = document.querySelectorAll('#togglePassword')

  toggleButtons.forEach(button => {
    button.addEventListener('click', function() {
      // Buscar el input de contrasena en el mismo input-group
      const inputGroup = this.closest('.input-group')
      const passwordInput = inputGroup.querySelector('input[type="password"], input[type="text"]')
      const icon = this.querySelector('i')

      if (passwordInput) {
        // Cambiar tipo de input
        const isPassword = passwordInput.type === 'password'
        passwordInput.type = isPassword ? 'text' : 'password'

        // Cambiar icono
        icon.classList.toggle('bi-eye', !isPassword)
        icon.classList.toggle('bi-eye-slash', isPassword)
      }
    })
  })
}

// ========================================
// Barra de busqueda de usuarios
// ========================================
function initSearchBar() {
  const searchForm = document.getElementById('searchForm')
  const searchInput = document.getElementById('searchInput')
  const searchResults = document.getElementById('searchResults')

  if (!searchForm || !searchInput || !searchResults) return

  let searchTimeout = null
  const resultsDropdown = searchResults.querySelector('.search-results-dropdown')

  // Buscar mientras escribe
  searchInput.addEventListener('input', function() {
    const query = this.value.trim()

    // Limpiar timeout anterior
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }

    // Ocultar si la busqueda esta vacia
    if (query.length < 2) {
      searchResults.classList.add('d-none')
      return
    }

    // Esperar 300ms antes de buscar
    searchTimeout = setTimeout(() => {
      performSearch(query)
    }, 300)
  })

  // Prevenir envio del formulario
  searchForm.addEventListener('submit', function(e) {
    e.preventDefault()
    const query = searchInput.value.trim()
    if (query.length >= 2) {
      performSearch(query)
    }
  })

  // Ocultar resultados al hacer clic fuera
  document.addEventListener('click', function(e) {
    if (!searchForm.contains(e.target) && !searchResults.contains(e.target)) {
      searchResults.classList.add('d-none')
    }
  })

  // Funcion para realizar la busqueda
  async function performSearch(query) {
    try {
      const response = await fetch(`/user/search?q=${encodeURIComponent(query)}`)
      const data = await response.json()

      if (data.success) {
        renderSearchResults(data.users)
      }
    } catch (error) {
      console.error('Error en busqueda:', error)
    }
  }

  // Funcion para renderizar resultados
  function renderSearchResults(users) {
    if (users.length === 0) {
      resultsDropdown.innerHTML = `
        <div class="text-center py-3 text-muted">
          <i class="bi bi-search me-2"></i>No se encontraron usuarios
        </div>
      `
    } else {
      resultsDropdown.innerHTML = users.map(user => `
        <a href="/user/${user.username}" class="search-result-item">
          ${user.avatar
            ? `<img src="${user.avatar}" alt="${user.username}" class="rounded-circle me-3" width="40" height="40">`
            : `<div class="avatar-placeholder me-3">${user.username.charAt(0).toUpperCase()}</div>`
          }
          <div>
            <div class="fw-medium">${user.username}</div>
            ${user.bio ? `<small class="text-muted text-truncate d-block" style="max-width: 200px;">${user.bio}</small>` : ''}
          </div>
        </a>
      `).join('')
    }

    searchResults.classList.remove('d-none')
  }
}

// ========================================
// Validacion de formularios
// ========================================
function initFormValidation() {
  // Validar que las contrasenas coincidan
  const registerForm = document.querySelector('form[action="/auth/register"]')
  if (registerForm) {
    registerForm.addEventListener('submit', function(e) {
      const password = document.getElementById('password')
      const confirmPassword = document.getElementById('confirmPassword')

      if (password && confirmPassword && password.value !== confirmPassword.value) {
        e.preventDefault()
        showAlert('Las contrasenas no coinciden', 'danger')
        confirmPassword.focus()
      }
    })
  }

  // Validar cambio de contrasena
  const passwordForm = document.querySelector('form[action="/user/password"]')
  if (passwordForm) {
    passwordForm.addEventListener('submit', function(e) {
      const newPassword = document.getElementById('newPassword')
      const confirmPassword = document.getElementById('confirmPassword')

      if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
        e.preventDefault()
        showAlert('Las nuevas contrasenas no coinciden', 'danger')
        confirmPassword.focus()
      }
    })
  }

  // Validacion en tiempo real del nombre de usuario
  const usernameInput = document.getElementById('username')
  if (usernameInput) {
    usernameInput.addEventListener('input', function() {
      const value = this.value
      const isValid = /^[a-zA-Z0-9_]*$/.test(value)

      if (!isValid) {
        this.classList.add('is-invalid')
      } else {
        this.classList.remove('is-invalid')
      }
    })
  }
}

// ========================================
// Auto-cerrar alertas
// ========================================
function initAlertDismiss() {
  const alerts = document.querySelectorAll('.alert:not(.alert-permanent)')

  alerts.forEach(alert => {
    // Auto-cerrar despues de 5 segundos
    setTimeout(() => {
      const bsAlert = bootstrap.Alert.getOrCreateInstance(alert)
      bsAlert.close()
    }, 5000)
  })
}

// ========================================
// Funcion helper para mostrar alertas
// ========================================
function showAlert(message, type = 'info') {
  const container = document.querySelector('.main-content')
  const alertDiv = document.createElement('div')

  const icons = {
    success: 'bi-check-circle-fill',
    danger: 'bi-exclamation-triangle-fill',
    warning: 'bi-exclamation-circle-fill',
    info: 'bi-info-circle-fill'
  }

  alertDiv.className = `alert alert-${type} alert-dismissible fade show container mt-3`
  alertDiv.innerHTML = `
    <i class="${icons[type] || icons.info} me-2"></i>
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
  `

  // Insertar al inicio del contenedor
  container.insertBefore(alertDiv, container.firstChild)

  // Auto-cerrar despues de 5 segundos
  setTimeout(() => {
    if (alertDiv.parentElement) {
      const bsAlert = bootstrap.Alert.getOrCreateInstance(alertDiv)
      bsAlert.close()
    }
  }, 5000)
}

// ========================================
// Preview de imagenes antes de subir
// ========================================
function previewImage(input, previewElement) {
  if (input.files && input.files[0]) {
    const reader = new FileReader()

    reader.onload = function(e) {
      if (previewElement.tagName === 'IMG') {
        previewElement.src = e.target.result
      } else {
        previewElement.style.backgroundImage = `url(${e.target.result})`
      }
    }

    reader.readAsDataURL(input.files[0])
  }
}

// ========================================
// Contador de caracteres para textarea
// ========================================
function initCharacterCounter(textareaId, maxLength) {
  const textarea = document.getElementById(textareaId)
  if (!textarea) return

  const counter = document.createElement('small')
  counter.className = 'text-muted float-end'
  counter.textContent = `0 / ${maxLength}`

  textarea.parentElement.appendChild(counter)

  textarea.addEventListener('input', function() {
    const length = this.value.length
    counter.textContent = `${length} / ${maxLength}`

    if (length >= maxLength * 0.9) {
      counter.classList.add('text-warning')
    } else {
      counter.classList.remove('text-warning')
    }
  })
}

// ========================================
// Interacciones de Posts (Likes)
// ========================================
function initPostInteractions() {
  // Delegacion de eventos para botones de like
  document.addEventListener('click', async function(e) {
    const likeBtn = e.target.closest('.like-btn')
    if (!likeBtn) return

    e.preventDefault()

    const postId = likeBtn.dataset.postId
    if (!postId) return

    try {
      const response = await fetch(`/post/${postId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      })

      const data = await response.json()

      if (data.success) {
        // Actualizar UI del boton
        const icon = likeBtn.querySelector('i')
        const countSpan = likeBtn.querySelector('.like-count')

        if (data.liked) {
          likeBtn.classList.remove('text-muted')
          likeBtn.classList.add('text-danger')
          icon.classList.remove('bi-heart')
          icon.classList.add('bi-heart-fill')
        } else {
          likeBtn.classList.remove('text-danger')
          likeBtn.classList.add('text-muted')
          icon.classList.remove('bi-heart-fill')
          icon.classList.add('bi-heart')
        }

        likeBtn.dataset.liked = data.liked

        if (countSpan) {
          countSpan.textContent = data.likeCount
        }
      } else {
        showAlert(data.errors?.[0] || 'Error al procesar', 'danger')
      }
    } catch (error) {
      console.error('Error al dar like:', error)
      showAlert('Error de conexion', 'danger')
    }
  })
}

// ========================================
// Formulario de crear post
// ========================================
function initCreatePostForm() {
  const createPostForm = document.getElementById('createPostForm')
  if (!createPostForm) return

  const postTypeRadios = document.querySelectorAll('input[name="postType"]')
  const shelfSelector = document.getElementById('shelfSelector')
  const shelfSelect = document.getElementById('shelfSelect')
  const postContent = document.getElementById('postContent')

  // Mostrar/ocultar selector de repisa segun tipo de post
  postTypeRadios.forEach(radio => {
    radio.addEventListener('change', function() {
      if (this.value === 'shelf_share') {
        shelfSelector.classList.remove('d-none')
        shelfSelect.required = true
      } else {
        shelfSelector.classList.add('d-none')
        shelfSelect.required = false
        shelfSelect.value = ''
      }
    })
  })

  // Manejar envio del formulario
  createPostForm.addEventListener('submit', async function(e) {
    e.preventDefault()

    const formData = new FormData(this)
    const content = formData.get('content')?.trim()
    const postType = formData.get('postType')
    const referenceId = formData.get('referenceId')

    // Validar contenido
    if (!content && postType === 'text') {
      showAlert('Escribe algo para publicar', 'warning')
      postContent.focus()
      return
    }

    if (postType === 'shelf_share' && !referenceId) {
      showAlert('Selecciona una repisa para compartir', 'warning')
      return
    }

    const submitBtn = this.querySelector('button[type="submit"]')
    const originalText = submitBtn.innerHTML
    submitBtn.disabled = true
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Publicando...'

    try {
      const response = await fetch('/post/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          content,
          postType,
          referenceId: referenceId || null
        })
      })

      const data = await response.json()

      if (data.success) {
        // Limpiar formulario
        this.reset()
        shelfSelector.classList.add('d-none')

        // Recargar pagina para mostrar nuevo post
        // En una version mas avanzada, se podria insertar el post sin recargar
        window.location.reload()
      } else {
        showAlert(data.errors?.[0] || 'Error al crear publicacion', 'danger')
      }
    } catch (error) {
      console.error('Error al crear post:', error)
      showAlert('Error de conexion', 'danger')
    } finally {
      submitBtn.disabled = false
      submitBtn.innerHTML = originalText
    }
  })
}

// ========================================
// Cargar mas posts
// ========================================
function initLoadMorePosts() {
  const loadMoreBtn = document.getElementById('loadMorePosts')
  if (!loadMoreBtn) return

  loadMoreBtn.addEventListener('click', async function() {
    const page = parseInt(this.dataset.page) || 2
    const originalText = this.innerHTML

    this.disabled = true
    this.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Cargando...'

    try {
      const response = await fetch(`/post/api/feed?page=${page}`)
      const data = await response.json()

      if (data.success && data.posts.length > 0) {
        const feedContainer = document.querySelector('.feed-container')
        const loadMoreContainer = this.parentElement

        // Insertar nuevos posts antes del boton
        data.posts.forEach(post => {
          const postCard = createPostCardHTML(post)
          const tempDiv = document.createElement('div')
          tempDiv.innerHTML = postCard
          feedContainer.insertBefore(tempDiv.firstElementChild, loadMoreContainer)
        })

        // Actualizar pagina
        this.dataset.page = page + 1

        // Ocultar si no hay mas posts
        if (!data.hasMore) {
          loadMoreContainer.remove()
        }
      } else if (!data.hasMore) {
        this.parentElement.remove()
      }
    } catch (error) {
      console.error('Error al cargar posts:', error)
      showAlert('Error al cargar mas publicaciones', 'danger')
    } finally {
      this.disabled = false
      this.innerHTML = originalText
    }
  })
}

// ========================================
// Crear HTML de post card
// ========================================
function createPostCardHTML(post) {
  const authorAvatar = post.authorAvatar
    ? `<img src="${post.authorAvatar}" alt="${post.author.username}" class="rounded-circle me-3" width="48" height="48">`
    : `<div class="avatar-placeholder-lg-sm me-3">${post.author.username.charAt(0).toUpperCase()}</div>`

  let sharedContent = ''

  if (post.sharedShelf) {
    const shelf = post.sharedShelf
    const previewImages = shelf.previewImages?.length
      ? shelf.previewImages.slice(0, 4).map(img => `<div class="shelf-preview-item" style="background-image: url('${img}')"></div>`).join('')
      : `<div class="shelf-preview-empty"><i class="bi ${shelf.categoryInfo.icon} fs-3 text-${shelf.categoryInfo.color}"></i></div>`

    sharedContent = `
      <a href="/shelf/${shelf.id}" class="text-decoration-none">
        <div class="shared-content shared-shelf rounded border border-secondary p-3 mb-3">
          <div class="d-flex align-items-center">
            <div class="shared-shelf-preview me-3">
              <div class="shelf-preview-grid">${previewImages}</div>
            </div>
            <div>
              <span class="badge bg-${shelf.categoryInfo.color} mb-1">
                <i class="bi ${shelf.categoryInfo.icon} me-1"></i>${shelf.categoryInfo.name}
              </span>
              <h6 class="text-white mb-1">${escapeHtml(shelf.name)}</h6>
              <small class="text-muted">
                <i class="bi bi-collection me-1"></i>${shelf.itemCount} items
              </small>
            </div>
          </div>
        </div>
      </a>
    `
  }

  if (post.sharedItem) {
    const item = post.sharedItem
    const itemImage = item.imageUrl
      ? `<img src="${item.imageUrl}" alt="${item.title}" class="rounded me-3" width="60" height="90" style="object-fit: cover;">`
      : `<div class="shared-item-placeholder me-3"><i class="bi ${item.shelf.categoryInfo.icon} fs-3 text-${item.shelf.categoryInfo.color}"></i></div>`

    const rating = item.rating
      ? `<span class="badge bg-warning text-dark"><i class="bi bi-star-fill me-1"></i>${item.rating}/10</span>`
      : ''

    sharedContent = `
      <a href="/shelf/${item.shelf.id}" class="text-decoration-none">
        <div class="shared-content shared-item rounded border border-secondary p-3 mb-3">
          <div class="d-flex">
            ${itemImage}
            <div>
              <span class="badge bg-${item.shelf.categoryInfo.color} mb-1">
                <i class="bi ${item.shelf.categoryInfo.icon} me-1"></i>${item.shelf.categoryInfo.name}
              </span>
              <h6 class="text-white mb-1">${escapeHtml(item.title)}</h6>
              ${rating}
            </div>
          </div>
        </div>
      </a>
    `
  }

  const likedClass = post.hasLiked ? 'text-danger' : 'text-muted'
  const heartIcon = post.hasLiked ? 'bi-heart-fill' : 'bi-heart'
  const likeText = post.likeCount === 1 ? 'like' : 'likes'
  const commentText = post.commentCount === 1 ? 'comentario' : 'comentarios'

  return `
    <div class="card bg-dark border-secondary mb-3 post-card" data-post-id="${post.id}">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start mb-3">
          <div class="d-flex align-items-center">
            <a href="/user/${post.author.username}" class="text-decoration-none">
              ${authorAvatar}
            </a>
            <div>
              <a href="/user/${post.author.username}" class="text-decoration-none text-white fw-medium">
                ${escapeHtml(post.author.username)}
              </a>
              <small class="text-muted d-block">${post.timeAgo}</small>
            </div>
          </div>
        </div>

        ${post.content ? `<p class="card-text mb-3">${escapeHtml(post.content)}</p>` : ''}

        ${sharedContent}

        <div class="post-actions d-flex align-items-center pt-2 border-top border-secondary">
          <button
            class="btn btn-link text-decoration-none p-0 me-4 like-btn ${likedClass}"
            data-post-id="${post.id}"
            data-liked="${post.hasLiked}"
          >
            <i class="bi ${heartIcon} me-1"></i>
            <span class="like-count">${post.likeCount}</span> ${likeText}
          </button>

          <a href="/post/${post.id}" class="btn btn-link text-decoration-none text-muted p-0">
            <i class="bi bi-chat me-1"></i>
            ${post.commentCount} ${commentText}
          </a>
        </div>
      </div>
    </div>
  `
}

// ========================================
// Helper para escapar HTML
// ========================================
function escapeHtml(text) {
  if (!text) return ''
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}
