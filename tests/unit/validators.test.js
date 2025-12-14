// ========================================
// TESTS DE VALIDADORES
// ========================================

const {
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
  sanitizeString
} = require('../../src/utils/validators')

describe('Validators - Username', () => {
  test('debe validar username correcto', () => {
    const result = validateUsername('usuario123')
    expect(result.valid).toBe(true)
  })

  test('debe rechazar username vacío', () => {
    const result = validateUsername('')
    expect(result.valid).toBe(false)
    expect(result.error).toBeDefined()
  })

  test('debe rechazar username demasiado corto', () => {
    const result = validateUsername('ab')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('3 y 20 caracteres')
  })

  test('debe rechazar username demasiado largo', () => {
    const result = validateUsername('a'.repeat(21))
    expect(result.valid).toBe(false)
    expect(result.error).toContain('3 y 20 caracteres')
  })

  test('debe rechazar username con caracteres especiales', () => {
    const result = validateUsername('usuario@123')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('letras, números, guiones')
  })

  test('debe aceptar username con guiones y guiones bajos', () => {
    const result = validateUsername('usuario_test-123')
    expect(result.valid).toBe(true)
  })
})

describe('Validators - Email', () => {
  test('debe validar email correcto', () => {
    const result = validateEmail('test@example.com')
    expect(result.valid).toBe(true)
  })

  test('debe rechazar email vacío', () => {
    const result = validateEmail('')
    expect(result.valid).toBe(false)
  })

  test('debe rechazar email sin @', () => {
    const result = validateEmail('testexample.com')
    expect(result.valid).toBe(false)
  })

  test('debe rechazar email sin dominio', () => {
    const result = validateEmail('test@')
    expect(result.valid).toBe(false)
  })

  test('debe rechazar email sin extensión', () => {
    const result = validateEmail('test@example')
    expect(result.valid).toBe(false)
  })
})

describe('Validators - Password', () => {
  test('debe validar contraseña correcta', () => {
    const result = validatePassword('password123')
    expect(result.valid).toBe(true)
  })

  test('debe rechazar contraseña vacía', () => {
    const result = validatePassword('')
    expect(result.valid).toBe(false)
  })

  test('debe rechazar contraseña demasiado corta', () => {
    const result = validatePassword('12345')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('al menos 6 caracteres')
  })

  test('debe rechazar contraseña demasiado larga', () => {
    const result = validatePassword('a'.repeat(101))
    expect(result.valid).toBe(false)
    expect(result.error).toContain('demasiado larga')
  })
})

describe('Validators - Password Match', () => {
  test('debe validar contraseñas coincidentes', () => {
    const result = validatePasswordMatch('password123', 'password123')
    expect(result.valid).toBe(true)
  })

  test('debe rechazar contraseñas que no coinciden', () => {
    const result = validatePasswordMatch('password123', 'password456')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('no coinciden')
  })
})

describe('Validators - Registration', () => {
  test('debe validar datos de registro correctos', () => {
    const data = {
      username: 'usuario123',
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123'
    }
    const result = validateRegistration(data)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  test('debe rechazar datos de registro con campos faltantes', () => {
    const data = {
      username: 'usuario123',
      email: ''
    }
    const result = validateRegistration(data)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  test('debe rechazar datos de registro con contraseñas que no coinciden', () => {
    const data = {
      username: 'usuario123',
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password456'
    }
    const result = validateRegistration(data)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Las contraseñas no coinciden')
  })
})

describe('Validators - Login', () => {
  test('debe validar datos de login correctos', () => {
    const data = {
      identifier: 'usuario123',
      password: 'password123'
    }
    const result = validateLogin(data)
    expect(result.valid).toBe(true)
  })

  test('debe rechazar login sin identifier', () => {
    const data = {
      identifier: '',
      password: 'password123'
    }
    const result = validateLogin(data)
    expect(result.valid).toBe(false)
  })

  test('debe rechazar login sin password', () => {
    const data = {
      identifier: 'usuario123',
      password: ''
    }
    const result = validateLogin(data)
    expect(result.valid).toBe(false)
  })
})

describe('Validators - Shelf', () => {
  test('debe validar datos de repisa correctos', () => {
    const data = {
      name: 'Mi Repisa',
      category: 'movies',
      isPrivate: false
    }
    const result = validateShelf(data)
    expect(result.valid).toBe(true)
  })

  test('debe rechazar repisa sin nombre', () => {
    const data = {
      name: '',
      category: 'movies'
    }
    const result = validateShelf(data)
    expect(result.valid).toBe(false)
  })

  test('debe rechazar repisa con categoría inválida', () => {
    const data = {
      name: 'Mi Repisa',
      category: 'invalid_category'
    }
    const result = validateShelf(data)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Categoría no válida')
  })

  test('debe rechazar nombre de repisa demasiado largo', () => {
    const data = {
      name: 'a'.repeat(101),
      category: 'movies'
    }
    const result = validateShelf(data)
    expect(result.valid).toBe(false)
  })
})

describe('Validators - Post', () => {
  test('debe validar post correcto', () => {
    const data = {
      content: 'Este es un post de prueba',
      postType: 'text'
    }
    const result = validatePost(data)
    expect(result.valid).toBe(true)
  })

  test('debe rechazar post vacío', () => {
    const data = {
      content: ''
    }
    const result = validatePost(data)
    expect(result.valid).toBe(false)
  })

  test('debe rechazar post demasiado largo', () => {
    const data = {
      content: 'a'.repeat(5001)
    }
    const result = validatePost(data)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('El contenido del post es demasiado largo (máximo 5000 caracteres)')
  })
})

describe('Validators - Comment', () => {
  test('debe validar comentario correcto', () => {
    const data = {
      content: 'Este es un comentario'
    }
    const result = validateComment(data)
    expect(result.valid).toBe(true)
  })

  test('debe rechazar comentario vacío', () => {
    const data = {
      content: ''
    }
    const result = validateComment(data)
    expect(result.valid).toBe(false)
  })

  test('debe rechazar comentario demasiado largo', () => {
    const data = {
      content: 'a'.repeat(1001)
    }
    const result = validateComment(data)
    expect(result.valid).toBe(false)
  })
})

describe('Validators - Rating', () => {
  test('debe validar rating válido', () => {
    for (let i = 1; i <= 10; i++) {
      const result = validateRating(i)
      expect(result.valid).toBe(true)
    }
  })

  test('debe rechazar rating fuera de rango', () => {
    expect(validateRating(0).valid).toBe(false)
    expect(validateRating(11).valid).toBe(false)
    expect(validateRating(-1).valid).toBe(false)
  })

  test('debe rechazar rating no numérico', () => {
    const result = validateRating('abc')
    expect(result.valid).toBe(false)
  })

  test('debe rechazar rating decimal', () => {
    const result = validateRating(5.5)
    expect(result.valid).toBe(false)
  })
})

describe('Validators - ID', () => {
  test('debe validar ID correcto', () => {
    const result = validateId(123)
    expect(result.valid).toBe(true)
    expect(result.id).toBe(123)
  })

  test('debe validar ID como string numérico', () => {
    const result = validateId('456')
    expect(result.valid).toBe(true)
    expect(result.id).toBe(456)
  })

  test('debe rechazar ID negativo', () => {
    const result = validateId(-1)
    expect(result.valid).toBe(false)
  })

  test('debe rechazar ID cero', () => {
    const result = validateId(0)
    expect(result.valid).toBe(false)
  })

  test('debe rechazar ID no numérico', () => {
    const result = validateId('abc')
    expect(result.valid).toBe(false)
  })
})

describe('Validators - Sanitize String', () => {
  test('debe eliminar espacios en blanco', () => {
    expect(sanitizeString('  test  ')).toBe('test')
  })

  test('debe eliminar < y >', () => {
    expect(sanitizeString('test<script>alert(1)</script>')).toBe('testscriptalert(1)/script')
  })

  test('debe manejar strings vacíos', () => {
    expect(sanitizeString('')).toBe('')
  })

  test('debe manejar valores no string', () => {
    expect(sanitizeString(null)).toBe('')
    expect(sanitizeString(undefined)).toBe('')
  })
})
