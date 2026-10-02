# AGENTS

- Determina primero si el cambio o la invocación pertenece a `backend/` o a
  `frontend/`, y lee la sección **Guía de invocación** de su `README.md` y su
  `AGENTS.md` antes de actuar.
- No ejecutes comandos desde `app/` esperando coordinar ambos procesos: sus
  dependencias, credenciales y contratos son independientes.
- El backend es la única frontera para datos y autorización; el frontend sólo
  obtiene identidad con Firebase Auth y llama a la API autorizada.
- El frontend aún no tiene `package.json`, lockfile ni configuración de App
  Hosting. No simules su despliegue ni documentes sus comandos como disponibles
  hasta que el scaffold se incorpore.
