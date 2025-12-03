# Coding Standards

## General Rules
- Código limpio y legible
- Comentarios solo cuando sea necesario
- Nombres descriptivos para variables y funciones
- Evitar código duplicado

## TypeScript Conventions
- Usar `interface` para objetos, `type` para uniones
- Exportar tipos junto con funciones
- Usar `const` por defecto, `let` solo cuando sea necesario

## React Best Practices
- Un componente por archivo
- Props tipadas con interfaces
- Usar `useMemo` y `useCallback` para optimización
- Evitar efectos secundarios en render

## Error Handling
- Try-catch en operaciones async
- Logging de errores con `console.error`
- Mensajes de error amigables para el usuario

## Security
- No exponer API keys en el cliente
- Validar inputs del usuario
- Sanitizar outputs para prevenir XSS
