# KDD: Dispute Transaction Support

## Propósito y evidencia

El notebook de referencia solo realiza entendimiento de datos: carga, elimina
duplicados, inspecciona nulos, estadísticos descriptivos y distribuciones. Se
convierte a `bankai_pipeline.data_understanding` para perfiles agregados, pero
no se reutilizan su SPSS, Google Colab, variables educativas ni la práctica de
eliminar todas las filas con nulos.

El inventario de `factored-hackathon.hackathon` confirmó las tablas
`transactions` (4,425,008 filas aproximadas) y `complaints` (67,095 filas
aproximadas). No existe una relación directa y autorizada entre
`complaint_id` y `transaction_id`; por ello son poblaciones independientes.

## Flujo KDD v1

1. Validar contratos y obtener una muestra determinista por clave primaria,
   ventana temporal y límite de bytes.
2. Generar perfil agregado: nulos, duplicados, tipos, cardinalidad, cuartiles
   y conteo IQR de outliers.
3. Transformar categorías controladas, booleanos y buckets numéricos. Los
   importes negativos se conservan como señal; las fechas no se imputan.
4. Construir itemsets para transacciones y reclamos por separado.
5. Ejecutar Apriori, FP-Growth, Eclat y AprioriHybrid sobre exactamente la
   misma matriz; filtrar reglas hacia `transaction_status` o `status` por
   support, confidence y lift. El grafo exige Apriori ∩ FP-Growth ∩ Eclat.
6. Publicar manifest, catálogo de features, perfil, reglas saneadas y
   diagnósticos (`fpmax`, tiempos, paridad Hybrid) por `run-id`. El resultado
   es exploratorio y no autoriza acciones online.

## Experimentos supervisados dentro del KDD

Los baselines supervisados son una fase de evaluación del conocimiento
descubierto, no una extensión del grafo ni un servicio. Cada uno mantiene su
propio target, instante de predicción, contrato y artefactos; las reglas de
asociación no se usan como labels ni como decisiones.

### C1 — Riesgo de incumplimiento de SLA (ejecutado)

El piloto `c1-pilot-20261003` leyó de forma acotada 5,000 reclamos
transaccionales: 3,500 hasta 2024 para entrenamiento, 750 de 2025 para
calibración y 750 de 2026 hasta el 18 de junio para prueba. Adaptó Naive Bayes
categórico suavizado con los atributos permitidos al alta y calibración
Platt/sigmoid. El artefacto no contiene filas, IDs ni scores individuales.

La prueba temporal obtuvo prevalencia 0.217, PR-AUC 0.211, Brier score 0.171 y
recall 0.000 al umbral informativo 0.5. La señal no supera el baseline de
prevalencia y no autoriza un umbral, priorización ni integración online. El
resultado es evidencia para revisar cobertura, features permitidos y calidad de
la etiqueta antes de una nueva ADR o experimento.

### C2 — Duración de resolución (ejecutado)

C2 usa exclusivamente reclamos `Resolved` o `Closed` con
`resolution_days` presente; los otros estados no aportan target. La inspección
agregada encontró 3,165 casos etiquetados, con P50 de 15 días y P90 de 27–28.
El piloto `c2-pilot-20261003` tomó 2,450 filas temporales y estimó P50/P90 por
`priority + reception_channel`, con fallback a prioridad y cohorte global. En
la prueba de 450 casos obtuvo MAE 7.472 días, cobertura empírica P50 de 0.516 y
P90 de 0.922. Estos resultados describen cohortes históricas; no prometen una
fecha de resolución ni autorizan una acción operativa.

El comparador global fue ligeramente mejor en esa misma prueba (MAE 7.422 y
cobertura P90 0.944). Por ello las cohortes de prioridad/canal no se promueven
como mejora: C2 queda como baseline global de capacidad hasta que exista una
feature permitida con ganancia temporal demostrable.

### C3–C5 — Suite completa de baselines (ejecutada)

C3 usa Naive Bayes ponderado sobre 21,000 transacciones estratificadas y
compara contra `fraud_score` calibrado. En prueba, el modelo nuevo obtuvo
PR-AUC 0.000957 frente a prevalencia 0.000878, mientras `fraud_score` obtuvo
PR-AUC 0.699446 sobre su población comparable: el score existente domina y el
baseline nuevo no se promueve.

C4 entrenó por separado seguimiento y escalamiento con atributos previos a la
interacción. Sus PR-AUC en prueba fueron 0.239391 (seguimiento) y 0.098534
(escalamiento), con recall cero al umbral informativo 0.5; son baselines de
diagnóstico, no reglas operativas. C5 modeló la escala observada 1–7 de
`main_score` con el join exacto de encuesta; obtuvo MAE 1.270024 y kappa
cuadrático 0.0, sin evidencia para automatizar recuperación de servicio.

`evaluate-supervised-suite` consolida hashes de C1–C5 y conserva C6–C8 como
bloqueados: falta relación canónica reclamo–operación, evidencia de comercio y
reconciliación de rail de pagos, respectivamente.

## Selección de minero de patrones

El KDD conserva varios mineros sobre la misma matriz para comparar sus
reglas, no para escoger uno por intuición:

- **Apriori** genera y poda candidatos; es el baseline auditable.
- **FP-Growth** comprime transacciones frecuentes en un FP-tree y crece
  patrones condicionales sin generar todos los candidatos.
- **Eclat** usa TID-lists verticales e intersección; tercer consensuador del
  grafo (misma semántica, otra estrategia de búsqueda).
- **AprioriHybrid** (P487) cambia a conteo por TID cuando el tamaño estimado
  de candidatos cabe en memoria y decrece; debe igualar los itemsets de
  Apriori y no vota en el grafo.
- **fpmax** solo diagnostica itemsets maximales; no genera reglas ni grafo.

La referencia de Han, Pei, Yin y Mao, *Mining Frequent Patterns without
Candidate Generation* (2004), está disponible en el repositorio FuTour bajo
los nombres `dami03_fpgrowth.pdf` y `Mining Frequent Patterns without
Candidate Generation.pdf`. Son dos copias/ediciones de referencia y no son
artefactos del pipeline. Su aporte se documenta en
[`futour-knowledge-graph-lessons.md`](futour-knowledge-graph-lessons.md).

La elección operativa se basa en métricas registradas: filas leídas, número
de ítems, número de itemsets/reglas, tiempo, memoria y concordancia triple
al aplicar los mismos umbrales. K2 no se implementa en el grafo asociativo.

## Alcance de datos

Transacciones usa estado, tipo/categoría, canal, categoría de comercio,
moneda, código de respuesta, fraude, monto y score de fraude. Reclamos de
Dispute Support se filtran a `category = 'Transactions'` y minan hacia
`status` con features de ingreso: tipo/categoría/subcategoría, canal,
prioridad, repetición y monto reclamado. No existe join canónico
complaint↔transaction (C6 bloqueado); no se inventa el cruce.

Se excluyen IDs, cliente, producto, sucursal, comercio, ciudad, coordenadas,
`description`, `resolution`, transcripts y cualquier texto libre. Las columnas
con cardinalidad superior al límite se excluyen antes de minar reglas.

### Consideraciones de papers y endurecimiento

Lecciones aplicadas desde
[`futour-knowledge-graph-lessons.md`](futour-knowledge-graph-lessons.md)
(Agrawal/Srikant Apriori/Hybrid, Han et al. FP-Growth / MultiLevel, Zaki Eclat):

1. **Anti-leakage**: si el target es `status`, no se minan `resolution_days*`
   ni `sla_breached` como antecedentes.
2. **MultiLevel**: se descartan antecedentes que mezclan `category` y
   `subcategory` en la misma regla; además se eliminan reglas descendientes
   cuya confianza está dentro de `han_redundancy_epsilon` de un ancestro.
3. **Scope Dispute**: población de reclamos limitada a Transactions.
4. **Deduplicación**: superconjuntos estrictos con las mismas métricas; sin
   filler `claimed_amount_sign=NON_NEGATIVE`.
5. **Consenso triple**: sólo reglas idénticas Apriori ∩ FP-Growth ∩ Eclat
   pasan al grafo; Hybrid debe empatar Apriori.

Run endurecido dual (`kdd-20261004-hardened`) sobre
`factored-hackathon.hackathon` (`[2023-06-17, 2026-06-19)`):

| Población | Reglas corroboradas (dual) | Consecuentes dominantes |
| --- | ---: | --- |
| transactions | 402 | APPROVED (395), DECLINED (7) |
| complaints | 33 | IN_PROCESS (33) |
| **Total al grafo** | **435** | — |

Run multi-algoritmo (`kdd-20261004-multialgo`): ver sección de análisis al
final tras regenerar artefactos; el grafo resultante usa consenso triple.

Umbrales del ejemplo: `min_support=0.01`, `min_confidence=0.40`,
`min_lift=1.05`, `han_redundancy_epsilon=0.05`.

## Ejecución

```bash
cp config/kdd.toml.example /ruta-segura/kdd.toml
bankai-pipeline --stage kdd --run-id kdd-20261004-multialgo --kdd-config /ruta-segura/kdd.toml --dry-run
bankai-pipeline --stage kdd --run-id kdd-20261004-multialgo --kdd-config /ruta-segura/kdd.toml
```

La segunda orden requiere ADC y acceso read-only a BigQuery. Escribe sólo
artefactos locales ignorados por Git bajo `artifacts/kdd/`; no crea tablas,
vistas, cargas ni modelos.

Los experimentos C1 y C2 son etapas separadas de KDD:

```bash
bankai-pipeline --stage train-naive-bayes --run-id c1-local-20261003 \
  --c1-config /ruta/c1.toml --dry-run
bankai-pipeline --stage train-resolution-baseline --run-id c2-local-20261003 \
  --c2-config /ruta/c2.toml --dry-run
```

Sus ejecuciones normales sólo realizan las consultas acotadas de la
configuración y escriben en `artifacts/c1/` o `artifacts/c2/`. No actualizan
BigQuery, no publican GCS y no habilitan un modelo o grafo en el backend.

## Compilación local del grafo v1

La etapa siguiente consume una carpeta KDD local completa y no vuelve a leer
BigQuery:

```bash
bankai-pipeline --stage compile-graph --run-id graph-20261004-multialgo \
  --kdd-artifact-dir artifacts/kdd/kdd-20261004-multialgo --dry-run
bankai-pipeline --stage compile-graph --run-id graph-20261004-multialgo \
  --kdd-artifact-dir artifacts/kdd/kdd-20261004-multialgo
```

El compilador valida catálogos, columnas permitidas y métricas; acepta solo
reglas idénticas de Apriori, FP-Growth y Eclat. Cada regla se materializa como
nodo con aristas de antecedentes y una arista `predicts` con soporte,
confianza y lift. Esto conserva la semántica de una conjunción: no se crean
aristas directas `feature_value → target` que presentarían una asociación como
hecho.

El resultado local es `artifacts/graph/<run-id>/graph-v1.msgpack` y su
`graph-manifest.json`, ambos reproducibles y sin PII, texto, IDs o filas. No
publica GCS ni llama al backend. La etapa separada `publish --local-target`
emula para el tenant `demo-bankai` un paquete inmutable, su catálogo KG-RAG y
`current.json`; GCS, el lease Firestore y la publicación productiva siguen
pendientes de ADR 0020.

## Análisis multi-algoritmo (`kdd-20261004-multialgo`)

Misma ventana y umbrales que el run endurecido; mineros `apriori`,
`fpgrowth`, `eclat`, `apriori_hybrid` + diagnóstico `fpmax`.

| Métrica | transactions | complaints |
| --- | ---: | ---: |
| Reglas por miner (cada uno) | 402 | 24 |
| Jaccard pairwise / triple | 1.0 | 1.0 |
| Reglas perdidas dual→triple | 0 | 0 |
| Hybrid ≡ Apriori (itemsets) | sí (11,751) | sí (2,515) |
| fpmax maximales (overlap Apriori) | 13 (13) | 40 (40) |
| Tiempo Apriori / FP-Growth / Eclat / Hybrid (s) | 4.27 / 1.60 / 6.59 / 19.67 | 0.23 / 0.20 / 0.31 / 0.66 |

Efecto Han (`han_redundancy_epsilon=0.05`): complaints pasó de 33 reglas duales
en `kdd-20261004-hardened` a 24; las 9 eliminadas son descendientes
taxonómicos con confianza ≈ ancestro. Transactions no tiene jerarquía
configurada y se mantiene en 402.

Grafo `graph-20261004-multialgo`: 426 reglas corroboradas, 539 nodos, 1,748
aristas, SHA-256 `95d4757e9fa5a8c71f5f3e0cbe3272a96bea6300ce2258f319715925d958636d`
(vs hardened 435 / 553 / 1,787). Consecuentes: APPROVED 395, DECLINED 7,
IN_PROCESS 24. Sin leakage (`sla_breached` / `resolution_days` ausentes).
`fpmax` no alteró el grafo. Publicado localmente en
`app/backend/.local/kg-rag/demo-bankai/graph-20261004-multialgo`.

FP-Growth fue el más rápido; Hybrid el más lento (generación de candidatos
propia). Eclat corroboró al 100% las reglas duales: el tercer voto no recortó
señal adicional tras MultiLevel Han.
