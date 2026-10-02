# Aplicaciones

Esta carpeta separa dos procesos con dueños y ciclos de ejecución distintos.
Entra primero en la subcarpeta correspondiente; no hay un comando `app/*` que
ejecute ambas aplicaciones.

## Guía de invocación

| Objetivo | Directorio | Estado | Entrada |
| --- | --- | --- | --- |
| API y control plane | `backend/` | Disponible | `bun run dev` o las validaciones de su README |
| Experiencia web | `frontend/` | Scaffold pendiente | comandos Next.js/Bun previstos, aún no ejecutables |

El backend se puede iniciar localmente con su proceso Bun o junto con Valkey
mediante la composición definida en `../deploy/local/`. El frontend no debe
consultar almacenes de datos directamente: cuando exista su scaffold, consumirá
la API autenticada del backend. Consulta los README de cada subcarpeta antes de
instalar dependencias o iniciar un proceso.

La convención elegida para el frontend será Bun, coherente con el backend y
compatible con el [CLI oficial de Next.js](https://nextjs.org/docs/app/api-reference/cli/next).
