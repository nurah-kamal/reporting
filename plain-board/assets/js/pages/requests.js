setUpShell();

const state = { band: null };

// Only requests with nothing recorded can be "waiting" — a recorded reply closes the question.
const waitingRows = () => unanswered(currentRows());

const inBand = (band) => waitingRows().filter((request) => bandOf(request.days) === band);

const picker = rowPicker(() => showPicked());

function showPicked() {
  const button = document.getElementById('waiting-export');
  if (!button) return;
  button.querySelector('span').textContent = picker.size
    ? `Export the ${formatNumber(picker.size)} you picked`
    : 'Export these rows';
}

function showBands() {
  const grid = document.getElementById('band-grid');
  grid.replaceChildren();

  let drawn = 0;
  [...WAIT_BANDS].reverse().forEach(([key, label]) => {
    const group = inBand(key);
    if (!group.length) return;
    drawn += 1;

    const tile = create('button', 'status-tile');
    tile.type = 'button';
    tile.dataset.focus = `band:${key}`;

    const top = create('div', 'status-top');
    top.append(create('b', '', formatNumber(group.length)), create('span', '', group.length === 1 ? 'request' : 'requests'));

    const tone = key === '15-plus' || key === '8-14' ? 'changed' : key === '4-7' ? 'waiting' : 'good';
    const people = new Set(group.map((request) => request.person)).size;

    tile.append(top, statusChip({ tone, text: label }), create('p', '', plural(people, 'person', 'people')));
    tile.addEventListener('click', () => {
      Trail.go([key]);
      readUrl(true);
    });
    grid.append(tile);
  });

  if (!drawn) grid.append(create('p', 'empty', 'Every request in this selection has a reply recorded against it.'));
}

function showBand() {
  const band = WAIT_BANDS.find(([key]) => key === state.band);
  const rows = [...inBand(state.band)].sort((a, b) => b.days - a.days);

  document.getElementById('waiting-panel').hidden = false;
  document.getElementById('waiting-title').textContent = `Waiting ${band[1].toLowerCase()}`;

  const table = document.getElementById('waiting-table');
  table.replaceChildren();
  picker.keepOnly(rows.map((request) => request.id));

  const head = create('thead');
  const headRow = create('tr');
  headRow.append(picker.headCell());
  ['Request', 'Product', 'Channel', 'Assigned to', 'Waiting'].forEach((label) => {
    const cell = create('th', '', label);
    cell.scope = 'col';
    headRow.append(cell);
  });
  head.append(headRow);

  const body = create('tbody');
  if (!rows.length) {
    const line = create('tr');
    const cell = create('td', 'is-empty', 'Nothing in this band matches the filters above.');
    cell.colSpan = 6;
    line.append(cell);
    body.append(line);
  }

  // Same cap as everywhere else: show what can be read, name what was left out.
  const SHOWN = 200;
  rows.slice(0, SHOWN).forEach((request) => {
    const line = create('tr');

    const first = create('th', 'cell-name');
    first.scope = 'row';
    first.append(create('b', '', request.id), create('small', '', PRODUCTS[request.product]));

    const waited = create('td');
    waited.append(statusChip({
      tone: request.days >= 8 ? 'changed' : request.days >= 4 ? 'waiting' : 'good',
      text: waitingWords(request.days)
    }));

    line.append(
      picker.cell(request.id, request.id),
      first,
      create('td', '', PRODUCTS[request.product]),
      create('td', '', request.channel),
      create('td', '', request.person),
      waited
    );
    body.append(line);
  });

  table.append(head, body);
  labelCells(table);
  sortableTable(table);
  showPicked();

  const note = document.getElementById('waiting-panel').querySelector('.panel-note');
  note.textContent = rows.length > SHOWN
    ? `Showing the ${formatNumber(SHOWN)} that have waited longest, of ${plural(rows.length, 'request', 'requests')}. Export saves all of them.`
    : 'Longest wait first. Waiting is counted from the day the request arrived to today; it does not prove nobody replied, only that nobody wrote it down.';
}

function render() {
  const waiting = waitingRows();
  showFilterNote('filter-note', currentRows());

  document.getElementById('waiting-panel').hidden = !state.band;
  document.querySelector('.open-section').hidden = Boolean(state.band);

  if (state.band) {
    showBand();
    return;
  }
  showBands();
}

function readUrl(moveFocus) {
  const was = state.band;
  const [key] = Trail.path();
  state.band = WAIT_BANDS.some(([name]) => name === key) ? key : null;
  render();

  if (!moveFocus || state.band === was) return;
  if (state.band) {
    document.getElementById('waiting-title').focus();
    return;
  }
  const tile = document.querySelector(`[data-focus="band:${was}"]`);
  if (tile) tile.focus();
}

const exportRows = exportButton('Export these rows', () => {
  const rows = [...inBand(state.band)].sort((a, b) => b.days - a.days);
  const chosen = picker.size ? rows.filter((request) => picker.has(request.id)) : rows;
  downloadRows(
    'requests-waiting',
    ['Request', 'Product', 'Channel', 'Assigned to', 'Days waiting'],
    chosen.map((request) => [request.id, PRODUCTS[request.product], request.channel, request.person, request.days])
  );
});
exportRows.id = 'waiting-export';
document.getElementById('waiting-panel').querySelector('.panel-head').append(exportRows);

setUpFilters(() => readUrl(false));
Trail.watch(() => readUrl(true));
startPage(() => readUrl(false));
