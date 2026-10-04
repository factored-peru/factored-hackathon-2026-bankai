-- query_id: p0-01-contact-motive-distribution
-- purpose: P0-01 distribution of contact/dispute motives for Chosen Support
-- timezone: America/Lima
-- population: complaints.category = 'Transactions'
-- period: [period_start, period_end)
-- excludes: raw PII columns (customer_id, description, agent ids, resolution text)
SELECT
  COALESCE(subcategory, 'UNKNOWN') AS motive,
  COALESCE(case_type, 'UNKNOWN') AS case_type,
  COUNT(*) AS complaint_count,
  ROUND(COUNT(*) / SUM(COUNT(*)) OVER (), 6) AS share
FROM `{project}.{dataset}.complaints`
WHERE category = 'Transactions'
  AND creation_date >= TIMESTAMP(@period_start)
  AND creation_date < TIMESTAMP(@period_end)
GROUP BY 1, 2
ORDER BY complaint_count DESC
