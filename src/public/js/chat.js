// ========================================
// Cliente de Chat - Socket.io
// Maneja la comunicación en tiempo real
// ========================================

// Configuración del chat (viene de la vista)
const { currentChannel, userId, username, userAvatar } = window.CHAT_CONFIG

// Elementos del DOM
const chatMessages = document.getElementById('chat-messages')
const chatForm = document.getElementById('chat-form')
const messageInput = document.getElementById('message-input')
const sendButton = document.getElementById('send-button')
const charCount = document.getElementById('char-count')
const typingIndicator = document.getElementById('typing-indicator')
const typingUsers = document.getElementById('typing-users')
const activeUsersCount = document.getElementById('active-users-count')

// Estado local
let socket = null
let isTyping = false
let typingTimeout = null
let usersTyping = new Set()

// ========================================
// Inicializar Socket.io
// ========================================
function initializeSocket() {
  socket = io({
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5
  })

  // Evento: Conexión establecida
  socket.on('connect', () => {
    console.log('Conectado al servidor de chat')
    showSystemMessage('Conectado al chat', 'success')

    // Unirse al canal actual
    socket.emit('join_channel', currentChannel)
  })

  // Evento: Error de conexión
  socket.on('connect_error', (error) => {
    console.error('Error de conexión:', error)
    showSystemMessage('Error al conectar con el servidor', 'error')
  })

  // Evento: Desconexión
  socket.on('disconnect', () => {
    console.log('Desconectado del servidor')
    showSystemMessage('Desconectado del chat', 'warning')
  })

  // Evento: Historial de mensajes
  socket.on('message_history', (messages) => {
    console.log('Historial recibido:', messages.length, 'mensajes')
    chatMessages.innerHTML = ''
    messages.forEach(message => displayMessage(message))
    scrollToBottom()
  })

  // Evento: Nuevo mensaje
  socket.on('new_message', (message) => {
    displayMessage(message)
    scrollToBottom()

    // Si el mensaje es de otro usuario, reproducir sonido (opcional)
    if (message.userId !== userId) {
      playNotificationSound()
    }
  })

  // Evento: Usuario se unió
  socket.on('user_joined', (data) => {
    if (data.userId !== userId) {
      showSystemMessage(`${data.username} se unió al canal`, 'info')
    }
  })

  // Evento: Usuario salió
  socket.on('user_left', (data) => {
    if (data.userId !== userId) {
      showSystemMessage(`${data.username} salió del canal`, 'info')
    }
  })

  // Evento: Usuarios activos
  socket.on('active_users', (data) => {
    activeUsersCount.textContent = `${data.count} en línea`

    // Actualizar contador en el sidebar
    const channelBadge = document.querySelector(`.channel-count[data-channel="${currentChannel}"]`)
    if (channelBadge) {
      channelBadge.textContent = data.count
    }
  })

  // Evento: Usuario está escribiendo
  socket.on('user_typing', (data) => {
    if (data.userId !== userId) {
      if (data.isTyping) {
        usersTyping.add(data.username)
      } else {
        usersTyping.delete(data.username)
      }
      updateTypingIndicator()
    }
  })

  // Evento: Error
  socket.on('error', (data) => {
    console.error('Error del servidor:', data.message)
    showSystemMessage(data.message, 'error')
  })
}

// ========================================
// Mostrar mensaje en el chat
// ========================================
function displayMessage(message) {
  const messageElement = document.createElement('div')
  messageElement.className = 'message mb-3'

  const isOwnMessage = message.userId === userId || message.user_id === userId
  if (isOwnMessage) {
    messageElement.classList.add('own-message')
  }

  // Avatar del usuario
  const avatar = message.author?.avatar || message.avatar || userAvatar
  const authorName = message.author?.username || message.username || 'Usuario'
  const messageTime = new Date(message.createdAt || message.created_at)

  messageElement.innerHTML = `
    <div class="d-flex ${isOwnMessage ? 'flex-row-reverse' : ''} align-items-end gap-1">
      <div class="message-avatar flex-shrink-0">
        ${avatar && avatar !== 'null'
          ? `<img src="${avatar}" alt="${authorName}">`
          : `<div class="avatar-placeholder text-white" style="background: linear-gradient(135deg, #cc84eb, #b06cd0);">
               ${authorName.substring(0, 2).toUpperCase()}
             </div>`
        }
      </div>
      <div class="message-content ${isOwnMessage ? 'text-end' : ''} flex-grow-1">
        <div class="message-header" style="opacity: 0.75; margin-bottom: 0.15rem;">
          <strong class="message-author">${authorName}</strong>
          <small class="ms-1" style="color: rgba(236, 254, 247, 0.45); font-size: 0.7rem;">${formatTime(messageTime)}</small>
        </div>
        <div class="message-bubble rounded-3" style="padding: 0.35rem 0.75rem;">
          ${escapeHtml(message.content)}
        </div>
      </div>
    </div>
  `

  chatMessages.appendChild(messageElement)
}

// ========================================
// Mostrar mensaje del sistema
// ========================================
function showSystemMessage(message, type = 'info') {
  const messageElement = document.createElement('div')
  messageElement.className = `alert alert-${type} text-center py-2 mb-2 system-message`
  messageElement.innerHTML = `<small>${escapeHtml(message)}</small>`

  chatMessages.appendChild(messageElement)
  scrollToBottom()

  // Auto-eliminar después de 5 segundos
  setTimeout(() => {
    messageElement.remove()
  }, 5000)
}

// ========================================
// Enviar mensaje
// ========================================
chatForm.addEventListener('submit', (e) => {
  e.preventDefault()

  const content = messageInput.value.trim()

  if (!content) {
    return
  }

  if (content.length > 500) {
    showSystemMessage('El mensaje es demasiado largo', 'error')
    return
  }

  // Enviar mensaje al servidor
  socket.emit('send_message', { content })

  // Limpiar input
  messageInput.value = ''
  charCount.textContent = '0'

  // Detener indicador de "escribiendo"
  stopTyping()
})

// ========================================
// Indicador de "está escribiendo"
// ========================================
messageInput.addEventListener('input', (e) => {
  // Actualizar contador de caracteres
  charCount.textContent = e.target.value.length

  // Notificar que está escribiendo
  if (!isTyping && e.target.value.length > 0) {
    isTyping = true
    socket.emit('typing', true)
  }

  // Reset timeout
  clearTimeout(typingTimeout)
  typingTimeout = setTimeout(() => {
    stopTyping()
  }, 2000)
})

function stopTyping() {
  if (isTyping) {
    isTyping = false
    socket.emit('typing', false)
  }
}

function updateTypingIndicator() {
  if (usersTyping.size > 0) {
    const users = Array.from(usersTyping)
    let text = ''

    if (users.length === 1) {
      text = `${users[0]} está escribiendo...`
    } else if (users.length === 2) {
      text = `${users[0]} y ${users[1]} están escribiendo...`
    } else {
      text = `${users.length} personas están escribiendo...`
    }

    typingUsers.textContent = text
    typingIndicator.style.display = 'block'
  } else {
    typingIndicator.style.display = 'none'
  }
}

// ========================================
// Funciones auxiliares
// ========================================

function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight
}

function formatTime(date) {
  const now = new Date()
  const diff = now - date

  // Si es hoy
  if (diff < 86400000 && now.getDate() === date.getDate()) {
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Si es ayer
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.getDate() === yesterday.getDate()) {
    return 'Ayer ' + date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Fecha completa
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function playNotificationSound() {
  // Sonido simple usando Web Audio API (opcional)
  // Puedes descomentar esto si quieres sonidos de notificación
  /*
  const audioContext = new (window.AudioContext || window.webkitAudioContext)()
  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)

  oscillator.frequency.value = 800
  oscillator.type = 'sine'
  gainNode.gain.value = 0.1

  oscillator.start()
  setTimeout(() => oscillator.stop(), 100)
  */
}

// ========================================
// Cambio de canal
// ========================================
document.querySelectorAll('.channel-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault()
    const channel = item.dataset.channel

    // Si ya estamos en este canal, no hacer nada
    if (channel === currentChannel) {
      return
    }

    // Redirigir a la nueva URL
    window.location.href = `/chat?channel=${channel}`
  })
})

// ========================================
// Auto-scroll cuando llegan nuevos mensajes
// ========================================
const observer = new MutationObserver(() => {
  // Solo hacer scroll si estamos cerca del final
  const isNearBottom = chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight < 100

  if (isNearBottom) {
    scrollToBottom()
  }
})

observer.observe(chatMessages, {
  childList: true,
  subtree: true
})

// ========================================
// Inicializar al cargar la página
// ========================================
document.addEventListener('DOMContentLoaded', () => {
  initializeSocket()
})

// Limpiar al salir de la página
window.addEventListener('beforeunload', () => {
  if (socket) {
    socket.disconnect()
  }
})

// ========================================
// Selector de emojis
// ========================================
const emojiButton = document.getElementById('emoji-button')
const emojiPicker = document.getElementById('emoji-picker')
const emojiItems = document.querySelectorAll('.emoji-item')

// Toggle del selector de emojis
emojiButton.addEventListener('click', (e) => {
  e.stopPropagation()
  const isVisible = emojiPicker.style.display === 'block'
  emojiPicker.style.display = isVisible ? 'none' : 'block'
})

// Insertar emoji en el input
emojiItems.forEach(item => {
  item.addEventListener('click', () => {
    const emoji = item.textContent
    const currentValue = messageInput.value
    const cursorPosition = messageInput.selectionStart

    // Insertar emoji en la posición del cursor
    const newValue = currentValue.slice(0, cursorPosition) + emoji + currentValue.slice(cursorPosition)
    messageInput.value = newValue

    // Actualizar contador de caracteres
    charCount.textContent = newValue.length

    // Mover cursor después del emoji
    messageInput.selectionStart = messageInput.selectionEnd = cursorPosition + emoji.length

    // Mantener foco en el input
    messageInput.focus()

    // Ocultar selector
    emojiPicker.style.display = 'none'
  })
})

// Cerrar selector al hacer click fuera
document.addEventListener('click', (e) => {
  if (!emojiPicker.contains(e.target) && e.target !== emojiButton) {
    emojiPicker.style.display = 'none'
  }
})
