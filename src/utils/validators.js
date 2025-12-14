// ========================================
// SISTEMA DE VALIDACIÓN CENTRALIZADO
// ========================================

/**
 * Valida campos requeridos
 * @param {Object} data - Datos a validar
 * @param {Array} requiredFields - Campos requeridos
 * @returns {Array} - Array de errores
 */
function validateRequired(data, requiredFields) {
  const errors = []

  for (const field of requiredFields) {
    if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
      errors.push(`El campo ${field} es requerido`)
    }
  }

  return errors
}

/**
 * Valida formato de email
 * @param {string} email - Email a validar
 * @returns {boolean}
 */
function isValidEmail(email) {
  if (!email) return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Valida longitud de string
 * @param {string} str - String a validar
 * @param {number} min - Longitud mínima
 * @param {number} max - Longitud máxima
 * @returns {boolean}
 */
function isValidLength(str, min, max = Infinity) {
  if (!str) return false
  const length = str.trim().length
  return length >= min && length <= max
}

/**
 * Valida username
 * - Entre 3 y 20 caracteres
 * - Solo letras, números, guiones y guiones bajos
 * @param {string} username
 * @returns {Object} - {valid: boolean, error: string}
 */
function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'El nombre de usuario es requerido' }
  }

  const trimmed = username.trim()

  if (trimmed.length < 3 || trimmed.length > 20) {
    return { valid: false, error: 'El nombre de usuario debe tener entre 3 y 20 caracteres' }
  }

  const usernameRegex = /^[a-zA-Z0-9_-]+$/
  if (!usernameRegex.test(trimmed)) {
    return { valid: false, error: 'El nombre de usuario solo puede contener letras, números, guiones y guiones bajos' }
  }

  return { valid: true }
}

/**
 * Valida email
 * @param {string} email
 * @returns {Object} - {valid: boolean, error: string}
 */
function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'El email es requerido' }
  }

  const trimmed = email.trim()

  if (!isValidEmail(trimmed)) {
    return { valid: false, error: 'El formato del email no es válido' }
  }

  if (trimmed.length > 255) {
    return { valid: false, error: 'El email es demasiado largo' }
  }

  return { valid: true }
}

/**
 * Valida password
 * - Mínimo 6 caracteres
 * - Máximo 100 caracteres
 * @param {string} password
 * @returns {Object} - {valid: boolean, error: string}
 */
function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'La contraseña es requerida' }
  }

  if (password.length < 6) {
    return { valid: false, error: 'La contraseña debe tener al menos 6 caracteres' }
  }

  if (password.length > 100) {
    return { valid: false, error: 'La contraseña es demasiado larga (máximo 100 caracteres)' }
  }

  return { valid: true }
}

/**
 * Valida que dos contraseñas coincidan
 * @param {string} password
 * @param {string} confirmPassword
 * @returns {Object} - {valid: boolean, error: string}
 */
function validatePasswordMatch(password, confirmPassword) {
  if (password !== confirmPassword) {
    return { valid: false, error: 'Las contraseñas no coinciden' }
  }

  return { valid: true }
}

/**
 * Valida datos de registro de usuario
 * @param {Object} data - {username, email, password, confirmPassword}
 * @returns {Object} - {valid: boolean, errors: Array}
 */
function validateRegistration(data) {
  const errors = []

  // Validar campos requeridos
  const required = validateRequired(data, ['username', 'email', 'password', 'confirmPassword'])
  if (required.length > 0) {
    return { valid: false, errors: required }
  }

  // Validar username
  const usernameValidation = validateUsername(data.username)
  if (!usernameValidation.valid) {
    errors.push(usernameValidation.error)
  }

  // Validar email
  const emailValidation = validateEmail(data.email)
  if (!emailValidation.valid) {
    errors.push(emailValidation.error)
  }

  // Validar password
  const passwordValidation = validatePassword(data.password)
  if (!passwordValidation.valid) {
    errors.push(passwordValidation.error)
  }

  // Validar que las contraseñas coincidan
  const passwordMatchValidation = validatePasswordMatch(data.password, data.confirmPassword)
  if (!passwordMatchValidation.valid) {
    errors.push(passwordMatchValidation.error)
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Valida datos de login
 * @param {Object} data - {identifier, password}
 * @returns {Object} - {valid: boolean, errors: Array}
 */
function validateLogin(data) {
  const errors = []

  if (!data.identifier || data.identifier.trim() === '') {
    errors.push('El nombre de usuario o email es requerido')
  }

  if (!data.password || data.password.trim() === '') {
    errors.push('La contraseña es requerida')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Valida datos de repisa
 * @param {Object} data - {name, category, isPrivate}
 * @returns {Object} - {valid: boolean, errors: Array}
 */
function validateShelf(data) {
  const errors = []

  // Validar nombre
  if (!data.name || data.name.trim() === '') {
    errors.push('El nombre de la repisa es requerido')
  } else if (data.name.trim().length < 2) {
    errors.push('El nombre de la repisa debe tener al menos 2 caracteres')
  } else if (data.name.trim().length > 100) {
    errors.push('El nombre de la repisa es demasiado largo (máximo 100 caracteres)')
  }

  // Validar categoría
  const validCategories = ['movies', 'series', 'books', 'podcasts', 'music', 'games']
  if (!data.category || !validCategories.includes(data.category)) {
    errors.push('Categoría no válida')
  }

  // Validar isPrivate (opcional, pero si existe debe ser boolean)
  if (data.isPrivate !== undefined && typeof data.isPrivate !== 'boolean') {
    errors.push('El valor de privacidad no es válido')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Valida datos de post
 * @param {Object} data - {content, postType}
 * @returns {Object} - {valid: boolean, errors: Array}
 */
function validatePost(data) {
  const errors = []

  // Validar contenido
  if (!data.content || data.content.trim() === '') {
    errors.push('El contenido del post no puede estar vacío')
  } else if (data.content.trim().length > 5000) {
    errors.push('El contenido del post es demasiado largo (máximo 5000 caracteres)')
  }

  // Validar tipo de post
  const validTypes = ['text', 'shelf']
  if (data.postType && !validTypes.includes(data.postType)) {
    errors.push('Tipo de post no válido')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Valida datos de comentario
 * @param {Object} data - {content}
 * @returns {Object} - {valid: boolean, errors: Array}
 */
function validateComment(data) {
  const errors = []

  if (!data.content || data.content.trim() === '') {
    errors.push('El comentario no puede estar vacío')
  } else if (data.content.trim().length > 1000) {
    errors.push('El comentario es demasiado largo (máximo 1000 caracteres)')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Valida rating (1-10)
 * @param {number} rating
 * @returns {Object} - {valid: boolean, error: string}
 */
function validateRating(rating) {
  const numRating = Number(rating)

  if (isNaN(numRating)) {
    return { valid: false, error: 'La calificación debe ser un número' }
  }

  if (!Number.isInteger(numRating)) {
    return { valid: false, error: 'La calificación debe ser un número entero' }
  }

  if (numRating < 1 || numRating > 10) {
    return { valid: false, error: 'La calificación debe estar entre 1 y 10' }
  }

  return { valid: true }
}

/**
 * Sanitiza string (elimina espacios y caracteres peligrosos)
 * @param {string} str
 * @returns {string}
 */
function sanitizeString(str) {
  if (!str || typeof str !== 'string') return ''

  return str
    .trim()
    .replace(/[<>]/g, '') // Eliminar < y > para prevenir XSS básico
}

/**
 * Valida ID (debe ser número entero positivo)
 * @param {*} id
 * @returns {Object} - {valid: boolean, error: string}
 */
function validateId(id) {
  const numId = Number(id)

  if (isNaN(numId)) {
    return { valid: false, error: 'ID no válido' }
  }

  if (!Number.isInteger(numId) || numId <= 0) {
    return { valid: false, error: 'ID debe ser un número entero positivo' }
  }

  return { valid: true, id: numId }
}

/**
 * Valida datos de mensaje de chat
 * @param {Object} data - {content}
 * @returns {Object} - {valid: boolean, errors: Array}
 */
function validateChatMessage(data) {
  const errors = []

  if (!data.content || data.content.trim() === '') {
    errors.push('El mensaje no puede estar vacío')
  } else if (data.content.trim().length > 2000) {
    errors.push('El mensaje es demasiado largo (máximo 2000 caracteres)')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

module.exports = {
  validateRequired,
  isValidEmail,
  isValidLength,
  validateUsername,
  validateEmail,
  validatePassword,
  validatePasswordMatch,
  validateRegistration,
  validateLogin,
  validateShelf,
  validatePost,
  validateComment,
  validateRating,
  validateId,
  validateChatMessage,
  sanitizeString
}
