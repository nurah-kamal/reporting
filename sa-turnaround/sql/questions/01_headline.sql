-- How many requests does each measure call late, and how many of the calendar
-- measure's "late" requests were on time in working days?
SELECT
  count(*)                                              AS closed_requests,
  sum(late_calendar)                                    AS late_by_calendar,
  sum(late_working)                                     AS late_by_working_days,
  sum(late_calendar AND NOT late_working)               AS wrongly_late,
  round(100.0 * sum(late_calendar AND NOT late_working) / sum(late_calendar), 1) AS wrongly_late_pct,
  sum(late_working AND NOT late_calendar)               AS missed_late
FROM request_verdicts;
