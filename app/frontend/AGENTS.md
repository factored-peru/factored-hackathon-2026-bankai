# AGENTS

- Usa Next.js, React, TypeScript estricto y Tailwind CSS.
- Firebase Auth solo obtiene identidad; autorización, roles y acceso a datos se
  verifican en el backend.
- No expongas secretos ni credenciales de Google en variables `NEXT_PUBLIC_*`.
- Mantén separadas las superficies cliente y operador y prueba estados de
  carga, error, autorización y escalamiento.
