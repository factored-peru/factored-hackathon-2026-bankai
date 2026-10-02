# Frontend

Esta carpeta es propietaria de la experiencia web cliente y backoffice.

- Runtime: Next.js con React y TypeScript.
- Estilos: Tailwind CSS.
- Identidad: Firebase Auth; el ID token se entrega al backend en cada llamada
  protegida.
- Hosting: Firebase App Hosting.

El frontend no consulta BigQuery, GCS, Firestore ni Valkey directamente. Solo
consume la API autorizada de `app/backend/` y muestra evidencia, estado de caso
y acciones permitidas por el control plane.
