# API Conventions

- All requests under `/api/v1`
- Localization via `Accept-Language: en|ar`
- Standard Response:
  - Success: `{"success": true, "message": "...", "data": {}}`
  - Error: `{"success": false, "message": "...", "errors": {}}`

### Legendary UI Feedback Rules
- NEVER use browser native alert(), confirm(), prompt().
- All toasts, modals, alerts must use the Legendary Design System, supporting RTL for Arabic.
