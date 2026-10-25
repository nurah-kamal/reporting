-- With holidays taken out, is any category genuinely getting slower?
SELECT
  substr(opened_on, 1, 4) || '-Q' || ((CAST(substr(opened_on, 6, 2) AS INTEGER) + 2) / 3) AS quarter,
  category,
  count(*)                                              AS closed_requests,
  round(avg(working_days), 2)                           AS avg_working,
  round(100.0 * avg(late_working), 1)                   AS late_working_pct
FROM request_verdicts
GROUP BY quarter, category
ORDER BY quarter, category;
