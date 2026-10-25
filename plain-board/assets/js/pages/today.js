setUpShell();

// What needs somebody today, before any of the figures below. One message: the requests
// that have sat over a week with nothing recorded. How many arrived today, and how many
// replies were one word, are said once in the panels below (the waiting chart and What
// people wrote down), so the banner does not say them again.
function showStart(rows) {
  const waiting = unanswered(rows);
  const items = [
    {
      count: waiting.filter((request) => request.days >= 8).length,
      one: 'request has waited over a week with nothing recorded',
      many: 'requests have waited over a week with nothing recorded',
      tone: 'is-stop',
      // Over a week is two bands, so the link opens the waiting list rather than one of them.
      href: 'requests.html'
    }
  ].filter((item) => item.count);

  const holder = document.getElementById('start-here');
  holder.replaceChildren(buildBanner(items, {
    action: 'Open the waiting list',
    calmTitle: 'Nothing in this selection has waited over a week.',
    calmNote: 'Everything older than a week has a reply recorded against it.'
  }));
}

// Four figures, each a label, the figure and one line: its base and, against the same
// length of time just before, how it moved. The runs behind them are in The last six
// weeks, lower down, rather than drawn small inside each card.
function showTiles(rows) {
  const answered = replied(rows);
  const waiting = unanswered(rows);
  const sameDay = answeredWithinADay(rows).length;
  const middle = median(answered.map((request) => request.reply));

  // The same selection, one period earlier. On the longest period the board reaches
  // the start of its own data, so there is nothing honest to compare against and the
  // line says so instead of moving.
  const comparable = hasPrevious(filterState.range);
  const before = comparable ? previousRows() : [];
  const beforeAnswered = replied(before);
  const beforeSameDay = answeredWithinADay(before).length;
  const beforeMiddle = median(beforeAnswered.map((request) => request.reply));
  const since = ` on the ${rangeLabel().toLowerCase()} before`;
  const nothingBefore = `Nothing earlier to compare with`;

  // A share has to be compared as a share, not as a count of the rows behind it.
  const shareNow = answered.length ? Math.round((sameDay / answered.length) * 100) : null;
  const shareBefore = beforeAnswered.length ? Math.round((beforeSameDay / beforeAnswered.length) * 100) : null;

  const tiles = [
    {
      label: 'Requests',
      value: formatNumber(rows.length),
      // No better direction: the reader picks the side they care about.
      watch: { value: rows.length, unit: 'requests', better: null },
      // More requests arriving is not better or worse, it is busier, so the line states
      // the move in grey and stops there.
      note: comparable ? '' : nothingBefore,
      verdict: comparable ? changeWords(movement(rows.length, before.length, { good: null, suffix: since })) : null,
      about: 'One row per request, counted once. It is what the board holds, not what was sent: nothing here checks that every request arrived. The movement compares this period with the same length of time immediately before it.'
    },
    {
      label: 'Answered within a day',
      value: shareNow === null ? '—' : `${shareNow}%`,
      watch: { value: shareNow, unit: 'per cent', better: 'above' },
      note: answered.length ? `${formatNumber(sameDay)} of ${formatNumber(answered.length)} replies` : 'Nothing recorded to measure',
      verdict: comparable && shareNow !== null && shareBefore !== null
        ? changeWords(movement(shareNow, shareBefore, { good: 'up', suffix: since }))
        : null,
      about: 'Counted only on requests that have a recorded reply. A request nobody wrote anything against cannot be measured at all, so it is left out rather than counted as slow.'
    },
    {
      label: 'Nothing recorded',
      value: formatNumber(waiting.length),
      watch: { value: waiting.length, unit: 'requests', better: 'below' },
      note: waiting.length ? `Longest ${waitingWords(Math.max(...waiting.map((request) => request.days))).toLowerCase()}` : 'Everything has a reply recorded',
      verdict: comparable ? changeWords(movement(waiting.length, unanswered(before).length, { good: 'down', suffix: since })) : null,
      about: 'Requests with no reply written against them. It does not prove nobody replied, only that nobody wrote it down. A recent period always looks worse, because there has been less time for anybody to write anything.'
    },
    {
      label: 'Hours to first reply',
      value: middle === null ? '—' : formatHours(middle),
      watch: { value: middle, unit: 'hours', better: 'below' },
      note: comparable && middle !== null && beforeMiddle !== null ? '' : nothingBefore,
      verdict: comparable && middle !== null && beforeMiddle !== null
        ? changeWords(movement(middle, beforeMiddle, { good: 'down', suffix: since }))
        : null,
      about: 'The middle value, not the average, so one very old request cannot drag it. Only requests carrying a recorded reply can be measured.'
    }
  ];

  document.getElementById('tiles').replaceChildren(...tiles.map(statTile));
}

// The six weeks the figure cards used to draw as small charts, as a table that names
// its weeks and its values. Every request, whatever the filters: it is the run the
// period above sits in.
function showWeeks() {
  const table = document.getElementById('weeks-table');
  table.replaceChildren();

  const head = create('thead');
  const headRow = create('tr');
  ['Week', 'Requests', 'Answered within a day', 'Nothing recorded', 'Hours to first reply'].forEach((label, index) => {
    const cell = create('th', index ? 'cell-number' : '', label);
    cell.scope = 'col';
    headRow.append(cell);
  });
  head.append(headRow);

  const body = create('tbody');
  WEEKS.slice(-6).reverse().forEach((week) => {
    const line = create('tr');
    const first = create('th', 'cell-name');
    first.scope = 'row';
    first.append(create('b', '', week.label));
    line.append(
      first,
      numberCell(formatNumber(week.opened), week.opened),
      numberCell(week.sameDay === null ? '—' : formatPercent(week.sameDay), week.sameDay === null ? -1 : week.sameDay),
      numberCell(formatNumber(week.waiting), week.waiting),
      numberCell(week.hoursToReply === null ? '—' : formatHours(week.hoursToReply), week.hoursToReply === null ? -1 : week.hoursToReply)
    );
    body.append(line);
  });

  table.append(head, body);
  labelCells(table);
}

function showWaiting(rows) {
  const waiting = unanswered(rows);
  const bars = WAIT_BANDS.map(([key, label]) => ({
    label,
    value: waiting.filter((request) => bandOf(request.days) === key).length,
    note: key === '15-plus' ? 'oldest' : ''
  }));
  document.getElementById('waiting-chart').replaceChildren(columnChart(bars));
}

function showChannels(rows) {
  const slices = CHANNELS.map((channel) => ({
    label: channel,
    value: rows.filter((request) => request.channel === channel).length
  })).filter((slice) => slice.value);

  const holder = document.getElementById('channel-chart');
  if (!slices.length) {
    holder.replaceChildren(create('p', 'empty', 'Nothing in this selection.'));
    return;
  }
  holder.replaceChildren(donutChart(slices));
}

function showArrivals() {
  document.getElementById('arrivals-chart').replaceChildren(areaChart(ARRIVALS, { label: 'requests', key: 'Requests arriving' }));
}

function showNotes(rows) {
  const answered = replied(rows);
  const bars = Object.entries(NOTE_GRADES)
    .map(([key, label]) => ({
      label,
      value: answered.filter((request) => noteGrade(request.note) === key).length
    }))
    .filter((row) => row.value);

  const holder = document.getElementById('notes-chart');
  if (!bars.length) {
    holder.replaceChildren(create('p', 'empty', 'No replies recorded in this selection.'));
    return;
  }
  holder.replaceChildren(barList(bars));
}

// Drawing or removing a line changes what the tiles say, so the tiles are drawn again.
function redrawTiles() {
  showTiles(currentRows());
}

function render() {
  const rows = currentRows();
  showFilterNote('filter-note', rows);
  showStart(rows);
  showTiles(rows);
  showWaiting(rows);
  showChannels(rows);
  showArrivals();
  showNotes(rows);
  showWeeks();
}

setUpFilters(render);
startPage(render);
