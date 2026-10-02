# Frontend

Esta carpeta es propietaria de la experiencia web cliente y backoffice.
La decisión normativa de stack y entrega vive en
`../../docs/adr/0021-frontend-app-hosting-delivery.md`.

- Runtime: Next.js con React y TypeScript.
- Estilos: Tailwind CSS.
- Identidad: Firebase Auth; el ID token se entrega al backend en cada llamada
  protegida.
- Hosting: Firebase App Hosting.

El frontend no consulta BigQuery, GCS, Firestore ni Valkey directamente. Solo
consume la API autorizada de `app/backend/` y muestra evidencia, estado de caso
y acciones permitidas por el control plane.

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
