-- Turnaround per category: median and 90th percentile in working days, and the
-- late rate under each measure. SQLite has no percentile function, so each
-- request is ranked within its category and the rank at 50% and 90% is read off.
WITH ranked AS (
  SELECT
    category, target_working_days, working_days, late_working, late_calendar,
    row_number() OVER (PARTITION BY category ORDER BY working_days) AS rn,
    count(*)     OVER (PARTITION BY category)                      AS n
  FROM request_verdicts
)
SELECT
  category,
  max(target_working_days)                                          AS target,
  max(n)                                                            AS closed_requests,
  max(CASE WHEN rn = CAST(ceil(0.5 * n) AS INTEGER) THEN working_days END) AS median_working,
  max(CASE WHEN rn = CAST(ceil(0.9 * n) AS INTEGER) THEN working_days END) AS p90_working,
  round(100.0 * avg(late_working), 1)                               AS late_working_pct,
  round(100.0 * avg(late_calendar), 1)                              AS late_calendar_pct
FROM ranked
GROUP BY category
ORDER BY late_working_pct DESC;
