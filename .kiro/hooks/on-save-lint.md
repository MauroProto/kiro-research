# Hook: Auto Lint on Save

## Trigger
- Event: File Save
- File Pattern: `*.ts`, `*.tsx`

## Action
Ejecutar linting automático cuando se guarda un archivo TypeScript.

## Configuration
```json
{
  "trigger": "onSave",
  "filePattern": ["*.ts", "*.tsx"],
  "action": "lint",
  "command": "npm run lint --fix"
}
```

## Purpose
Mantener el código limpio y consistente automáticamente.
