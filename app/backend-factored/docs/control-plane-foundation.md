# Control plane foundation

Esta foundation convierte las recomendaciones en contratos y
casos de uso internos. Los ADR siguen siendo la autoridad normativa. No habilita
endpoints agentic, proveedores externos ni persistencia durable por sí sola.

## Dependencias por capa

```text
http -> services -> domain
         ^            ^
         |            |
      integrations ---+
```

- `domain` contiene schemas y estados puros.
- `services/ports` contiene interfaces que los casos de uso consumen.
- `services` aplica orden, autorización, presupuestos y fallo cerrado.
- `integrations` implementa puertos; ninguna integración decide autorización.
- `http` no contiene policy ni reglas del agente.

La suite `tests/architecture.test.ts` protege estas direcciones. El comando
`bun run agent:matrix -- --all` ejecuta una matriz determinista de escenarios
de seguridad sin llamar proveedores externos.

## Flujo implementado

```text
sesión actual
  -> normalización y límites en backend
  -> firewall determinista de privacidad del backend
  -> guardrail de entrada sobre el último mensaje minimizado
  -> DecisionState mínimo
  -> Jev domain gate con prompt sin PII
       -> out_of_domain: respuesta segura terminal
       -> ambiguous: aclaración durable
       -> in_domain: modelo router con salida tipada
  -> guardrail de salida del router
  -> policy determinista
       -> DENY: detener
       -> REQUIRE_APPROVAL: persistir, no ejecutar
       -> ALLOW: ejecutar únicamente la rama seleccionada
            -> LLM directo
            -> RAG con tenant, fuentes y provenance
            -> BD mediante tool autorizada
            -> Reject
  -> recuperación si la ruta RAG la requiere
  -> disclosure policy determinista del backend sobre resultados privados
  -> desidentificación del contexto de generación
  -> generación con tokens de reemplazo
  -> validación de tokens y ausencia de PII cruda
  -> reemplazo con valores autorizados y transformados
  -> sanitización final
  -> auditoría sin contenido
```

La secuencia se prueba en `tests/behavioral-flow.test.ts` con adaptadores
deterministas. El guardrail de entrada recibe la proyección minimizada;
Jev, el router LLM y el modelo de respuesta reciben únicamente la proyección
desidentificada. La recuperación RAG ocurre después de la ruta tipada, y la
resolución de handles de BD recarga la sesión justo antes de ejecutar.

La matriz `bun run agent:matrix -- --all` materializa esta misma secuencia como
una traza vertical por escenario. Muestra el `filter_match_state` separado de
`invocation_result`, el filtro tenant y la provenance de RAG, la resolución
tardía del handle, el disclosure, el contexto de generación y el reemplazo
validado. Sus estados de Jev, Model Armor, HITL y checkpointer son fixtures
sintéticos hasta conectar los proveedores reales; no ejecuta modelos de IA
localmente.

## Desacoplamiento de la secuencia

`AgentControlService` es únicamente el coordinador de etapas. La lógica está
separada para que cada frontera pueda probarse y reemplazarse mediante puertos:

- `AgentInputStage`: resuelve sesión, normaliza límites y caracteres, rechaza
  contenido codificado no inspeccionable, desidentifica el mensaje y aplica el
  guardrail de entrada sobre la proyección minimizada antes de construir
  `DecisionState`.
- `AgentDecisionStage`: ejecuta Jev, invoca el modelo de decisión, valida el
  resultado tipado y normaliza compatibilidad histórica (`respond`/`tool`) a
  rutas explícitas. Jev puede terminar en `out_of_domain` o `clarify` según
  dominio y confianza; nunca autoriza una tool.
- `AgentPolicyStage`: evalúa policy y separa `DENY`, `REQUIRE_APPROVAL` y
  `ALLOW`; no ejecuta herramientas.
- `AgentRouteStage`: despacha solo la ruta autorizada a handlers independientes
  de LLM, RAG, base de datos, reject, aclaración u `out_of_domain`.
- `AgentResponseStage`: aplica disclosure policy determinista del backend,
  prepara contexto sin PII,
  genera, valida/reemplaza tokens y ejecuta el guardrail de respuesta final.

Los modelos de decisión y generación usan interfaces distintas
(`DecisionModelProvider` y `ResponseGenerator`). `ModelProvider` permanece como
forma de compatibilidad durante la migración. Asimismo, privacidad de prompt y
privacidad de generación son servicios distintos; `ResponsePrivacyService` es
solo una fachada temporal para consumidores antiguos.

La indisponibilidad o respuesta inválida de Jev falla cerrado antes del router.
Una señal de baja confianza genera aclaración; no se fuerza una clasificación ni
se habilita una ruta privilegiada por fallback.

El reemplazo final no restaura valores privados crudos. Solo acepta tokens
emitidos durante la misma ejecución y utiliza sus representaciones autorizadas
(por ejemplo, `[EMAIL_REDACTED]`). Un token desconocido, un valor sensible
literal o un fallo del guardrail final bloquea la respuesta.

Los adaptadores no disponibles fallan cerrado. `SKIPPED` o `FAILURE` no se
convierten en `ALLOW`. Los stores en memoria sirven para pruebas y desarrollo;
no sustituyen PostgreSQL durable.

## Especificación funcional y matemática

Esta sección expresa el control plane como una composición de funciones
parciales. Describe el comportamiento implementado sin convertir los
proveedores probabilísticos en funciones deterministas. Cuando una función no
puede garantizar su contrato devuelve ⊥, que representa fallo cerrado.

### Dominios y valores especiales

```text
Q  = AgentRequest
S  = SessionContext
M  = mensaje original
N  = mensaje normalizado
P  = prompt desidentificado
D  = DecisionState
J  = DecisionSignal de Jev
V  = ModelDecision
R  = NormalizedRoute
A  = PolicyDecision
E  = RouteExecutionResult
Y  = respuesta de texto
T  = BudgetTracker
τ  = traceId
⊥  = fallo cerrado
```

Los estados observables son:

```text
Ω = {
  completed,
  denied,
  failed,
  pending_approval,
  pending_clarification
}
```

Una función de etapa tiene la forma:

```text
f : X × T → Y ∪ {⊥}
```

Cuando consume o actualiza presupuesto:

```text
f : X × T → Y × T ∪ {⊥}
```

⊥ no significa ausencia permisiva de decisión. Significa que la etapa no puede
probar su contrato y el flujo no puede avanzar hacia una ruta privilegiada.

### Predicados globales

```text
Active(S, now) ⇔
  S ≠ ∅
  ∧ S.revokedAt = null
  ∧ ParseDate(S.expiresAt) > now

Inspectable(M) ⇔
  M ≠ ""
  ∧ |M| ≤ maxMessageLength
  ∧ noControlCharacters(M)
  ∧ noUnsupportedEncoding(M)
```

La autorización efectiva siempre es una conjunción:

```text
Authorized(S, D, J, R, A, T) ⇔
  Active(S, now)
  ∧ Valid(D)
  ∧ JevAllows(J, R)
  ∧ A.outcome = ALLOW
  ∧ CapabilitiesMatch(S, R)
  ∧ BudgetAvailable(T, R)

JevAllows(J, R) ⇔
  J.allowedRoutes = undefined
  ∨ R.route ∈ J.allowedRoutes
```

La ausencia de allowedRoutes no convierte la señal de Jev en autorización. La
autoridad continúa en PolicyEngine, sesión, capabilities y executor.

### Capa de entrada

```text
resolveSession : SessionId × Clock → S ∪ {⊥}

resolveSession(id, now) =
  S  si SessionStore.get(id) = S ∧ Active(S, now)
  ⊥  en cualquier otro caso

normalize : M → N ∪ {⊥}

normalize(m) =
  NFKC(m)  si Inspectable(m)
  ⊥        si no Inspectable(m)
```

La privacidad del prompt genera una proyección y un registro de reemplazos
válido únicamente para la ejecución actual:

```text
deidentifyPrompt : S × N × τ → (P, ρ)

deidentifyPrompt(s, n, τ) = (p, ρ)
  p = n con datos sensibles reemplazados por tokens opacos
  ρ = {(token, safeValue, classification)}

RawPrivateValues(ρ) ∩ ExternalPromptBoundary = ∅
```

El guardrail de entrada permite avanzar únicamente cuando:

```text
InputAllowed(g) ⇔
  g.status = NO_MATCH_FOUND ∧ g.action = allow
```

La proyección mínima es:

```text
project : S × P → D ∪ {⊥}

PrivateState(S) ⊄ D
Secrets(S) ⊄ D
ResolvableSessionId(S) ⊄ D
```

La etapa completa de entrada queda definida como:

```text
Input : Q × T → (S, P, D, T) ∪ {⊥}

Input(q, t) =
  ⊥                         si ¬BudgetStep(t)
  ⊥                         si resolveSession(q.sessionId) = ⊥
  ⊥                         si normalize(q.message) = ⊥
  ⊥                         si InputAllowed(inputGuardrail(p, q.traceId)) = false
  (s, p, project(s, p), t') en otro caso
```

AgentInputStage implementa esta función y no construye un DecisionState si el
guardrail de entrada no permite continuar.

### Capa Jev y decisión de ruta

```text
jev : P × D × τ → J ∪ {⊥}

J = (
  domain,
  routeHint,
  allowedRoutes?,
  domainConfidence,
  routeConfidence,
  riskLevel,
  evidenceSufficient,
  requiresEscalation,
  modelVersion
)

θdomain = 0.85
θroute  = 0.85
```

El gate actual es:

```text
domainGate(J) =
  out_of_domain  si J.domain = out_of_domain
                  ∧ J.domainConfidence ≥ θdomain

  clarify        si J.domain = ambiguous
                  ∨ J.domainConfidence < θdomain
                  ∨ (J.routeHint = clarify
                     ∧ J.routeConfidence ≥ θroute)

  continue       en otro caso
```

Sus efectos son:

```text
domainGate(J) = out_of_domain
  ⇒ RouterInvoked = false ∧ ToolsInvoked = false ∧ SafeResponse = true

domainGate(J) = clarify
  ⇒ RouterInvoked = false ∧ ToolsInvoked = false ∧ WorkflowPersisted = true

domainGate(J) = continue
  ⇒ RouterInvoked = true
```

Jev no selecciona directamente rag, database o llm. En continue, el router
propone la decisión concreta:

```text
router : P × D × τ → V ∪ {⊥}

normalizeRoute : V → R ∪ {⊥}

normalizeRoute(v) =
  route(llm)                    si v.kind = respond o v.route = llm
  route(rag, v.query)           si v.route = rag
  route(database, v.call)      si v.kind = tool o v.route = database
  route(reject, v.reasonCode)  si v.route = reject
  route(clarify, v.question)   si v.route = clarify
  route(out_of_domain, v.key)  si v.route = out_of_domain
  ⊥                             si schema inválido

routeCompatible : J × R → R ∪ {⊥}

routeCompatible(J, r) =
  r  si JevAllows(J, r)
  ⊥  en otro caso
```

routeHint = rag, database o llm es una señal de orientación. No sustituye la
decisión estructurada del router. En el estado actual, routeHint = reject
tampoco fuerza por sí mismo la ruta reject; un rechazo debe ser propuesto por
el router o producido por una policy.

La etapa completa de decisión es:

```text
Decision : (S, P, D, τ, T) → (S, P, D, J, V, R, T) ∪ {⊥}

Decision(x) =
  ⊥                    si jev(P, D, τ) = ⊥
  (x, J, out_of_domain) si domainGate(J) = out_of_domain
  (x, J, clarify)       si domainGate(J) = clarify
  ⊥                    si router(P, D, τ) = ⊥
  ⊥                    si routerGuardrail(V) ≠ allow
  ⊥                    si normalizeRoute(V) = ⊥
  ⊥                    si routeCompatible(J, R) = ⊥
  (x, J, V, R, T')      en otro caso
```

### Capa de policy y autorización

```text
policy : S × D × V × J → A ∪ {⊥}

A.outcome ∈ {ALLOW, DENY, REQUIRE_APPROVAL}

policyStage(S, D, V, J) =
  denied(A)            si A.outcome = DENY
  pending_approval(A)  si A.outcome = REQUIRE_APPROVAL
                         ∧ R.route = database
  ⊥                    si A.outcome = REQUIRE_APPROVAL
                         ∧ R.route ≠ database
  authorizedContext    si A.outcome = ALLOW
```

ALLOW no significa que una tool ya se ejecutó. Solo permite pasar al handler;
la ejecución todavía requiere schemas, capabilities, sesión, idempotencia y
presupuesto.

### Capa de ejecución de rutas

```text
dispatch : R × AuthorizedContext × T → E ∪ {⊥}
```

Las rutas se formalizan así:

```text
executeLLM(c, t) =
  ready(kind = llm)  si c.route.route = llm
  ⊥                  en otro caso

executeRAG(s, r, τ, t) =
  ⊥                si r.route ≠ rag
  ⊥                si sanitizeQuery(r.query) = ⊥
  ⊥                si falla tenant/source filter
  ⊥                si falla guardrail de contenido recuperado
  ready(evidence)  si chunks y provenance son válidos

executeDatabase(s, r, a, τ, t) =
  ⊥                si r.route ≠ database
  ⊥                si ToolRegistry no reconoce r.call
  ⊥                si ¬CapabilitiesMatch(s, r)
  ⊥                si resolveHandle(s, r.call) = ⊥
  ⊥                si falla idempotencia o timeout
  ready(output)    si output schema es válido
```

La evidencia RAG debe cumplir:

```text
Tenant(chunk) = Tenant(s)
∧ Source(chunk) ∈ AllowedSources(Q)
∧ Classification(chunk) ∈ {public, internal}
∧ Provenance(chunk) ≠ ∅
```

La resolución de datos privados es tardía:

```text
resolveHandle : CurrentSession × OpaqueHandle × Audience
                → PrivateValue ∪ {⊥}
```

El modelo solo propone el handle opaco. El valor privado se completa en el
backend inmediatamente antes del tool call.

Las rutas no generativas son:

```text
executeReject(r)       = denied(r.reasonCode)
executeClarify(r)      = persistWorkflow(r) → pending_clarification
executeOutOfDomain(r)  = safeResponse(r.responseKey)
```

Ninguna de estas rutas ejecuta una tool.

### Capa de disclosure, generación y respuesta

La disclosure autoriza campos; no sustituye la detección técnica de PII:

```text
disclose : S × Purpose × Value → AuthorizedValue ∪ {⊥}
prepareGeneration : S × AuthorizedValue × τ → (C, ρg) ∪ {⊥}
generate : P × D × C × τ → Draft ∪ {⊥}
```

El reemplazo solo utiliza tokens emitidos durante la misma ejecución:

```text
replaceValidated : Draft × ρg → Y ∪ {⊥}

replaceValidated(draft, ρg) =
  ⊥                              si existe token no registrado
  ⊥                              si el draft contiene PII no registrada
  replace(draft, safeValues(ρg)) en otro caso
```

El guardrail final es:

```text
finalGuardrail : Y × τ → Y ∪ {⊥}

finalGuardrail(y, τ) =
  y  si status = NO_MATCH_FOUND ∧ action = allow
  ⊥  en otro caso
```

La respuesta completa es:

```text
Response : (S, P, D, R, A, E, τ, T) → Y × T ∪ {⊥}

Response(c) =
  ⊥        si disclose(E) = ⊥
  ⊥        si prepareGeneration(...) = ⊥
  ⊥        si generate(...) = ⊥
  ⊥        si replaceValidated(...) = ⊥
  ⊥        si finalGuardrail(...) = ⊥
  (y, T')   en otro caso
```

### Composición total e invariantes

```text
AgentControl : Q → Ω

AgentControl(q) =
  failed                 si Input(q) = ⊥
  completed              si Decision(q) = out_of_domain
                            ∧ finalGuardrail(safeResponse) ≠ ⊥
  pending_clarification  si Decision(q) = clarify
  failed                 si Decision(q) = ⊥
  denied                 si Policy(q) = DENY
  pending_approval       si Policy(q) = REQUIRE_APPROVAL
  failed                 si Route(q) = ⊥
  completed              si Response(q) ≠ ⊥
  failed                 en otro caso
```

Las propiedades que deben conservarse son:

```text
P ∩ RawPrivateValues = ∅
ToolExecuted ⇒ Policy = ALLOW
ToolExecuted ⇒ CurrentSessionRevalidated = true
ResponseReleased ⇒ FinalGuardrail = allow
UnknownReplacementToken ⇒ ResponseReleased = false
JevFailure ⇒ RouterInvoked = false
GuardrailFailure ⇒ ResponseReleased = false
PolicyDenied ⇒ ToolExecuted = false
ApprovalPending ⇒ ToolExecuted = false
```

SafeAuditEvent registra únicamente hashes, versiones, reason codes y metadatos;
no requiere mensaje crudo, PII, secretos, cookies ni resultados completos.

## Determinismo, guardrails y confiabilidad agentic

Esta sección extrae exclusivamente la capa de determinismo y control definida
en `TO-CHECK.md`. Su objetivo no es hacer determinista al LLM, sino encapsular
su variabilidad dentro de fronteras verificables:

```text
entrada controlada
  -> decisión estructurada
  -> autorización determinista
  -> ejecución mediada
  -> respuesta validada
```

El modelo no tiene autoridad directa sobre herramientas, SQL, datos privados ni
efectos laterales. La autoridad efectiva está en el código, la sesión, el
`PolicyEngine`, los schemas y el executor.

### Fuentes de no determinismo y controles

| Fuente                                  | Control aplicado por la foundation                         |
| --------------------------------------- | ---------------------------------------------------------- |
| Sampling o cambio de versión del modelo | salida estructurada, schema versionado, guardrail y policy |
| Selección incorrecta de una tool        | registry estático, allowlist y capability actual           |
| Interpretación ambigua                  | Jev, umbrales de confianza y `clarify`                     |
| Estado o contexto incompleto            | `DecisionState` validado y presupuesto explícito           |
| Resultados externos variables           | provenance, schemas de salida y conciliación               |
| Reintentos que duplican acciones        | idempotency key y `IdempotencyStore`                       |
| Concurrencia                            | claims `in_progress`, `conflict` y consumo único           |
| Sesión modificada durante el flujo      | recarga server-side y validación de `sessionVersion`       |
| Datos privados incorrectos              | resolución tardía contra la sesión actual                  |
| Ejecución excesiva                      | `BudgetTracker`, timeout y límites de tokens/chunks        |

### Controles antes del modelo

La entrada cruza las siguientes fronteras antes de llegar a Jev o al router:

```text
SessionStore
  -> normalizeUserMessage
  -> PromptPrivacyService
  -> GuardrailProvider
  -> DecisionProjector
  -> DecisionSignalProvider
  -> DecisionModelProvider
```

- `SessionStore` exige sesión activa, no revocada y no expirada.
- `normalizeUserMessage` aplica Unicode NFKC, límites de tamaño y rechazo de
  contenido no válido o codificado que el guardrail no pueda inspeccionar.
- `PromptPrivacyService` desidentifica PII antes de cualquier boundary externo.
- `GuardrailProvider` inspecciona únicamente el último mensaje minimizado, no el
  historial completo ni el system prompt.
- `DecisionProjector` construye un `DecisionState` mínimo y validado.
- La proyección contiene intención, rol abstracto, tenant scope, riesgo,
  capabilities necesarias, handles opacos y provenance; no contiene secretos ni
  valores privados completos.
- `DecisionSignalProvider` representa Jev. Su señal orienta dominio, ruta y
  confianza, pero no autoriza una operación.
- La sesión, el tenant y las capabilities se vuelven a validar antes de cada
  tool call; el modelo solo puede proponer referencias opacas.

La foundation no usa actualmente GLiNER2, Liquid ni otro router externo. Esas
opciones pueden incorporarse detrás de los puertos existentes, pero no forman
parte del camino crítico implementado.

### Controles después del modelo

La decisión del modelo pasa por controles cerrados antes de seleccionar una
ruta o ejecutar una herramienta:

```text
DecisionModelProvider
  -> GuardrailProvider
  -> modelDecisionSchema
  -> normalizeRoute
  -> PolicyEngine
  -> AgentRouteStage
```

- El modelo devuelve una unión estructurada validada con Zod.
- Los campos adicionales, nombres de tools desconocidos y decisiones inválidas
  se rechazan.
- `AgentDecisionStage` verifica que la ruta propuesta no contradiga las rutas
  permitidas por Jev.
- `PolicyEngine` es la autoridad para `ALLOW`, `DENY` y
  `REQUIRE_APPROVAL`.
- El texto libre nunca se interpreta como comando.
- `QueryPlan` es allowlisted; no existe entrada SQL libre desde el modelo.
- Las consultas de datos deben ser read-only cuando la operación lo requiera y
  respetar tenant, límites de filas, chunks, tokens, costo y tiempo.
- El resultado de una tool se valida contra su output schema antes de continuar.
- `DisclosureService` decide qué campos pueden pasar a generación.
- El contexto de generación se desidentifica y los tokens se validan antes de
  restaurar representaciones autorizadas.
- El guardrail final bloquea la respuesta si detecta contenido prohibido o si la
  sanitización falla.

### Ejecución segura

| Control                                                    | Estado actual                                                                 |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Idempotency keys                                           | Implementado mediante `IdempotencyStore`                                      |
| Registry estático de tools                                 | Implementado mediante `ToolRegistry`                                          |
| Resolución server-side de handles                          | Implementado mediante `ToolArgumentResolver` y sesión actual                  |
| Validación de argumentos y resultados                      | Implementado con schemas estrictos                                            |
| Timeout de herramientas                                    | Implementado en `ToolExecutionService`                                        |
| Presupuesto de pasos, tools, LLM, retries, chunks y tiempo | Implementado en `BudgetTracker`                                               |
| Dry-run                                                    | Preparado conceptualmente; no expuesto como endpoint                          |
| Plan-before-execute                                        | Representado por decisión tipada y policy previa                              |
| Approve-before-write                                       | Foundation HITL preparada mediante `REQUIRE_APPROVAL`                         |
| Retry acotado                                              | Contador preparado; estrategia concreta pendiente                             |
| Circuit breaker                                            | Pendiente de integración                                                      |
| Compensación transaccional                                 | Pendiente de integración                                                      |
| Fallback permisivo                                         | Prohibido                                                                     |
| Escalamiento humano                                        | Representado por estados HITL y workflow                                      |
| Estados terminales explícitos                              | `completed`, `denied`, `failed`, `pending_approval` y `pending_clarification` |

La indisponibilidad de una dependencia no habilita una ruta alternativa
privilegiada. Un fallo de sesión, guardrail, Jev, schema, policy, privacidad,
tool o reconciliación termina en fallo cerrado, denegación, pausa explícita o
estado indeterminado.

### Política de autonomía

La acción permitida depende del riesgo calculado y de la policy vigente:

| Riesgo  | Acción permitida                                                      |
| ------- | --------------------------------------------------------------------- |
| Bajo    | Ejecutar automáticamente si capabilities, schema y policy son válidos |
| Medio   | Ejecutar con validación determinista y límites reforzados             |
| Alto    | Preparar la acción y solicitar aprobación humana                      |
| Crítico | Bloquear y escalar; no ejecutar automáticamente                       |

`riskLevel` no concede autorización por sí solo. La decisión final requiere
policy, sesión actual, tenant, capability, audiencia del handle, idempotencia y
validación de la herramienta.

### Casos adversariales y estados de control

La foundation debe bloquear o pausar, como mínimo, estos casos:

- prompt injection directa;
- prompt injection indirecta en contenido RAG;
- tool inventada o versión desconocida;
- schema inválido;
- Jev indisponible o con baja confianza;
- conflicto entre Jev y router;
- `DENY` de policy;
- replay de aprobación o idempotencia;
- handle de otro tenant, audiencia o versión de sesión;
- sesión rotada, revocada o expirada;
- PII cruda en generación;
- token de reemplazo desconocido;
- fallo del guardrail final;
- timeout o resultado inválido de una tool;
- ejecución duplicada o estado indeterminado después de un efecto lateral.

Los resultados de control posibles son:

```text
failed
denied
pending_clarification
pending_approval
indeterminate
```

Ninguno de estos casos puede convertirse en `ALLOW` por fallback.

### Evidencia de prueba

La matriz sintética verifica estos controles sin API keys, inferencia local ni
tráfico externo:

```bash
bun run agent:matrix -- --all
bun run agent:matrix -- --scenario direct-prompt-injection
bun test
```

Los escenarios cubren prompt injection directa e indirecta, fallo de Jev,
confianza baja, `DENY`, HITL, aislamiento de tenant, replay, rotación de
sesión, PII no registrada y fallo del guardrail final. La matriz es evidencia
determinista de la foundation; no reemplaza las pruebas de integración de los
proveedores reales.

## Mapa ADR → implementación

| ADR  | Foundation                                                                                                                             | Pendiente de integración                                                          |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 0001 | Capas, TypeScript estricto, Zod y prueba de dependencias                                                                               | Ninguno para esta etapa                                                           |
| 0002 | Fallos internos usan reason codes cerrados y no exponen proveedor                                                                      | Mapeo RFC 9457 al crear endpoints                                                 |
| 0003 | Service token y rutas actuales permanecen sin cambios                                                                                  | Sustitución del endpoint demo                                                     |
| 0004 | `AgentControlService` impone el flujo y separa señal, policy y enforcement                                                             | Model Armor, Vertex, Jev y LLM reales                                             |
| 0005 | Sesión server-side, resolución tardía y disclosure antes de respuesta                                                                  | Middleware browser y endpoints de sesión                                          |
| 0006 | Capabilities se comprueban en cada tool call                                                                                           | OIDC/JWKS, cookie, CSRF y Origin                                                  |
| 0007 | Propuesta y aprobación versionadas; resume revalida y consume una vez                                                                  | Checkpointer LangGraph/PostgreSQL                                                 |
| 0008 | Registry estático, schemas estrictos, timeout, output e idempotencia                                                                   | Tools bancarias concretas                                                         |
| 0009 | `QueryPlan` allowlisted; no existe entrada SQL libre                                                                                   | Compilador parametrizado, Prisma y RLS                                            |
| 0010 | Clasificación de datos y puertos separados por proveedor                                                                               | Registro operativo de región/retención/DPA                                        |
| 0011 | Tenant y fuentes se inyectan server-side; provenance es obligatoria                                                                    | Qdrant y estrategia de shards                                                     |
| 0012 | `SafeAuditEvent` solo admite metadata; schema estricto                                                                                 | OpenTelemetry y exportadores                                                      |
| 0013 | `BudgetTracker` limita pasos, tools, LLM, retries, chunks, tokens y tiempo                                                             | Medición de tokens/costos del proveedor                                           |
| 0014 | Puertos para rate limiting; no se agregan fetchers genéricos                                                                           | Hooks CORS/CSRF/headers/egress al crear APIs                                      |
| 0015 | Pruebas deterministas de deny, aislamiento, approval, PII y tools                                                                      | Dataset probabilístico y gates CI                                                 |
| 0016 | La disclosure policy determinista del backend precede la sanitización; el firewall regex evita que PII cruda cruce la frontera externa | Templates SDP/Model Armor; un detector basado en modelo propio no está habilitado |
| 0017 | Valkey/Redis queda para sesión efímera; workflows usan un puerto separado                                                              | PostgreSQL durable                                                                |

## Reglas para extender

Agregar una tool requiere definición estática, schemas estrictos, capability,
riesgo, policy, idempotencia cuando tenga efectos, pruebas y documentación.
Agregar un proveedor requiere implementar su puerto, registrar gobierno de
datos y configurar un modo de fallo explícito. Agregar un endpoint requiere
SDD: OpenAPI primero, implementación y contract tests después.
