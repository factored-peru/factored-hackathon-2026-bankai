Sí. **Se puede llevar a GCP y, para Factored, tiene bastante sentido usarlo como base**, pero no haría una traducción 1:1 de AWS → GCP. Conservaría la interfaz/protocolo realtime y varias ideas del Studio, pero reemplazaría el runtime y, sobre todo, **sacaría la autorización de tools del agente de voz**.

El repositorio actual tiene tres piezas especialmente aprovechables: el frontend de prueba de voz, el protocolo WebSocket/eventos y la infraestructura conceptual de evals. Además, aunque se presenta como una solución AWS, ya soporta `gemini-live` dentro del `BidiAgent`. [GitHub](https://github.com/aws-samples/sample-voice-ai-agent-studio?utm_source=chatgpt.com)

### Cómo lo llevaría a nuestra arquitectura Factored

```
                       FACTORED — VOICE EXTENSION

┌───────────────────────────────────────────────────────────────┐
│                     NEXT.JS / VERCEL                          │
│                                                               │
│ Mic → PCM 16kHz       Transcript/UI       Audio 24kHz ←       │
└──────────────────────────────┬────────────────────────────────┘
                               │ WSS
                               ▼
┌───────────────────────────────────────────────────────────────┐
│              CLOUD RUN — SINGLE ONLINE BACKEND                │
│                    FastAPI + WebSocket                        │
│                                                               │
│  ┌───────────────────── Realtime Media Plane ──────────────┐ │
│  │ Voice Session Manager                                  │ │
│  │ audio in/out · VAD events · interruption · turn IDs   │ │
│  └──────────────────────────┬──────────────────────────────┘ │
│                             │                                │
│                             ▼                                │
│             Vertex AI — Gemini Live API                      │
│          gemini-live-2.5-flash-native-audio                  │
│                             │                                │
│                 candidate function call                      │
│                             ▼                                │
│  ┌──────────────────── Control Plane ──────────────────────┐ │
│  │ transcript / intent                                    │ │
│  │        ↓                                                │ │
│  │ Model Armor + Sensitive Data Protection                │ │
│  │        ↓                                                │ │
│  │ JEV                                                    │ │
│  │ domain · intent · confidence · risk · escalation       │ │
│  │        ↓                                                │ │
│  │ Zod/Pydantic validation                                │ │
│  │        ↓                                                │ │
│  │ Deterministic Policy Engine                            │ │
│  │ ALLOW | DENY | REQUIRE_APPROVAL                        │ │
│  │        ↓                                                │ │
│  │ LangGraph                                              │ │
│  │        ↓                                                │ │
│  │ Tool Executor                                          │ │
│  └───────────────┬───────────────┬─────────────────────────┘ │
└──────────────────┼───────────────┼───────────────────────────┘
                   │               │
             SELECT-only       RAG / Policies
                   ▼               ▼
               BIGQUERY         QDRANT
                   │
                   ├──── Firestore
                   │     checkpoints / HITL / cases
                   │
                   └──── BigQuery telemetry
                         traces / evals / sanitized transcript

                      Upstash Redis
              ephemeral session / locks / routing
```

Esto conserva exactamente la separación que veníamos planteando para Factored: **media plane realtime ≠ control plane de negocio**.

### El cambio más importante respecto al repo AWS

Ahora mismo el sample permite que el `BidiAgent` reciba directamente las tools. Construye dinámicamente webhooks, Lambdas, MCP gateways y subagentes y luego se las entrega al agente. [GitHub](https://raw.githubusercontent.com/aws-samples/sample-voice-ai-agent-studio/main/source/agent/main.py)

Además usa hooks `BeforeToolCallEvent` / `AfterToolCallEvent`, pero esos hooks principalmente notifican a UI y bloquean temporalmente el audio; **no constituyen una capa determinista de autorización de negocio**. [GitHub](https://raw.githubusercontent.com/aws-samples/sample-voice-ai-agent-studio/main/source/agent/main.py)

Para Factored lo cambiaría a esto:

```
Gemini Live
    │
    │ function_call
    ▼
candidate_action
    │
    ▼
PII / injection check
    │
    ▼
JEV classification
    │
    ▼
Schema validation
    │
    ▼
Policy Engine
    │
    ├── DENY ───────────────► safe response
    │
    ├── REQUIRE_APPROVAL ───► LangGraph HITL
    │
    └── ALLOW
             │
             ▼
        Tool Executor
             │
      ┌──────┼──────┐
      ▼      ▼      ▼
 BigQuery   RAG    Mock APIs
```

Es decir: **Gemini puede sugerir la llamada, pero nunca autorizarla**.

Esto es especialmente importante para los workflows bancarios de Factored.

---

## Mapeo AWS → nuestra versión GCP

| Sample AWS                | GCP Factored                       | Qué haría                            |
| ------------------------- | ---------------------------------- | ------------------------------------ |
| Bedrock AgentCore Runtime | **Cloud Run FastAPI/WSS**          | Reemplazar                           |
| Nova Sonic                | **Vertex AI Gemini Live**          | Reemplazar                           |
| Strands BidiAgent         | Google GenAI SDK / adaptador voice | Reducir o eliminar                   |
| API Gateway + Lambda      | **mismo Cloud Run FastAPI**        | Consolidar                           |
| DynamoDB                  | **Firestore**                      | Para estado/HITL                     |
| S3                        | GCS                                | Solo si necesitamos artifacts        |
| Bedrock Knowledge Base    | **Qdrant**                         | Ya coincide con nuestra arquitectura |
| AgentCore MCP             | Tool/MCP Gateway propio            | Pasar por Policy Engine              |
| Lambda tools              | funciones Python/HTTP internas     | ToolExecutor                         |
| Cognito                   | Firebase Auth / Identity Platform  | Solo si necesitamos auth             |
| SigV4 WS                  | JWT → Cloud Run WSS                | Simplificar                          |
| S3/Dynamo call history    | **BigQuery**                       | Pero solo datos saneados             |
| Lambda eval runner        | Cloud Run worker / Cloud Tasks     | Adaptar                              |
| LLM-as-Judge              | **JEV + eval harness**             | Encaja muy bien                      |
| CloudWatch                | Cloud Logging + Trace + OTel       | Reemplazar                           |
| AWS Secrets Manager       | Secret Manager                     | Directo                              |
| AWS CDK                   | Terraform/gcloud                   | No priorizaría IaC en hackathon      |
| PSTN/ECS/EKS              | —                                  | No meter ahora                       |
| SIP/EKS/NLB               | —                                  | No meter ahora                       |

Cloud Run soporta WebSockets nativamente. Hay que recordar que cada conexión sigue siendo una petición HTTP de larga duración y tiene un máximo de **60 minutos**, y Google recomienda implementar reconexión y mantener el estado fuera de la instancia porque una reconexión puede terminar en otro contenedor. [Google Cloud Documentation](https://docs.cloud.google.com/run/docs/triggering/websockets?utm_source=chatgpt.com)

Eso justifica precisamente nuestro `RealtimeSession` efímero + Redis/Firestore y evita hacer depender el flujo de memoria local del pod/container.

---

## Y hay una mejora inmediata respecto al Gemini del repo

Aquí el repositorio ya está algo desactualizado. Su `main.py` todavía tiene como default:

```
GEMINI_LIVE_MODEL_ID =
    "gemini-2.5-flash-native-audio-preview-09-2025"
``` :chatgpt-content-reference{index="5"}


Actualmente Google tiene como GA:

```text
gemini-live-2.5-flash-native-audio
```

Gemini Live Native Audio pasó a disponibilidad general en Vertex AI el **12 de diciembre de 2025**. [Google Cloud](https://cloud.google.com/blog/products/ai-machine-learning/gemini-live-api-available-on-vertex-ai?utm_source=chatgpt.com)

Y nos da justo lo que necesitamos:

- native speech-to-speech;
- WebSocket bidireccional;
- VAD;
- interrupción/barge-in;
- transcripción;
- function calling;
- Proactive Audio;
- audio 24 kHz de salida.

La Live API cancela la generación actual cuando detecta una interrupción e incluso cancela function calls pendientes asociados a esa generación. [Google Cloud](https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/multimodal-live?hl=zh-tw&utm_source=chatgpt.com)

Por tanto, **no necesitamos implementar nosotros VAD + barge-in + TTS + STT como pipeline separado** para la primera versión.

---

## Strands: aquí haría una distinción importante

El sample está escrito alrededor de Strands `BidiAgent`. Técnicamente podemos mantenerlo. Strands es una librería, no requiere AgentCore para ejecutarse, y su integración Gemini Live usa el SDK oficial de Google. [Strands Agents](https://strandsagents.com/docs/user-guide/sdk/bidirectional-streaming/models/google/?utm_source=chatgpt.com)

Incluso el `client_args` se pasa al Google GenAI SDK, y ese SDK puede utilizar Vertex AI mediante proyecto, location y credenciales en lugar de API key. [Strands Agents](https://strandsagents.com/docs/user-guide/sdk/bidirectional-streaming/models/google/?utm_source=chatgpt.com)

Es decir, un port mínimo podría transformar esto:

```
GoogleGeminiLiveModel(
    client_args={"api_key": api_key},
    ...
)
```

en algo conceptualmente equivalente a:

```
GoogleGeminiLiveModel(
    client_args={
        "vertexai": True,
        "project": PROJECT_ID,
        "location": LOCATION,
    },
    model_id="gemini-live-2.5-flash-native-audio",
)
```

y ejecutarlo dentro de Cloud Run usando la service account.

**Pero para Factored no dejaría Strands como orquestador principal.** La integración bidireccional de Gemini en Strands todavía aparece documentada como experimental. [Strands Agents](https://strandsagents.com/docs/user-guide/sdk/bidirectional-streaming/models/google/?utm_source=chatgpt.com)

Dado que ya tenemos LangGraph como máquina de estados y el control plane bastante elaborado, usaría:

```
Google GenAI SDK
       │
       ▼
Gemini Live
       │
       ▼
VoiceAdapter
       │
       ▼
Factored Control Plane
       │
       ▼
LangGraph
```

El `VoiceAdapter` sería bastante pequeño.

Así no terminamos con:

```
Strands orchestration
      +
LangGraph orchestration
```

compitiendo por el control del sistema.

---

## Otro problema serio del sample: logging de audio

Esto sí hay que quitarlo.

El sample habilita `callHistoryEnabled=True` por defecto y crea un `CallHistoryLogger`. [GitHub](https://raw.githubusercontent.com/aws-samples/sample-voice-ai-agent-studio/main/source/agent/main.py)

Además captura los chunks de audio del usuario:

```
user_audio = base64.b64decode(message["audio"])
call_logger._current_user_chunks.append(user_audio)
``` :chatgpt-content-reference{index="12"}


y posteriormente también persiste transcripciones y audio del agente. :chatgpt-content-reference{index="13"}

Para Factored haría exactamente lo contrario:

```text
RAW AUDIO
   │
   ├──► Gemini Live
   │
   └──X NO BigQuery
        NO GCS
        NO Cloud Logging
```

Y:

```
transcript
   ↓
SDP / sanitization
   ↓
sanitized transcript
   ↓
BigQuery
```

BigQuery guardaría principalmente:

```
session_id
turn_id
workflow
intent
tool_name
policy_verdict
risk
latency_ms
tool_latency_ms
interrupted
hitl_required
eval_score
judge_result
sanitized_text
timestamp
```

No PCM/base64.

Esto también es coherente con Model Armor: puede inspeccionar prompt/response para prompt injection, jailbreaks y datos sensibles, y está integrado con Sensitive Data Protection. [Google Cloud](https://cloud.google.com/security/products/model-armor?utm_source=chatgpt.com)

---

## No activaría Session Resumption

Esto conecta directamente con lo que discutimos antes sobre seguridad.

Gemini Live puede conservar una sesión y reanudarla hasta por 24 horas, pero Google indica explícitamente que **si se necesita zero data retention, no debe habilitarse session resumption**, porque la recuperación conserva datos cacheados de la sesión, incluidos prompts de audio/video/texto y outputs. [Google Cloud Documentation](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/live-api/start-manage-session?utm_source=chatgpt.com)

Para Factored:

```
sessionResumption = OFF
raw audio persistence = OFF
```

Si se cae WSS:

```
reconnect
   ↓
new Gemini session
   ↓
restore only sanitized business state
from Firestore / LangGraph checkpoint
```

No tratamos de restaurar el buffer de audio.

Esa separación es mucho más segura.

---

# Qué copiaría realmente del repositorio

No clonaría todo el Studio dentro del proyecto Factored.

**Reutilizaría conceptualmente** el WebSocket protocol, captura/reproducción de PCM, `sessionConfig`, transcript streaming, indicadores de tool-call, interruption handling, métricas TTFT/TTFB/tool latency y el modelo de eval suites. El propio sample ya mide TTFT, TTFB y latencia de tools y tiene un runner asíncrono con LLM-as-judge. [GitHub](https://github.com/aws-samples/sample-voice-ai-agent-studio?utm_source=chatgpt.com)

Eliminaría casi íntegramente:

```
deployment/
AgentCore
Cognito
SigV4
DynamoDB
Lambda API
Lambda tool invocation
Bedrock KB
S3 call history
PSTN
SIP
AWS-specific MCP gateway code
```

Y tampoco portaría su CRUD completo de “Agent Studio” salvo que quieran mostrar un builder de agentes en el demo.

---

# Cómo queda respecto a lo que YA tenemos en Factored

Aquí es donde realmente encaja.

No sustituye:

```
BigQuery
LangGraph
JEV
Policy Engine
EvidenceDTO
Qdrant
Firestore HITL
Model Armor
SDP
OpenTelemetry
```

Los complementa con una nueva capa:

```
ANTES

User
  ↓
Text UI
  ↓
Factored Control Plane
  ↓
LangGraph


DESPUÉS

                ┌── Text UI ─────────┐
User ───────────┤                    ├──► Factored Control Plane
                └── Voice UI ────────┘
                       │
                       ▼
                  Gemini Live
```

Eso es importante: **no estamos construyendo otro agente**.

Estamos añadiendo otro **canal de interacción** al mismo sistema.

---

## Lo que implementaría para la hackathon

Yo haría el port en este alcance:

| Prioridad | Componente                                                    |
| --------- | ------------------------------------------------------------- |
| P0        | `VoiceGateway` FastAPI WebSocket en nuestro Cloud Run         |
| P0        | Gemini Live vía Vertex AI                                     |
| P0        | browser mic → PCM16 → Cloud Run                               |
| P0        | audio Gemini → browser                                        |
| P0        | VAD + barge-in                                                |
| P0        | realtime transcript UI                                        |
| P0        | `route_intent` como única entrada del modelo al control plane |
| P0        | JEV → schema → Policy                                         |
| P0        | BigQuery SELECT-only                                          |
| P0        | no raw audio logging                                          |
| P0        | sanitized transcript/event telemetry                          |
| P1        | LangGraph HITL por voz                                        |
| P1        | mostrar tool execution en la UI                               |
| P1        | TTFT/TTFB/tool latency                                        |
| P1        | Jev-as-a-Judge voice eval                                     |
| P2        | Agent builder del repo                                        |
| P2        | múltiples voices/config                                       |
| ❌         | PSTN                                                          |
| ❌         | SIP                                                           |
| ❌         | telephony routing                                             |
| ❌         | AgentCore-style subagents                                     |
| ❌         | almacenar grabaciones                                         |

### En una frase

**Sí usaría este repositorio para Factored, pero como referencia/accelerator del `Realtime Voice Plane`, no como la arquitectura completa.**

La versión que estamos armando quedaría incluso más sólida:

**AWS sample**

```
Voice → BidiAgent → tool
```

**Factored GCP**

```
Voice
 ↓
Gemini Live
 ↓
candidate intent/tool
 ↓
PII Firewall
 ↓
JEV
 ↓
Schema
 ↓
Deterministic Policy
 ↓
LangGraph
 ↓
ToolExecutor
 ↓
BigQuery / Qdrant / HITL
```

Y creo que este diseño resuelve precisamente la pregunta anterior que teníamos sobre Gemini Live vs AssemblyAI/Pipecat: **para el hackathon, este repo confirma que podemos usar native speech-to-speech y mantener el control plane existente**, sin introducir un segundo pipeline STT→LLM→TTS ni rehacer nuestros agentes de texto. Gemini Live queda como **interfaz realtime**, no como dueño de la lógica bancaria. [Google Cloud](https://cloud.google.com/blog/topics/developers-practitioners/how-to-use-gemini-live-api-native-audio-in-vertex-ai?hl=en&utm_source=chatgpt.com)
