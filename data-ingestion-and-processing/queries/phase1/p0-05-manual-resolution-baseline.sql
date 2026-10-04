-- query_id: p0-05-manual-resolution-baseline
-- purpose: P0-05 manual baseline for resolution-time KPI (Dispute Transaction Support)
-- timezone: America/Lima
-- population: category = Transactions AND status IN (Resolved, Closed)
-- excludes: non-terminal statuses; NULL resolution_days
-- formula: KPI = resolution_days; report mean, p50, p90 on the same snapshot
-- period: [period_start, period_end)
SELECT
  COUNT(*) AS terminal_population,
  COUNTIF(resolution_days IS NOT NULL) AS with_resolution_days,
  ROUND(AVG(resolution_days), 6) AS mean_resolution_days,
  APPROX_QUANTILES(resolution_days, 100)[OFFSET(50)] AS p50_resolution_days,
  APPROX_QUANTILES(resolution_days, 100)[OFFSET(90)] AS p90_resolution_days,
  COUNTIF(sla_breached) AS sla_breached_count,
  ROUND(SAFE_DIVIDE(COUNTIF(sla_breached), COUNT(*)), 6) AS sla_breach_rate
FROM `{project}.{dataset}.complaints`
WHERE category = 'Transactions'
  AND status IN ('Resolved', 'Closed')
  AND resolution_days IS NOT NULL
  AND creation_date >= TIMESTAMP(@period_start)
  AND creation_date < TIMESTAMP(@period_end)
