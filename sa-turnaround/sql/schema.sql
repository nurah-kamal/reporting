-- One row per day. wd_index is a running count of working days, so the working
-- days between two dates is a subtraction instead of a loop:
--   working days from a to b = wd_index(b) - wd_index(a)
-- which counts the working days after a, up to and including b (same as
-- workingDaysBetween in src/workdays.js; tests/sql.test.js checks they agree).
CREATE TABLE calendar (
  day          TEXT PRIMARY KEY,   -- 'YYYY-MM-DD'
  weekday      INTEGER NOT NULL,   -- 0 Sunday .. 6 Saturday
  holiday_name TEXT,               -- NULL on an ordinary day
  holiday_kind TEXT,               -- statutory, sunday-rule or declared
  is_working   INTEGER NOT NULL,
  wd_index     INTEGER NOT NULL
);

CREATE TABLE requests (
  request_id          TEXT PRIMARY KEY,
  opened_on           TEXT NOT NULL REFERENCES calendar(day),
  closed_on           TEXT REFERENCES calendar(day),   -- NULL while still open
  channel             TEXT NOT NULL,
  category            TEXT NOT NULL,
  target_working_days INTEGER NOT NULL
);

-- Two ways to measure the same request.
--   working_days:   the honest measure, against the target as written.
--   calendar_days:  what a spreadsheet gives you by subtracting dates. To be fair
--                   to it, the target is stretched for weekends (x 7/5, rounded
--                   up), so the only thing it gets wrong is public holidays.
CREATE VIEW request_times AS
SELECT
  r.*,
  substr(r.opened_on, 1, 7)                                   AS opened_month,
  CAST(julianday(r.closed_on) - julianday(r.opened_on) AS INTEGER) AS calendar_days,
  c.wd_index - o.wd_index                                     AS working_days,
  CAST(ceil(r.target_working_days * 7.0 / 5) AS INTEGER)      AS calendar_target,
  (SELECT count(*) FROM calendar h
    WHERE h.day > r.opened_on AND h.day <= r.closed_on
      AND h.holiday_name IS NOT NULL AND h.weekday BETWEEN 1 AND 5) AS weekday_holidays
FROM requests r
JOIN calendar o ON o.day = r.opened_on
JOIN calendar c ON c.day = r.closed_on
WHERE r.closed_on IS NOT NULL;

CREATE VIEW request_verdicts AS
SELECT
  t.*,
  t.working_days  > t.target_working_days AS late_working,
  t.calendar_days > t.calendar_target     AS late_calendar
FROM request_times t;
