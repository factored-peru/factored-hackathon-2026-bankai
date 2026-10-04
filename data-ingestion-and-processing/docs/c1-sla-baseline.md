# C1: baseline local de riesgo de incumplimiento de SLA

## Propósito

C1 estima de manera experimental la probabilidad de que un reclamo de
`category = Transactions` incumpla SLA. Es un baseline offline para evaluación:
no ordena colas, no altera un SLA, no rechaza un reclamo y no se integra al
backend ni al grafo.

## Datos y partición del piloto

La inspección agregada verificó 13,580 reclamos transaccionales entre
2023-06-17 y 2026-06-18, con 2,739 positivos (`sla_breached = true`). El
archivo `config/c1.toml.example` fija un total de 5,000 filas, seleccionadas
determinísticamente por hash de `complaint_id` pero sin recuperar ese ID:

| Uso | Ventana | Tamaño |
| --- | --- | ---: |
| Entrenamiento | inicio disponible–2024-12-31 | 3,500 |
| Calibración | 2025 | 750 |
| Prueba | 2026-01-01–2026-06-18 | 750 |

Cada ventana se estratifica por `sla_breached`; sus cuotas y conteos se guardan
como agregados en el manifiesto. Si una ventana no contiene ambos resultados o
no alcanza el tamaño configurado, la ejecución falla en vez de ampliar la
muestra o mezclar periodos.

## Cómputo y límites

El modelo adapta el Naive Bayes categórico con suavizado Laplace de la
referencia FuTour. Entrena con `case_type`, `category`, `subcategory`,
`reception_channel`, `priority`, `currency`, `is_repeat_complainer`, bucket de
`claimed_amount`, mes y día de semana de `creation_date`. Los límites de monto
se aprenden exclusivamente en entrenamiento. La probabilidad posterior se
calibra mediante Platt/sigmoid en la partición 2025.

Quedan excluidos `complaint_id`, `customer_id`, `status`, asignación, fechas y
campos de resolución, compensación, descripción y transcripciones. Valores no
vistos se ignoran como evidencia Bayesiana; nulos se representan como
`UNKNOWN`. Una cardinalidad por feature superior a la configuración bloquea el
run para evitar que un campo libre o identificador llegue al modelo.

El reporte contiene PR-AUC, recall informativo en 0.5, Brier score, matriz de
confusión y bins de calibración sobre la prueba temporal. El 0.5 no es un
umbral operativo. Aprobar una acción, umbral o integración requiere ADR,
revisión humana y las gates de evaluación correspondientes.

## Artefactos

El run local escribe únicamente artefactos ignorados por Git:

- `c1-model.json`: conteos Bayesianos saneados, dominios permitidos y
  coeficientes de calibración; no filas ni scores individuales.
- `c1-manifest.json`: hashes de consultas/configuración, lineage, tamaños,
  exclusiones y métricas agregadas.

No se genera un artefacto de grafo. Las asociaciones KDD y el grafo continúan
siendo evidencia separada de la predicción supervisada C1.
