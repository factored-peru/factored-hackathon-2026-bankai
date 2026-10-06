# Frontend

Esta carpeta es propietaria de la experiencia web cliente y backoffice.
La decisión normativa de stack y entrega vive en
`../../docs/adr/0021-frontend-app-hosting-delivery.md`.

Handoff de desbloqueo Auth/CORS/smoke (P0-16–20 / P0-22 / P0-38):
`../../docs/handoffs/frontend-auth-smoke-p0-16-22-38.md`.

- Runtime: Next.js con React y TypeScript.
- Estilos: Tailwind CSS.
- Identidad: Firebase Auth; el ID token se entrega al backend en cada llamada
  protegida.
- Hosting: Firebase App Hosting.

El frontend no consulta BigQuery, GCS, Firestore ni Valkey directamente. Solo
consume la API autorizada de `app/backend/` y muestra evidencia, estado de caso
y acciones permitidas por el control plane.

## Contrato de integración backend

Mientras se crea el scaffold, el cliente puede implementar contra
`../backend/specs/openapi.json` y `../backend/specs/asyncapi.json`. El flujo demo
es `GET /v1/demo/actors` → `POST /v1/demo/sessions` → `GET /v1/me` → WebSocket
`/v1/realtime`. El socket recibe snapshots y eventos incrementales; ante cierre,
el cliente debe reconectar y obtener `GET /v1/conversations/{threadId}`. En
local debe correr en el puerto 3001 y usar `credentials: "include"`; el backend
demo corre en `localhost:3000` y documenta los aliases e IDs sintéticos en su
README.

El navegador nunca recibe `customer_id`, SQL, referencias GCS internas ni datos
sin sanear. Las cargas de imagen/audio se realizan por la URL autorizada de
`POST /v1/uploads`, nunca por WebSocket. Backoffice usa su alias demo y sólo
muestra trazabilidad entregada por la API.

## Guía de invocación

**Estado actual: no hay `package.json`, lockfile, código Next.js ni configuración
de Firebase App Hosting en esta carpeta.** Por tanto, no hay comando ejecutable
de instalación, desarrollo, build o despliegue todavía. La tarea de scaffold
debe crear esas piezas y actualizar esta tabla antes de declarar la capa lista.

Una vez creado el scaffold, el contrato de operación con Bun será:

| Objetivo | Comando previsto | Condición |
| --- | --- | --- |
| Instalar dependencias | `bun install --frozen-lockfile` | Existe lockfile versionado. |
| Desarrollo | `bun run dev` | Existe el script Next.js. |
| Build de entrega | `bun run build` | Existen configuración y variables no secretas validadas. |
| Servir build | `bun run start` | El build anterior terminó correctamente. |

Firebase App Hosting entrega desde la integración de repositorio y la rama
configurada; no se usará Vercel ni un despliegue manual no aprobado. Revisa el
[CLI de Next.js](https://nextjs.org/docs/app/api-reference/cli/next) y
[Firebase App Hosting](https://firebase.google.com/docs/app-hosting) al
implementar el scaffold y su entrega.
