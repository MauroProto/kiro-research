# Hook: Run Tests on Component Change

## Trigger
- Event: File Save
- File Pattern: `web/src/components/*.tsx`

## Action
Ejecutar tests relacionados cuando se modifica un componente.

## Configuration
```json
{
  "trigger": "onSave",
  "filePattern": ["web/src/components/*.tsx"],
  "action": "test",
  "command": "npm test -- --related"
}
```

## Purpose
Asegurar que los cambios en componentes no rompan funcionalidad existente.
