setUpShell();

// Twelve weeks of everything the board reports. All of it comes out of WEEKS in
// data.js, which is itself worked out from the same request rows every other page reads.

const MEASURES = [
  {
    key: 'opened',
    name: 'Arriving',
    label: 'requests',
    format: formatNumber,
    value: (week) => week.opened,
    about: 'Requests counted on the week they arrived. This is supply — how much came in. It says nothing about how well any of it was handled.'
  },
  {
    key: 'sameDay',
    name: 'Answered in a day',
    label: 'share',
    format: (value) => `${Math.round(value)}%`,
    value: (week) => (week.sameDay === null ? null : week.sameDay * 100),
    about: 'Of the requests that week with a recorded reply, the share replied to within a day. A week where nobody recorded anything cannot be measured and is left out of the line rather than drawn as zero.'
  },
  {
    key: 'waiting',
    name: 'Nothing recorded',
    label: 'requests',
    format: formatNumber,
    value: (week) => week.waiting,
    about: 'Requests from that week that still have nothing written against them. Recent weeks will always look worse, because there has been less time for anybody to write anything.'
  }
];

const state = { measure: 'opened' };

const chosen = () => MEASURES.find((measure) => measure.key === state.measure) || MEASURES[0];

function showChart() {
  const measure = chosen();
  const points = WEEKS
    .map((week) => ({ label: week.label, value: measure.value(week) }))
    .filter((point) => point.value !== null);

  const holder = document.getElementById('trend-chart');
  document.getElementById('trend-title').textContent = `${measure.name} — twelve weeks`;
  document.getElementById('trend-about').textContent = measure.about;

  if (points.length < 2) {
    holder.replaceChildren(create('p', 'empty', 'Not enough weeks carry this measure to draw a line.'));
    return;
  }

  holder.replaceChildren(areaChart(points, { format: measure.format, label: measure.label, key: measure.name }));
}

function showNote() {
  const measure = chosen();
  const values = WEEKS.map(measure.value).filter((value) => value !== null);
  const latest = values[values.length - 1];
  const earliest = values[0];
  const change = movement(latest, earliest, { good: measure.key === 'opened' ? 'up' : measure.key === 'sameDay' ? 'up' : 'down' });

  const note = document.getElementById('trends-note');
  note.replaceChildren();
  note.append(document.createTextNode(`${measure.name.toLowerCase()} · twelve weeks to ${SNAPSHOT.read.toLowerCase()} · `));

  if (change) {
    note.append(document.createTextNode(`${measure.format(earliest)} then, ${measure.format(latest)} now `));
    note.append(statusChip(change));
  } else {
    note.append(document.createTextNode(`${measure.format(latest)} now`));
  }
}

function showTable() {
  const table = document.getElementById('weeks-table');
  table.replaceChildren();

  const head = create('thead');
  const headRow = create('tr');
  ['Week', 'Arriving', 'Replies recorded', 'Nothing recorded', 'Answered in a day', 'Hours to first reply', 'Full notes'].forEach((label, index) => {
    const cell = create('th', '', label);
    cell.scope = 'col';
    if (index) cell.className = 'cell-number';
    headRow.append(cell);
  });
  head.append(headRow);

  const body = create('tbody');
  [...WEEKS].reverse().forEach((week) => {
    const line = create('tr');

    const first = create('th', 'cell-name');
    first.scope = 'row';
    first.append(create('b', '', week.label));

    const waiting = numberCell('', week.waiting);
    waiting.append(statusChip({ tone: week.waiting > 2 ? 'changed' : week.waiting ? 'waiting' : 'good', text: formatNumber(week.waiting) }));

    line.append(
      first,
      numberCell(formatNumber(week.opened), week.opened),
      numberCell(formatNumber(week.answered), week.answered),
      waiting,
      numberCell(week.sameDay === null ? '—' : formatPercent(week.sameDay), week.sameDay === null ? -1 : week.sameDay),
      numberCell(week.hoursToReply === null ? '—' : formatHours(week.hoursToReply), week.hoursToReply === null ? -1 : week.hoursToReply),
      numberCell(formatNumber(week.fullNotes), week.fullNotes)
    );
    body.append(line);
  });

  table.append(head, body);
  labelCells(table);
  sortableTable(table);
}

function render() {
  showChart();
  showNote();
  showTable();
}

const exportRows = exportButton('Export these rows', () => {
  downloadRows(
    'twelve-weeks',
    ['Week', 'Arriving', 'Replies recorded', 'Nothing recorded', 'Answered in a day (%)', 'Hours to first reply', 'Full notes'],
    [...WEEKS].reverse().map((week) => [
      week.label, week.opened, week.answered, week.waiting,
      week.sameDay === null ? '' : Math.round(week.sameDay * 100),
      week.hoursToReply === null ? '' : week.hoursToReply,
      week.fullNotes
    ])
  );
});
document.querySelector('[aria-labelledby="weeks-title"] .panel-head').append(exportRows);

// The chosen measure lives in the address bar, so a view can be sent to somebody.
const fromUrl = Params.get('measure', '');
if (MEASURES.some((measure) => measure.key === fromUrl)) state.measure = fromUrl;
buildSegmented(
  document.getElementById('measure-picker'),
  MEASURES.map((measure) => [measure.key, measure.name]),
  state.measure,
  (value) => {
    state.measure = value;
    Params.set({ measure: value === 'opened' ? '' : value });
    render();
  }
);

startPage(render);
