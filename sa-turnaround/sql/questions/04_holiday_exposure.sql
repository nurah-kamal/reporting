-- Is it really the holidays? Compare requests whose open-to-close window held
-- a weekday public holiday with those that did not.
SELECT
  CASE WHEN weekday_holidays = 0 THEN 'No holiday in the window'
       WHEN weekday_holidays = 1 THEN 'One holiday'
       ELSE 'Two or more' END                           AS window,
  count(*)                                              AS closed_requests,
  round(100.0 * avg(late_calendar), 1)                  AS late_calendar_pct,
  round(100.0 * avg(late_working), 1)                   AS late_working_pct
FROM request_verdicts
GROUP BY min(weekday_holidays, 2)
ORDER BY min(weekday_holidays, 2);
