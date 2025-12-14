// ========================================
// TESTS DE ERROR HANDLER
// ========================================

const {
  ValidationError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  asyncHandler
} = require('../../src/middlewares/errorHandler')

describe('Error Classes', () => {
  describe('ValidationError', () => {
    test('debe crear error con un solo mensaje', () => {
      const error = new ValidationError('Error de validación')
      expect(error.name).toBe('ValidationError')
      expect(error.errors).toEqual(['Error de validación'])
      expect(error.statusCode).toBe(400)
    })

    test('debe crear error con múltiples mensajes', () => {
      const errors = ['Error 1', 'Error 2', 'Error 3']
      const error = new ValidationError(errors)
      expect(error.errors).toEqual(errors)
      expect(error.statusCode).toBe(400)
    })
  })

  describe('AuthenticationError', () => {
    test('debe crear error de autenticación con mensaje por defecto', () => {
      const error = new AuthenticationError()
      expect(error.name).toBe('AuthenticationError')
      expect(error.message).toBe('No autorizado')
      expect(error.statusCode).toBe(401)
    })

    test('debe crear error de autenticación con mensaje personalizado', () => {
      const error = new AuthenticationError('Sesión expirada')
      expect(error.message).toBe('Sesión expirada')
      expect(error.statusCode).toBe(401)
    })
  })

  describe('ForbiddenError', () => {
    test('debe crear error de permisos con mensaje por defecto', () => {
      const error = new ForbiddenError()
      expect(error.name).toBe('ForbiddenError')
      expect(error.message).toBe('Acceso denegado')
      expect(error.statusCode).toBe(403)
    })

    test('debe crear error de permisos con mensaje personalizado', () => {
      const error = new ForbiddenError('No tienes permisos')
      expect(error.message).toBe('No tienes permisos')
      expect(error.statusCode).toBe(403)
    })
  })

  describe('NotFoundError', () => {
    test('debe crear error 404 con mensaje por defecto', () => {
      const error = new NotFoundError()
      expect(error.name).toBe('NotFoundError')
      expect(error.message).toBe('Recurso no encontrado')
      expect(error.statusCode).toBe(404)
    })

    test('debe crear error 404 con mensaje personalizado', () => {
      const error = new NotFoundError('Usuario no encontrado')
      expect(error.message).toBe('Usuario no encontrado')
      expect(error.statusCode).toBe(404)
    })
  })
})

describe('asyncHandler', () => {
  test('debe llamar a next con error si la función falla', async () => {
    const testError = new Error('Test error')
    const asyncFn = async () => {
      throw testError
    }

    const next = jest.fn()
    const req = {}
    const res = {}

    const handler = asyncHandler(asyncFn)
    await handler(req, res, next)

    expect(next).toHaveBeenCalledWith(testError)
  })

  test('debe ejecutar la función correctamente si no hay error', async () => {
    const asyncFn = jest.fn(async (req, res) => {
      res.status(200).send('OK')
    })

    const next = jest.fn()
    const req = {}
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn()
    }

    const handler = asyncHandler(asyncFn)
    await handler(req, res, next)

    expect(asyncFn).toHaveBeenCalled()
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.send).toHaveBeenCalledWith('OK')
  })

  test('debe manejar funciones que retornan promesas rechazadas', async () => {
    const testError = new Error('Promise rejected')
    const asyncFn = () => Promise.reject(testError)

    const next = jest.fn()
    const req = {}
    const res = {}

    const handler = asyncHandler(asyncFn)
    await handler(req, res, next)

    expect(next).toHaveBeenCalledWith(testError)
  })
})
