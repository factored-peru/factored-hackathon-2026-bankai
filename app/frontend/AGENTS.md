# AGENTS

- Lee `README.md`, en particular su **Guía de invocación**, antes de crear o
  ejecutar el frontend. Esta capa aún no tiene scaffold ejecutable.
- Usa Next.js, React, TypeScript estricto, Tailwind CSS y Bun como gestor de
  paquetes cuando el scaffold se incorpore.
- Firebase Auth solo obtiene identidad; autorización, roles y acceso a datos se
  verifican en el backend.
- No expongas secretos ni credenciales de Google en variables `NEXT_PUBLIC_*`.
- Mantén separadas las superficies cliente y operador y prueba estados de
  carga, error, autorización y escalamiento.
- No uses Vercel ni `firebase deploy` como atajo: la entrega autorizada es
  Firebase App Hosting mediante la configuración e infraestructura aprobadas.
- Hasta que existan `package.json`, lockfile y configuración de App Hosting, no
  presentes `bun run dev`, builds o despliegues como comandos disponibles.
