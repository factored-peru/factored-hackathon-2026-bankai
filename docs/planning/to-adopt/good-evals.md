Con **OpenTelemetry + BigQuery**, yo **no añadiría DeepEval ni LangSmith de entrada**. Te estarían duplicando bastante infraestructura. Lo que sí necesitas distinguir es **telemetría** de **evaluación**.

OpenTelemetry puede registrar spans de llamadas al modelo, tools, tokens, latencia, retrieval y otros eventos GenAI, y las convenciones de OpenTelemetry incluso contemplan resultados de evaluación como nombre, score, label y explicación. [OpenTelemetry](https://opentelemetry.io/blog/2026/genai-observability/?utm_source=chatgpt.com) BigQuery puede convertirse en tu almacén histórico para explotar todo eso. Pero ninguno de los dos decide por sí mismo si una respuesta fue correcta: **el evaluador sigue teniendo que existir en algún sitio**.

Por eso, para tu arquitectura de Factored, simplificaría así:

```text
                 ┌─────────────────────┐
User ───────────►│ LangGraph / Backend │
                 └──────────┬──────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
          BigQuery       Graph/RAG       LLM
              │
              └─────────────┬─────────────┘
                            ▼
                         Answer
                            │
                            ▼
                  Evaluator TS propio
                  ├─ reglas deterministas
                  ├─ JEV
                  ├─ LLM Judge
                  └─ business metrics
                            │
                            ▼
                     OpenTelemetry
                            │
                            ▼
                        BigQuery
```

En BigQuery guardarías algo parecido a:

```text
trace_id
session_id
agent_version
prompt_version
route
tool_calls
sql_query_id
latency_ms
tokens
cost

eval.task_completion
eval.correct_route
eval.tool_correctness
eval.answer_relevance
eval.groundedness
eval.score
eval.reason
```

Con eso puedes hacer después SQL:

```sql
SELECT
  agent_version,
  AVG(eval_score),
  AVG(latency_ms),
  AVG(cost)
FROM agent_runs
GROUP BY agent_version;
```

y comparar versiones sin necesitar otra plataforma.

### Sobre DeepEval TypeScript: sí existe oficialmente

Esto cambió recientemente. El propio repositorio de **Confident AI / DeepEval** ya contiene el port oficial TypeScript y ejemplos como:

```ts
import { TaskCompletionMetric } from "deepeval/metrics";
```

También tiene integración con AI SDK y tracing. [GitHub](https://github.com/confident-ai/deepeval?utm_source=chatgpt.com)

Pero hoy tiene una salvedad importante: las releases TS siguen apareciendo como `0.9.x` / pre-release y DeepEval reconoce que **Python sigue por delante**, faltan algunas capacidades y no garantizan score-parity Python↔TypeScript. [github.com](https://github.com/confident-ai/deepeval/releases?utm_source=chatgpt.com)

Por tanto:

**DeepEval TS = real y oficial, pero yo no lo metería como dependencia central todavía en tu arquitectura.**

### Si quieres un framework de eval robusto en TypeScript: Promptfoo

Aquí sí hay una opción que me parece particularmente interesante para ti.

**Promptfoo tiene una API Node/TypeScript estable**, no tienes que usar solamente YAML:

```ts
import { evaluate } from "promptfoo";

const result = await evaluate({
  prompts: [...],
  providers: [...],
  tests: [...]
});
```

La documentación marca `evaluate()`, `runAssertion()`, carga de providers, etc. como APIs estables y expone tipos TypeScript. [Promptfoo](https://www.promptfoo.dev/docs/usage/node-package/?utm_source=chatgpt.com)

Además puedes poner evaluaciones propias:

```ts
{
  type: "javascript",
  value: async (output, context) => {

    const result = await jev.evaluate({
      output,
      expected: context.vars.expected
    });

    return {
      pass: result.score >= 0.8,
      score: result.score,
      reason: result.reason
    };
  }
}
```

Promptfoo te aporta principalmente el **test harness**:

```text
dataset
   ↓
ejecuta 500 casos
   ↓
tu agente
   ↓
assertions
   ├── exact
   ├── contains
   ├── JS/TS custom
   ├── similarity
   ├── LLM rubric
   └── JEV propio
   ↓
pass/fail
   ↓
CI/CD
```

Tiene evaluación programática, assertions custom, LLM rubrics, concurrencia, caching y CI. [Promptfoo](https://www.promptfoo.dev/docs/usage/node-api-reference/?utm_source=chatgpt.com)

Y aquí está la clave:

**Promptfoo no tiene que participar en producción.**

Puedes dejarlo solamente como:

```text
                 PRODUCTION
                     │
              LangGraph Agent
                     │
                OpenTelemetry
                     │
                  BigQuery


                   CI/CD
                     │
                  Promptfoo
                     │
          Golden Dataset / Testset
                     │
             JEV + reglas + LLM
                     │
              PASS / FAIL build
```

Eso me parece bastante más limpio.

## Stack que dejaría para Factored

No utilizaría:

```text
LangGraph
+ Deep Agents
+ LangSmith
+ DeepEval
+ Promptfoo
+ OpenTelemetry
+ BigQuery
+ JEV
```

Eso sería **overengineering**.

Me quedaría con:

```text
┌─────────────────────────────────────────┐
│              APPLICATION                │
│                                         │
│ LangGraph / TS                          │
│ Gemini / modelos                        │
│ BigQuery / Graph / RAG                  │
│ Model Armor                             │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│            OBSERVABILITY                │
│                                         │
│ OpenTelemetry                           │
│        ↓                                │
│ BigQuery                                │
└─────────────────────────────────────────┘

                +

┌─────────────────────────────────────────┐
│             EVALUATION                  │
│                                         │
│ Vitest / Promptfoo                      │
│        │                                │
│        ├── reglas deterministas         │
│        ├── JEV                          │
│        └── LLM Judge cuando haga falta  │
│                                         │
│ Resultado → BigQuery                    │
└─────────────────────────────────────────┘
```

### Y puedes simplificar todavía más

Para vuestro caso concreto, **ni siquiera empezaría con Promptfoo**.

Puedes crear una interfaz de 30-50 líneas:

```ts
interface Evaluation {
  metric: string;
  score: number;
  passed: boolean;
  reason?: string;
}

interface Evaluator {
  evaluate(run: AgentRun): Promise<Evaluation>;
}
```

e implementar:

```text
RouteEvaluator
SQLCorrectnessEvaluator
ToolSelectionEvaluator
GroundednessEvaluator
TaskCompletionEvaluator
JevEvaluator
```

Luego:

```ts
const evaluations = await Promise.all(
  evaluators.map(e => e.evaluate(run))
);
```

y emitir cada uno como evento/span OTel.

OpenTelemetry ya tiene una estructura semántica GenAI que permite modelar scores y resultados de evaluación, así que esta aproximación no es una rareza arquitectónica. [OpenTelemetry](https://opentelemetry.io/docs/specs/semconv/registry/attributes/gen-ai/?utm_source=chatgpt.com)

## Mi arquitectura final para ustedes

```text
                       ┌───────────┐
                       │   User    │
                       └─────┬─────┘
                             ▼
                     ┌─────────────┐
                     │  LangGraph  │
                     └──────┬──────┘
                            │
                 JEV routing / policy
                            │
          ┌─────────────────┼────────────────┐
          ▼                 ▼                ▼
      BigQuery            Graph            RAG
          └─────────────────┼────────────────┘
                            ▼
                           LLM
                            │
                      Model Armor
                            │
                            ▼
                         Answer

────────────────── Observability ──────────────────

             OpenTelemetry
                  │
                  ▼
               BigQuery

──────────────────── Evals ────────────────────────

          TS evaluators / JEV
                  │
          ┌───────┴─────────┐
          ▼                 ▼
   production eval      offline eval
          │                 │
          ▼                 ▼
      BigQuery         Vitest/Promptfoo
```

**Conclusión:** con OTel + BigQuery **no necesitas LangSmith**. Y **tampoco necesitas DeepEval** salvo que quieras sus métricas listas para usar. Para tu stack TypeScript, empezaría con **evaluadores TS propios + JEV + OTel + BigQuery**. Cuando necesites un verdadero regression suite de cientos/miles de casos y gates de CI/CD, añadiría **Promptfoo**, no otra plataforma completa de observabilidad.

Así mantienes **una sola fuente de verdad en BigQuery**, un único tracing estándar con **OpenTelemetry** y evitas meter tres SDKs que resuelven parcialmente el mismo problema.



Para inspirarte en **implementación de evaluadores propios en TypeScript**, estos son los repos que revisaría hoy. No todos son “SOTA” en el sentido académico, pero sí son referencias actuales y útiles de ingeniería.

| Repo                     | Qué vale la pena copiar/estudiar                                                                                           | TS                                  |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| **DeepEval**             | G-Eval, **JevEval**, DAG evaluators, task completion, step efficiency, tool/argument correctness, RAG metrics, scoring 0–1 | ✅ oficial, todavía más joven        |
| **LangChain AgentEvals** | Evaluación de **trayectorias de agentes**, LLM-as-judge, comparación de pasos/tools                                        | ✅ excelente                         |
| **OpenEvals**            | Evaluadores pequeños/componibles: LLM judge, correctness, code evaluators                                                  | ✅ excelente                         |
| **TypeSafe / Jev SDK**   | `Choice`, `Score`, `Noul`, probabilidades calibradas para implementar Jev-as-judge                                         | ✅ oficial                           |
| **Promptfoo**            | Assertions, rubrics, LLM-as-judge, scoring, CI/CD, text-to-SQL, agentes                                                    | ✅ nativo                            |
| **Phoenix Evals**        | Diseño de scores, clasificación, faithfulness, completeness, evaluadores sobre OTel                                        | ⚠️ core evals principalmente Python |
| **TruLens**              | Agent GPA, groundedness, judge calibration, evaluación directamente sobre OTel                                             | ⚠️ principalmente Python            |
| **Ragas**                | RAG metrics y diseño de métricas evaluadas por LLM                                                                         | ❌ Python                            |
| **Inspect AI**           | Arquitectura seria de scorers, model-graded evals, benchmarks                                                              | ❌ Python                            |

### Los 5 que miraría primero

**1. DeepEval — la referencia más completa para diseño de métricas**

[DeepEval GitHub](https://github.com/confident-ai/deepeval?utm_source=chatgpt.com)

El repo actualmente incluye directamente una carpeta `typescript/`. DeepEval tiene más de 50 métricas y cubre G-Eval, DAG, JevEval, RAG y agentes. [GitHub](https://github.com/confident-ai/deepeval/blob/main/docs/content/docs/metrics-introduction.mdx?utm_source=chatgpt.com)

Para tu implementación miraría especialmente cómo modelan:

```
BaseMetric
   ↓
metric.measure(testCase)
   ↓
score: 0..1
reason
threshold
success
```

y estas métricas:

```
GEval
JevEval

TaskCompletionMetric
StepEfficiencyMetric
PlanQualityMetric
PlanAdherenceMetric

ToolCorrectnessMetric
ArgumentCorrectnessMetric

FaithfulnessMetric
AnswerRelevancyMetric
ContextualPrecisionMetric
ContextualRecallMetric
```

DeepEval además distingue muy bien tres niveles para agentes: **trajectory**, **component/tool-call** y **end-to-end**. [GitHub](https://github.com/confident-ai/deepeval/blob/main/docs/content/guides/guides-ai-agent-evaluation-metrics.mdx?utm_source=chatgpt.com)

Y ya implementaron exactamente lo que estás pensando:

```
eval_mode = llm
eval_mode = hybrid       // LLM + Jev
eval_mode = system_one   // Jev
```

JevEval no genera un score textual para luego parsearlo: envía preguntas acotadas a Jev y compone el score a partir de probabilidades. [GitHub](https://github.com/confident-ai/deepeval/blob/main/docs/content/docs/metrics-introduction.mdx?utm_source=chatgpt.com)

---

**2. LangChain AgentEvals — probablemente el que más te conviene leer para tu agente**

[LangChain AgentEvals GitHub](https://github.com/langchain-ai/agentevals?utm_source=chatgpt.com)

Este es particularmente interesante porque es **pequeño y enfocado**: evaluadores para las trayectorias intermedias de agentes, y tiene soporte oficial Python **y TypeScript**. [GitHub](https://github.com/langchain-ai/agentevals?utm_source=chatgpt.com)

Tiene conceptos como:

```
trajectory = [
  userMessage,
  aiMessage(toolCall),
  toolMessage,
  aiMessage(...)
]
```

y encima puedes implementar:

```
Trajectory Exact Match
Trajectory In Order
Trajectory Any Order
Trajectory LLM-as-Judge
```

Para tu Factored esto se parece mucho más a lo que realmente necesitas:

```
JEV route=SQL
        ↓
SQL generator
        ↓
BigQuery
        ↓
LLM answer
```

y medir:

```
expected:
router → SQL → BigQuery → answer

actual:
router → SQL → BigQuery → answer
```

sin necesitar una plataforma entera.

---

**3. OpenEvals — muy buena referencia para construir tu propio paquete TS**

[LangChain OpenEvals GitHub](https://github.com/langchain-ai/openevals?utm_source=chatgpt.com)

Tiene dos implementaciones mantenidas en el mismo repo:

```
/python
/js
``` :chatgpt-content-reference{index="7"}


Conceptualmente es incluso más interesante que LangSmith para lo que quieres hacer, porque **OpenEvals es la parte reutilizable de evaluación**, sin obligarte a adoptar la plataforma LangSmith.

Yo copiaría de aquí la filosofía:

```ts
Evaluator<Input, Output> {
    evaluate(input): EvaluationResult
}
```

con:

```
type EvaluationResult = {
  key: string
  score?: number
  value?: boolean | string
  comment?: string
}
```

Eso encaja prácticamente directo con:

```
Evaluator
    ↓
OpenTelemetry span/event
    ↓
BigQuery
```

---

**4. Jev directamente — muy importante para tu diseño**

El SDK oficial TypeScript está aquí:

[TypeSafe AI TypeScript SDK (Jev)](https://github.com/typesafe-ai/typesafe-sdk-js?utm_source=chatgpt.com)

Es TypeScript oficial y expone las primitivas de System One que necesitas: `Choice`, `Score` y preguntas binarias tipo `Noul`. [GitHub](https://github.com/typesafe-ai/typesafe-sdk-js?utm_source=chatgpt.com)

Por ejemplo, para evaluación puedes construir algo conceptualmente así:

```
const result = await jev.systemOne({
  state: {
    query,
    trajectory,
    answer,
    retrievedContext,
  },

  questions: {

    completed: noul(
      "Did the agent successfully accomplish the user's goal?"
    ),

    quality: score(
      "Rate the quality of the execution",
      [
        "Failed",
        "Partially completed",
        "Completed",
        "Completed optimally"
      ]
    )
  }
});
```

Luego puedes transformar probabilidades directamente:

```
score = result.answers.completed.noul;

passed = score >= 0.8;
```

Eso me parece mejor referencia para tu `JevEvaluator` que intentar reproducir todo DeepEval.

También existe el SDK Python oficial:

[TypeSafe AI Python SDK](https://github.com/typesafe-ai/typesafe-sdk-python?utm_source=chatgpt.com)

Y los patrones oficiales/skills de TypeSafe:

[TypeSafe AI Skills](https://github.com/typesafe-ai/skills?utm_source=chatgpt.com)

El SDK TS fue publicado públicamente en septiembre de 2026 y es el cliente oficial. [GitHub](https://github.com/typesafe-ai/typesafe-sdk-js/releases?utm_source=chatgpt.com)

---

**5. Promptfoo — referencia muy buena para assertions y harness**

[Promptfoo GitHub](https://github.com/promptfoo/promptfoo?utm_source=chatgpt.com)

Es especialmente interesante porque el código está fuertemente orientado a Node/TypeScript y cubre actualmente agentes, RAG, factuality, **LLM-as-a-judge**, text-to-SQL, custom assertions y testing de guardrails/Model Armor. [GitHub](https://github.com/promptfoo/promptfoo?utm_source=chatgpt.com)

Estudiaría su modelo:

```
Provider
   ↓
output
   ↓
Assertion[]
   ↓
grader
   ↓
score
pass
reason
```

Muy cercano a lo que podrías construir.

---

### Hay otros tres repos que valen mucho la pena mirar

Para **OpenTelemetry específicamente**, mira TruLens:

[TruLens GitHub](https://github.com/truera/trulens?utm_source=chatgpt.com)

TruLens ahora es **OpenTelemetry-native** y puede evaluar spans tanto cuando llegan como posteriormente sobre datasets. Tiene además métricas de agentes, groundedness y LLM judges calibrados. [GitHub](https://github.com/truera/trulens?utm_source=chatgpt.com)

Esto es muy parecido arquitectónicamente a lo que tú quieres:

```
Agent
 ↓
OTel traces
 ↓
storage
 ↓
Evaluator(trace)
 ↓
scores
```

También apareció otro proyecto llamado **agentevals** —ojo, NO es el mismo que el de LangChain— específicamente construido alrededor de OTel:

[agentevals-dev/agentevals GitHub](https://github.com/agentevals-dev/agentevals?utm_source=chatgpt.com)

Su arquitectura evalúa el comportamiento del agente **directamente desde traces OpenTelemetry**, sin volver a ejecutar el agente. Soporta golden trajectories, evaluadores built-in, custom evaluators y LLM judges. [GitHub](https://github.com/agentevals-dev/agentevals?utm_source=chatgpt.com)

**Este repo te recomiendo mirarlo con mucha atención**, porque es prácticamente tu arquitectura propuesta:

```
LangGraph TS
     ↓
OpenTelemetry
     ↓
BigQuery
     ↓
evaluador offline
```

Finalmente, Phoenix:

[Arize Phoenix GitHub](https://github.com/Arize-ai/phoenix?utm_source=chatgpt.com)

Tiene una arquitectura muy buena alrededor de:

```
Score {
   name
   kind: code | llm | human
   score: 0..1
   label
   explanation
}
```

y recomienda precisamente **code first → LLM cuando el criterio sea subjetivo → humano para calibración**. [GitHub](https://github.com/Arize-ai/phoenix/blob/main/.agents/skills/phoenix-evals/references/fundamentals.md?utm_source=chatgpt.com)

Phoenix además es OpenTelemetry-first y ya contempla evaluadores custom tanto Python como TypeScript. [GitHub](https://github.com/Arize-ai/phoenix/blob/main/docs/phoenix/skill.md?utm_source=chatgpt.com)

---

### Para tu implementación, yo extraería estas ideas

No copiaría frameworks completos. Implementaría algo pequeño:

```
export interface EvalContext {
  traceId: string;
  input: unknown;
  output: unknown;

  trajectory?: AgentStep[];

  expectedOutput?: unknown;
  expectedTrajectory?: AgentStep[];

  retrievalContext?: string[];
}

export interface EvaluationResult {
  metric: string;

  score: number;       // 0..1
  passed: boolean;

  label?: string;
  reason?: string;

  evaluator: string;
  evaluatorVersion: string;
}

export interface Evaluator {
  name: string;

  evaluate(
    ctx: EvalContext
  ): Promise<EvaluationResult>;
}
```

Y encima solo estos evaluadores inicialmente:

```
                 Evaluator
                     │
      ┌──────────────┼───────────────┐
      │              │               │
 Deterministic   LLM-as-Judge    Jev-as-Judge
      │              │               │
      ├ Tool          ├ Correctness   ├ Completion
      ├ Args          ├ Relevance     ├ Routing
      ├ SQL           ├ Groundedness  ├ Quality
      ├ Schema        └ Coherence     └ Confidence
      └ Trajectory
```

Para **métricas de agentes**, tomaría el diseño de **DeepEval + LangChain AgentEvals**.

Para **LLM-as-judge**, miraría **DeepEval G-Eval + OpenEvals + Phoenix**.

Para **Jev-as-judge**, directamente **DeepEval JevEval + SDK oficial TypeSafe**.

Para **OTel → evaluación offline**, miraría sobre todo **TruLens + agentevals-dev**.

Para **runner/assertions/CI**, **Promptfoo**.

Y dejaría **Ragas** como referencia secundaria para RAG:

[Ragas GitHub](https://github.com/vibrantlabsai/ragas?utm_source=chatgpt.com)

Tiene implementaciones maduras de contextual relevancy/precision/recall, faithfulness y evaluación experimental de RAG/agentes. [GitHub](https://github.com/vibrantlabsai/ragas?utm_source=chatgpt.com)

Si tuviera que reducir todo a **4 repos para estudiar código esta semana**, serían: **DeepEval → LangChain AgentEvals → OpenEvals → TypeSafe SDK JS**. Con esos cuatro ya tienes prácticamente todas las piezas necesarias para implementar tu propio `@factored/evals` en TS sin añadir otro framework en producción.
