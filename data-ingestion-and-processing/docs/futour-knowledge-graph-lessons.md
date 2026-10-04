# Lecciones de FuTour Knowledge Graph para Dispute Transaction Support

## Alcance de la revisión

La copia inmutable de código, actividades y reportes está en
[`../referencias/futour-knowledge-graph/`](../referencias/futour-knowledge-graph/README.md).
Se trasladó como referencia, no como una dependencia o implementación activa.
`SHA256SUMS` permite comprobar que cada archivo copiado coincide con el
origen local revisado el 3 de octubre de 2026.

BigQuery continúa siendo la fuente estructurada canónica. Bankai ahora
compila localmente un grafo KDD v1, pero no lo sirve ni publica. Esta guía
evita confundir reglas asociativas, clasificación probabilística y relaciones
de grafo.

## Algoritmos y artefactos identificados

| Componente FuTour | Qué hace | Uso potencial en disputas | Límite obligatorio |
| --- | --- | --- | --- |
| Naive Bayes suavizado | Calcula `P(arquetipo | evidencia)` con prior y condicionales Laplace/Dirichlet; usa logaritmos y normalización. | Baseline para C1 (SLA), C3 (señal de fraude), C4 (escalamiento) o C5 (satisfacción), siempre con un objetivo propio. | No infiere causalidad, responsabilidad ni resultado legal; requiere corte temporal, calibración y evaluación antes de cualquier uso. |
| Apriori | Mina `antecedente → categoría` con soporte, confianza y lift; usa poda antimonótona y máximo de tres ítems de antecedente. | Descubrir hipótesis de cohortes en KDD, separadas de un modelo predictivo. | Una regla no es una predicción individual ni una autorización. |
| AprioriTid / AprioriHybrid | El paper P487 propone representar candidatos intermedios por TID para reducir escaneos y un híbrido que cambia de estrategia al resultar más eficiente. | Bankai ejecuta `apriori_hybrid` como control: debe producir los mismos itemsets que Apriori; se registra tiempo/paridad y no vota en el grafo. | No es un cuarto consensuador. Si diverge de Apriori, el run falla. |
| FP-Growth | Construye un FP-tree comprimido y mina bases condicionales mediante crecimiento de fragmentos; evita generar el conjunto completo de candidatos. | Ya es la alternativa escalable incluida en el KDD actual y es el candidato preferible cuando aumentan los candidatos, la longitud de patrones o la dispersión. | Comparar el mismo dataset, umbrales y objetivos; registrar tiempo, memoria, itemsets y concordancia de reglas; no mezclar sus métricas con Bayes. |
| Eclat | Mina itemsets frecuentes con TID-lists verticales e intersección (Zaki). | Tercer consensuador del grafo: mismas métricas asociativas, estrategia de búsqueda distinta. | Debe compararse bajo la misma matriz y umbrales; no sustituye a Apriori como baseline auditable. |
| Grafo materializado | FuTour representa aristas Bayes `arquetipo → feature:valor` y nodos/reglas Apriori hacia una categoría de servicio. | Patrón futuro para provenance, catálogos y relaciones normalizadas. | No es un algoritmo de inferencia independiente ni evidencia factual; no contiene PII ni texto crudo. |
| K2 / redes Bayesianas | K2 aprende un DAG dada una ordenación de variables y límite de padres, con score Bayesiano. | Posible investigación futura si existe muestra suficiente, semántica temporal y una pregunta estructural explícita. | No usar con los 50 perfiles de FuTour ni asumir causalidad. Para disputas exige una ADR de variables, orden y validación. No forma parte del consenso asociativo del grafo. |
| Taxonomía multinivel | Normaliza servicios narrativos en categorías antes de minar; evita reglas tautológicas y redundancia jerárquica. | Normalizar `case_type`, `category`, `subcategory` y futuros motivos de disputa antes de KDD. | La taxonomía debe ser versionada y revisada por negocio; no inferida solo por un LLM. |

## Información útil de actividades, papers y reporte

| Fuente de FuTour | Aporte recuperado | Decisión para Bankai |
| --- | --- | --- |
| Actividad 04 | CRUD, filtros e índices en una base documental. | Conservar la lección de contratos e índices; no adoptar MongoDB porque BigQuery es la fuente canónica. |
| Actividad 05 | Ingesta de JSON y consultas exploratorias sobre una colección textual. | Mantener el patrón de ingesta reproducible y consultas agregadas; no trasladar su dataset ni infraestructura. |
| Actividad 06 | Tokenización, stopwords, stemming, Bag of Words, recuperación booleana y similitud coseno. | Es referencia de IR clásica. No habilita vector-RAG, índice textual ni uso de `description`/transcripciones sin ADR, desidentificación y corpus autorizado. |
| Actividad 07 | Embeddings, k-NN, R-Tree, pgvector y búsqueda biométrica facial. | No aplicable: es biometría y recuperación vectorial; ambas están fuera del alcance y ADR 0011 excluye vector-RAG. |
| `ReglasAsociación.pdf` | Define soporte `P(X∩Y)`, confianza `P(Y|X)` y lift `confidence/P(Y)`. | Mantener esas métricas separadas de posterior Bayesiano y de métricas de clasificación. |
| `P487.pdf` — Agrawal y Srikant | Formaliza Apriori, AprioriTid y AprioriHybrid; este último escala al combinar ambas estrategias. | Usar Apriori/FP-Growth ahora; evaluar Hybrid únicamente si los artefactos KDD muestran presión de candidatos y una ADR aprueba su implementación. |
| `dami03_fpgrowth.pdf` y `Mining Frequent Patterns without Candidate Generation.pdf` — Han, Pei, Yin y Mao | Describe FP-tree, bases condicionales, crecimiento de patrones y minería sin generación de candidatos. Los dos archivos son referencias de edición distintas del mismo trabajo, no artefactos del pipeline. | FP-Growth es candidato de escalamiento para KDD: comparar su salida con Apriori bajo la misma población y umbrales antes de promoverlo. |
| `P407.pdf` y `han_vldb95_MultiLevel.pdf` | Reglas generalizadas sobre jerarquías y reducción de redundancia taxonómica. | Diseñar taxonomías de disputa antes de minar y prohibir reglas que combinen un ítem con su propio ancestro. |
| `K2.pdf` | DAG, orden de variables, límite de padres y heurística K2. | No incorporar K2 en P0; el orden/los padres y una muestra adecuada son decisiones de ADR, no hiperparámetros implícitos. |
| Informe Bayes + Apriori | Valida sobre 50 perfiles, cinco arquetipos y cinco categorías; sus métricas son funcionales, no evidencia de generalización. | Reutilizar su separación semántica y pruebas de consistencia, nunca sus conteos, umbrales o conclusiones como métricas de disputas. |

## Lectura del código copiado

La ruta actual de FuTour es `futour_engine.py`: ajusta
`BayesianArchetypeModel`, mina reglas en `AprioriServiceRecommender` y luego
materializa un `networkx.DiGraph`. El motor excluye deliberadamente el
arquetipo predicho de los antecedentes Apriori para evitar la tautología
`arquetipo → servicio`. Esa separación debe preservarse en Bankai:

```text
datos curados -> baseline predictivo con target definido
datos curados -> reglas KDD con métricas asociativas
reglas KDD consensuadas -> grafo local versionado y con provenance
artefacto publicado aprobado -> futuro catálogo KG-RAG
```

Las rutas `infer_apriori.py`, `infer_apriori_pg.py` y
`utils/knowledge_graph.py` son legado o compatibilidad. Sus nombres pueden
sugerir Apriori, pero las primeras dos realizan cálculo Bayesiano parcial; no
deben utilizarse como base del pipeline Bankai. Las pruebas actuales de
FuTour comprueban fórmulas y estabilidad de respuesta, pero no incluyen split
temporal, calibración, evaluación out-of-sample ni protección de datos.

## Criterio operativo para FP-Growth, Eclat y Hybrid

FP-Growth y Eclat no cambian la semántica de las reglas: soporte, confianza y
lift se calculan sobre la misma población e itemsets que Apriori. Cambian el
modo de encontrar los patrones frecuentes. Por ello la iteración KDD conserva
Apriori, FP-Growth y Eclat mientras el límite de 100,000 filas permita la
comparación, y el grafo exige la intersección de los tres con métricas idénticas.

AprioriHybrid (P487) combina pases horizontales con conteo por TID cuando el
tamaño estimado de candidatos cabe en memoria y el número de itemsets grandes
decrece. Debe coincidir con Apriori; sirve para medir rendimiento, no para un
voto adicional. `fpmax` se registra sólo como diagnóstico de itemsets maximales
y no alimenta `association_rules` ni el grafo.

Se preferirá FP-Growth u otra estrategia de búsqueda en una ejecución posterior
solo si, con la misma ventana, columnas, exclusiones y umbrales, mantiene o
mejora la concordancia de reglas relevantes y reduce el costo de cómputo.
Diferencias de reglas obligan a revisar transformación, orden de categorías y
parámetros; no se interpretan como evidencia de negocio. Apriori seguirá siendo
útil como baseline auditable. K2 permanece fuera hasta una ADR de variables y
orden. No se cruza complaints con transactions sin join canónico (C6).

## Decisiones pendientes de ADR

Antes de adaptar cualquier elemento de esta referencia, una ADR debe definir:

1. el caso `Ci`, objetivo, instante de predicción y variables permitidas;
2. la taxonomía versionada de motivos/estados de disputa y sus responsables;
3. splits temporales, métricas, calibración, fairness permitida y umbrales;
4. si un artefacto de reglas o Bayes puede alimentar un grafo, con schema,
   lineage, checksum y catálogo cerrado;
5. la política de texto, PII y evidencia, especialmente para actividades de
   recuperación clásica;
6. la acción humana permitida: las señales solo priorizan o explican y nunca
   rechazan una disputa ni determinan fraude por sí solas.

Estas pautas se subordinan a ADR 0009, ADR 0011, ADR 0015, ADR 0016, ADR 0018
y ADR 0020.
