-- query_id: p0-02-population-denominator
-- purpose: P0-02 denominators and severity mix for Chosen Support
-- timezone: America/Lima
-- population: complaints.category = 'Transactions'
-- period: [period_start, period_end)
SELECT
  COUNT(*) AS population_count,
  COUNTIF(priority = 'Low') AS priority_low,
  COUNTIF(priority = 'Medium') AS priority_medium,
  COUNTIF(priority = 'High') AS priority_high,
  COUNTIF(priority = 'Critical') AS priority_critical,
  COUNTIF(status = 'Open') AS status_open,
  COUNTIF(status = 'In Process') AS status_in_process,
  COUNTIF(status = 'Escalated') AS status_escalated,
  COUNTIF(status = 'Resolved') AS status_resolved,
  COUNTIF(status = 'Closed') AS status_closed,
  COUNTIF(status = 'Rejected') AS status_rejected,
  COUNTIF(reception_channel IS NOT NULL) AS with_reception_channel,
  COUNTIF(origin_interaction_id IS NOT NULL) AS with_origin_interaction
FROM `{project}.{dataset}.complaints`
WHERE category = 'Transactions'
  AND creation_date >= TIMESTAMP(@period_start)
  AND creation_date < TIMESTAMP(@period_end)
