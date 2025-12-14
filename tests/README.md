# Tests - Shelfie

Este directorio contiene los tests automatizados para la aplicación Shelfie.

## Estructura

```
tests/
├── unit/              # Tests unitarios
│   ├── validators.test.js
│   └── errorHandler.test.js
└── README.md
```

## Ejecutar Tests

### Todos los tests con cobertura
```bash
npm test
```

### Tests en modo watch (desarrollo)
```bash
npm run test:watch
```

### Solo tests unitarios
```bash
npm run test:unit
```

## Cobertura de Tests

Los tests actuales cubren:

### 1. Validadores (`validators.test.js`)
- ✓ Validación de username
- ✓ Validación de email
- ✓ Validación de password
- ✓ Validación de coincidencia de passwords
- ✓ Validación de registro completo
- ✓ Validación de login
- ✓ Validación de repisas
- ✓ Validación de posts
- ✓ Validación de comentarios
- ✓ Validación de ratings (1-10)
- ✓ Validación de IDs
- ✓ Sanitización de strings

### 2. Manejo de Errores (`errorHandler.test.js`)
- ✓ ValidationError
- ✓ AuthenticationError
- ✓ ForbiddenError
- ✓ NotFoundError
- ✓ asyncHandler para manejo de errores asíncronos

## Agregar Nuevos Tests

Para agregar nuevos tests:

1. Crear archivo en el directorio correspondiente (`unit/` o `integration/`)
2. Nombrar el archivo con el patrón `*.test.js`
3. Usar la estructura de Jest:

```javascript
describe('Descripción del módulo', () => {
  test('debe hacer algo específico', () => {
    // Arrange
    const input = 'test'

    // Act
    const result = functionToTest(input)

    // Assert
    expect(result).toBe('expected')
  })
})
```

## Mejores Prácticas

1. **Arrange-Act-Assert**: Organizar tests en tres secciones claras
2. **Un concepto por test**: Cada test debe verificar una sola cosa
3. **Nombres descriptivos**: Los nombres deben explicar qué se está probando
4. **Aislamiento**: Los tests no deben depender unos de otros
5. **Cobertura**: Apuntar a >80% de cobertura de código

## Pendientes

Tests que se pueden agregar en el futuro:

- [ ] Tests de integración para controladores
- [ ] Tests de servicios (userService, shelfService, etc.)
- [ ] Tests de modelos de Sequelize
- [ ] Tests de endpoints API (usando supertest)
- [ ] Tests de autenticación y sesiones
- [ ] Tests de Socket.io (chat en tiempo real)

## Herramientas

- **Jest**: Framework de testing
- **Coverage**: Reportes de cobertura de código

## Recursos

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](https://testingjavascript.com/)
