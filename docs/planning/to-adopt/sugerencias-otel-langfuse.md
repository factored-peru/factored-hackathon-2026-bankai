Sí: **puedes usar Langfuse gratis**, y para tu hackathon probablemente te alcanza de sobra.

Actualmente tienes dos caminos:

| Opción                   | Precio               | Qué implica                                           |
| ------------------------ | --------------------:| ----------------------------------------------------- |
| **Langfuse Cloud Hobby** | **US$0/mes**         | 50k unidades/mes, 30 días de historial, 2 usuarios    |
| **Langfuse Cloud Core**  | **US$29/mes**        | 100k unidades incluidas, 90 días, usuarios ilimitados |
| **Langfuse Cloud Pro**   | **US$199/mes**       | 100k incluidas, 3 años de historial, límites mayores  |
| **Self-hosted OSS**      | **US$0 de licencia** | tú pagas únicamente la infraestructura                |

El plan Hobby **no requiere tarjeta** y ya incluye tracing, evaluación, datasets, scores, prompt management, etc. [Langfuse](https://langfuse.com/pricing?utm_source=chatgpt.com)

La unidad de cobro es importante. Langfuse calcula:

```text
1 unidad =
  1 trace
  o
  1 observation
  o
  1 score
```

Es decir:

```text
Units =
traces
+ observations
+ scores
``` :chatgpt-content-reference{index="1"}


Por ejemplo, una consulta tuya podría generar:

```text
Pregunta usuario                   1 trace

router                             1 observation
KG-RAG retrieval                   1 observation
graph query                        1 observation
context builder                    1 observation
LLM generation                     1 observation

path_validity                      1 score
graph_relevance                    1 score
groundedness                       1 score
answer_correctness                 1 score

────────────────────────────────────────
≈ 10 unidades por interacción
```

Con **50k unidades gratis**, algo del orden de:

```text
50,000 / 10 ≈ 5,000 consultas/mes
```

aunque obviamente depende de cuántos spans y scores generes.

Para una **hackathon / MVP**, estás muy lejos de necesitar pagar.

### Y self-hosted es realmente gratis

La versión OSS de Langfuse está bajo licencia MIT y **no tiene cobro por número de traces/unidades**. [Langfuse](https://langfuse.com/pricing-self-host?utm_source=chatgpt.com)

Sería:

```text
Langfuse software      $0

pero tú pagas:

PostgreSQL
ClickHouse
Redis
Object Storage
CPU/RAM
networking
backups
mantenimiento
```

Así que "gratis" aquí significa **sin licencia**, no infraestructura gratuita.

Y probablemente para ti **self-hostearlo ahora sería más caro en tiempo que usar Cloud**.

### Lo que haría para Factored

Iría directamente con:

```text
Cloud Run
   │
   ├── LangGraph TS
   ├── OpenTelemetry
   ├── Langfuse SDK
   └── KG-RAG custom evals
            │
            ▼
      Langfuse Cloud
       Hobby $0
```

Y dejaría BigQuery para:

```text
BigQuery
├── datos del caso
├── KDD
├── asociaciones
├── KG
└── analytics propios
```

Mientras Langfuse:

```text
Langfuse
├── traces
├── agente
├── tool calls
├── latency
├── tokens
├── retrieval
├── custom scores
├── LLM-as-judge
└── experimentación
```

**No desplegaría Docker de Langfuse para esta hackathon.** Me quedaría en **Langfuse Cloud Hobby gratis + SDK TypeScript**. Si después el sistema pasa a producción o aparecen restricciones sobre dónde quedan los traces/datos, recién evaluaría self-hosting.

Además, Langfuse ofrece descuentos para investigación/estudiantes de **hasta 100%**, sujeto a límites, lo que podría ser relevante si esto continúa fuera de la hackathon. [Langfuse](https://langfuse.com/pricing?utm_source=chatgpt.com)
