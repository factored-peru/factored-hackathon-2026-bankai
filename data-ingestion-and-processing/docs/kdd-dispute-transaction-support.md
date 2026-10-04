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
5. Ejecutar Apriori y FP-Growth sobre exactamente la misma matriz; filtrar
   reglas hacia `transaction_status` o `status` por support, confidence y lift.
6. Publicar manifest, catálogo de features, perfil y reglas saneadas por
   `run-id`. El resultado es exploratorio y no autoriza acciones online.

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

El KDD v1 conserva ambos mineros sobre la misma matriz para comparar sus
reglas, no para escoger uno por intuición:

- **Apriori** genera y poda candidatos; es útil cuando el máximo de ítems,
  cardinalidad y tamaño de muestra son bajos y se necesita inspeccionar la
  generación de reglas.
- **FP-Growth** comprime las transacciones frecuentes en un FP-tree y crece
  patrones condicionales sin generar todos los candidatos. Es el candidato
  preferente cuando existen muchos candidatos, patrones largos o una matriz
  dispersa grande.

La referencia de Han, Pei, Yin y Mao, *Mining Frequent Patterns without
Candidate Generation* (2004), está disponible en el repositorio FuTour bajo
los nombres `dami03_fpgrowth.pdf` y `Mining Frequent Patterns without
Candidate Generation.pdf`. Son dos copias/ediciones de referencia y no son
artefactos del pipeline. Su aporte se documenta en
[`futour-knowledge-graph-lessons.md`](futour-knowledge-graph-lessons.md).

La elección futura debe basarse en métricas registradas: filas leídas, número
de ítems, número de itemsets/reglas, tiempo, memoria y concordancia de reglas
al aplicar los mismos umbrales. AprioriHybrid no se implementa: solo se
evaluará mediante ADR si Apriori y FP-Growth no satisfacen los límites
operacionales.

## Alcance de datos

Transacciones usa estado, tipo/categoría, canal, categoría de comercio,
moneda, código de respuesta, fraude, monto y score de fraude. Reclamos usa
estado, tipo/categoría/subcategoría, canal de recepción, prioridad, SLA,
repetición, monto reclamado y días de resolución.

Se excluyen IDs, cliente, producto, sucursal, comercio, ciudad, coordenadas,
`description`, `resolution`, transcripts y cualquier texto libre. Las columnas
con cardinalidad superior al límite se excluyen antes de minar reglas.

## Ejecución

```bash
cp config/kdd.toml.example /ruta-segura/kdd.toml
bankai-pipeline --stage kdd --run-id kdd-20261003 --kdd-config /ruta-segura/kdd.toml --dry-run
bankai-pipeline --stage kdd --run-id kdd-20261003 --kdd-config /ruta-segura/kdd.toml
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
bankai-pipeline --stage compile-graph --run-id graph-local-20261003 \
  --kdd-artifact-dir artifacts/kdd/KDD_RUN_ID --dry-run
bankai-pipeline --stage compile-graph --run-id graph-local-20261003 \
  --kdd-artifact-dir artifacts/kdd/KDD_RUN_ID
```

El compilador valida catálogos, columnas permitidas y métricas; acepta solo
reglas idénticas de Apriori y FP-Growth. Cada regla se materializa como nodo
con aristas de antecedentes y una arista `predicts` con soporte, confianza y
lift. Esto conserva la semántica de una conjunción: no se crean aristas
directas `feature_value → target` que presentarían una asociación como hecho.

El resultado local es `artifacts/graph/<run-id>/graph-v1.msgpack` y su
`graph-manifest.json`, ambos reproducibles y sin PII, texto, IDs o filas. No
publica GCS, no actualiza `current.json`, no genera catálogo KG-RAG y no llama
al backend; esas responsabilidades siguen pendientes de una ADR e
implementación posteriores.
