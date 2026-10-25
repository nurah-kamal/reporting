-- Which months does the calendar measure punish? Grouped by the month a request
-- was opened.
SELECT
  opened_month                                          AS month,
  count(*)                                              AS closed_requests,
  round(100.0 * avg(late_calendar), 1)                  AS late_calendar_pct,
  round(100.0 * avg(late_working), 1)                   AS late_working_pct,
  sum(late_calendar AND NOT late_working)               AS wrongly_late
FROM request_verdicts
GROUP BY opened_month
ORDER BY opened_month;
