-- The holidays that cost the most: wrongly-late requests whose window held each
-- weekday holiday.
SELECT
  h.day                                                 AS holiday,
  h.holiday_name                                        AS name,
  count(*)                                              AS wrongly_late
FROM request_verdicts v
JOIN calendar h
  ON h.day > v.opened_on AND h.day <= v.closed_on
 AND h.holiday_name IS NOT NULL AND h.weekday BETWEEN 1 AND 5
WHERE v.late_calendar AND NOT v.late_working
GROUP BY h.day
ORDER BY wrongly_late DESC, h.day
LIMIT 10;
