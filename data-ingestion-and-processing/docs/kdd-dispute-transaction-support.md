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
vistas, cargas, modelos ni artefactos de grafo.
