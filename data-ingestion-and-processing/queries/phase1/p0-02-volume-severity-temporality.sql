-- query_id: p0-02-volume-severity-temporality
-- purpose: P0-02 volume, severity and temporal patterns for Chosen Support
-- timezone: America/Lima
-- population: complaints.category = 'Transactions'
-- denominator: total Transactions complaints in the same period
-- period: [period_start, period_end)
SELECT
  FORMAT_TIMESTAMP('%Y-%m', creation_date, 'America/Lima') AS year_month,
  COUNT(*) AS volume,
  COUNTIF(priority IN ('High', 'Critical')) AS high_or_critical_count,
  COUNTIF(status = 'Escalated') AS escalated_count,
  COUNTIF(sla_breached) AS sla_breached_count,
  ROUND(AVG(IF(status IN ('Resolved', 'Closed'), resolution_days, NULL)), 4) AS mean_resolution_days_terminal
FROM `{project}.{dataset}.complaints`
WHERE category = 'Transactions'
  AND creation_date >= TIMESTAMP(@period_start)
  AND creation_date < TIMESTAMP(@period_end)
GROUP BY 1
ORDER BY 1
