setUpShell();

// No figure cards on this page: a card per channel said its count, its change and its
// time to reply, which the table under the charts already says, row by row.
const countsByChannel = (rows) => CHANNELS.map((channel) => ({
  channel,
  rows: rows.filter((request) => request.channel === channel)
}));

// The one chart that needs two periods side by side.
function showComparison(rows, before, comparable) {
  const holder = document.getElementById('compare-chart');
  const note = document.getElementById('compare-note');

  if (!comparable) {
    holder.replaceChildren(create('p', 'empty', noComparison()));
    note.textContent = 'The longest period reaches the start of the data the board holds, so there is nothing behind it to compare against. Choose a shorter period.';
    return;
  }

  const bars = countsByChannel(rows).map(({ channel, rows: own }) => ({
    label: channel,
    first: before.filter((request) => request.channel === channel).length,
    second: own.length
  }));

  holder.replaceChildren(pairedBars(bars, { first: `Previous ${rangeLabel().toLowerCase()}`, second: `This ${rangeLabel().toLowerCase()}` }));
  note.textContent = `Both periods are the same length. A channel that grew may simply have been used more, not have got worse.`;
}

function showShare(rows) {
  const slices = countsByChannel(rows)
    .map(({ channel, rows: own }) => ({ label: channel, value: own.length }))
    .filter((slice) => slice.value);

  const holder = document.getElementById('share-chart');
  if (!slices.length) {
    holder.replaceChildren(create('p', 'empty', 'Nothing in this selection.'));
    return;
  }
  holder.replaceChildren(donutChart(slices));
}

function showTable(rows, before, comparable) {
  const table = document.getElementById('channel-table');
  table.replaceChildren();

  const head = create('thead');
  const headRow = create('tr');
  ['Channel', 'Requests', 'Change', 'Replies recorded', 'Nothing recorded', 'Hours to first reply'].forEach((label, index) => {
    const cell = create('th', '', label);
    cell.scope = 'col';
    if (index) cell.className = 'cell-number';
    headRow.append(cell);
  });
  head.append(headRow);

  const body = create('tbody');
  const present = countsByChannel(rows).filter(({ rows: own }) => own.length);

  if (!present.length) {
    const line = create('tr');
    const cell = create('td', 'is-empty', 'No channel has a request in this selection.');
    cell.colSpan = 6;
    line.append(cell);
    body.append(line);
  }

  present.forEach(({ channel, rows: own }) => {
    const answered = replied(own);
    const waiting = unanswered(own);
    const middle = median(answered.map((request) => request.reply));
    const earlier = before.filter((request) => request.channel === channel).length;
    const change = comparable ? movement(own.length, earlier) : null;

    const line = create('tr');
    const first = create('th', 'cell-name');
    first.scope = 'row';
    first.append(create('b', '', channel));

    const changeCell = numberCell('', earlier ? own.length - earlier : -9999);
    if (change) changeCell.append(statusChip(change));
    else changeCell.append(create('span', 'is-empty', '—'));

    const waitingCell = numberCell('', waiting.length);
    waitingCell.append(statusChip({
      tone: waiting.length ? 'waiting' : 'good',
      text: formatNumber(waiting.length)
    }));

    line.append(
      first,
      numberCell(formatNumber(own.length), own.length),
      changeCell,
      numberCell(own.length ? formatPercent(answered.length / own.length) : '—', own.length ? answered.length / own.length : -1),
      waitingCell,
      numberCell(middle === null ? '—' : formatHours(middle), middle === null ? -1 : middle)
    );
    body.append(line);
  });

  table.append(head, body);
  labelCells(table);
  sortableTable(table);
}

function render() {
  const rows = currentRows();
  const before = previousRows();
  const comparable = hasPrevious(filterState.range);

  showFilterNote('filter-note', rows);
  showComparison(rows, before, comparable);
  showShare(rows);
  showTable(rows, before, comparable);
}

const exportRows = exportButton('Export these rows', () => {
  const rows = currentRows();
  const before = previousRows();
  const comparable = hasPrevious(filterState.range);
  downloadRows(
    'requests-by-channel',
    ['Channel', 'Requests', comparable ? 'Previous period' : 'Previous period (not available)', 'Replies recorded', 'Nothing recorded', 'Hours to first reply'],
    countsByChannel(rows).map(({ channel, rows: own }) => {
      const answered = replied(own);
      const middle = median(answered.map((request) => request.reply));
      return [
        channel,
        own.length,
        comparable ? before.filter((request) => request.channel === channel).length : '',
        answered.length,
        unanswered(own).length,
        middle === null ? '' : middle
      ];
    })
  );
});
document.querySelector('[aria-labelledby="channel-table-title"] .panel-head').append(exportRows);

setUpFilters(render);
startPage(render);
