# Hook: Validate API Changes

## Trigger
- Event: File Save
- File Pattern: `web/src/app/api/**/*.ts`

## Action
Validar cambios en rutas API y verificar tipos.

## Configuration
```json
{
  "trigger": "onSave",
  "filePattern": ["web/src/app/api/**/*.ts"],
  "action": "typecheck",
  "command": "npx tsc --noEmit"
}
```

## Purpose
Detectar errores de tipos en las rutas API antes de deploy.
