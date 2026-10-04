# services

Casos de uso. Orquestan dominio e integraciones sin acoplarse al transporte HTTP.

Los servicios dependen de interfaces, no de adaptadores concretos. Eso mantiene la regla de inversion de dependencias y permite reemplazar memoria por DB, cola o API externa sin tocar el caso de uso.

`private-tool-resolution.ts` recarga la sesión desde `SessionStore` justo antes
de resolver un handle; no acepta un `SessionContext` cacheado por el grafo.

`AgentControlService` coordina, pero no implementa, el flujo formal de control.
Las etapas están en `control-plane/`: `AgentInputStage`, `AgentDecisionStage`,
`AgentPolicyStage`, `AgentRouteStage` y `AgentResponseStage`. Esta composición
mantiene la secuencia sesión → normalización en backend → firewall de privacidad
determinista del backend → prompt sin PII → guardrail
sobre el último mensaje minimizado → Jev domain gate →
out_of_domain/clarify o decisión → policy → ruta → recuperación/tool →
generación → reemplazo validado → respuesta.

Los handlers de ruta viven en `control-plane/routes/` y son intercambiables.
Los datos autorizados se desidentifican antes de generar, y el reemplazo de
tokens se valida antes del guardrail final. La decisión y la generación usan
puertos separados para evitar que un proveedor de router quede acoplado a la
respuesta.

La prueba de comportamiento determinista está en
`tests/behavioral-flow.test.ts`. El proveedor regex de privacidad es solo un
adaptador de prueba/MVP; Sensitive Data Protection debe conectarse detrás de
`ContentPrivacyProvider`. Google Model Armor ya tiene adaptador detrás de
`GuardrailProvider` (`integrations/providers/model-armor-guardrail-provider.ts`,
creado con `createGuardrailProvider`): cualquier `MATCH_FOUND` bloquea y
cualquier fallo, timeout o invocación parcial es `FAILURE`/`block`. Aún falta
el composition root que lo inyecte en `AgentControlService`.

Jev se consume como decisión estructurada y versionada. Su dominio, confianza y
route hint solo orientan el flujo; la autorización continúa en `PolicyEngine`.
Las solicitudes fuera de dominio terminan con una plantilla segura y las
solicitudes ambiguas crean una aclaración durable sin ejecutar RAG, tools o
generación.

- `ports/` contiene interfaces para modelos, guardrails, policy, tools,
  retrieval, workflows, idempotencia y auditoría.
- `control-plane/` implementa el orden de mediación y los presupuestos.
- `tools/` valida registry, argumentos, capability, policy, timeout, output e
  idempotencia antes y después de ejecutar.
- `workflows/` persiste propuestas y revalida aprobaciones al reanudar.
- `retrieval/`, `data/` y `disclosure/` aplican aislamiento, contratos cerrados
  y minimización.
