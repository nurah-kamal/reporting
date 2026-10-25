setUpShell();

// Arriving with a name in the address (from the board search, or a shared link)
// narrows the page to that person, using the same filter the control uses.
function readNameFromUrl() {
  const [name] = Trail.path();
  if (!name || viewer.person || !PEOPLE.includes(name)) return;
  filterState.person = name;
  Params.set({ person: name });
  const select = document.getElementById('person-filter');
  if (select) select.value = name;
}

function figuresFor(rows) {
  const answered = replied(rows);
  const waiting = unanswered(rows);
  return {
    given: rows.length,
    answered: answered.length,
    waiting: waiting.length,
    middle: median(answered.map((request) => request.reply)),
    overAWeek: waiting.filter((request) => request.days >= 8).length,
    full: answered.filter((request) => noteGrade(request.note) === 'full').length
  };
}

function showTiles(rows) {
  const all = figuresFor(rows);
  const people = new Set(rows.map((request) => request.person)).size;

  const tiles = [
    {
      label: 'People',
      value: formatNumber(people),
      note: plural(all.given, 'request', 'requests') + ' between them',
      about: 'Everyone with at least one request in this selection. Somebody with none does not appear.'
    },
    {
      label: 'Replies recorded',
      value: all.given ? formatPercent(all.answered / all.given) : '—',
      note: `${formatNumber(all.answered)} of ${formatNumber(all.given)}`,
      about: 'A status, a note or a recorded reply on the row. It does not prove the customer was reached, or that the reply was any good.'
    },
    {
      label: 'Nothing recorded',
      value: formatNumber(all.waiting),
      note: all.overAWeek ? `${formatNumber(all.overAWeek)} waiting over a week` : 'None waiting over a week',
      about: 'Requests with no reply written against them. It proves nobody wrote it down, not that nobody replied.'
    },
    {
      label: 'Hours to first reply',
      value: all.middle === null ? '—' : formatHours(all.middle),
      note: 'Across everyone shown',
      about: 'The middle value, not the average, so one very slow request cannot drag it.'
    }
  ];

  document.getElementById('tiles').replaceChildren(...tiles.map(statTile));
}

function showTable(rows) {
  const names = [...new Set(rows.map((request) => request.person))].sort();
  const table = document.getElementById('team-table');
  table.replaceChildren();

  const head = create('thead');
  const headRow = create('tr');
  ['Person', 'Requests', 'Replies recorded', 'Nothing recorded', 'Hours to first reply', 'Full notes'].forEach((label, index) => {
    const cell = create('th', '', label);
    cell.scope = 'col';
    if (index) cell.className = 'cell-number';
    headRow.append(cell);
  });
  head.append(headRow);

  const body = create('tbody');
  if (!names.length) {
    const line = create('tr');
    const cell = create('td', 'is-empty', 'Nobody has a request in this selection.');
    cell.colSpan = 6;
    line.append(cell);
    body.append(line);
  }

  names.forEach((name) => {
    const own = rows.filter((request) => request.person === name);
    const figures = figuresFor(own);

    const line = create('tr');
    const first = create('th', 'cell-name');
    first.scope = 'row';

    if (viewer.person) {
      first.append(create('b', '', name));
    } else {
      const open = create('button', 'text-link', name);
      open.type = 'button';
      open.dataset.focus = `person:${name}`;
      open.addEventListener('click', () => {
        Trail.go([name]);
        readNameFromUrl();
        render();
      });
      first.append(open);
    }

    const waiting = numberCell('', figures.waiting);
    waiting.append(statusChip({
      tone: figures.overAWeek ? 'changed' : figures.waiting ? 'waiting' : 'good',
      text: formatNumber(figures.waiting)
    }));

    line.append(
      first,
      numberCell(formatNumber(figures.given), figures.given),
      numberCell(figures.given ? formatPercent(figures.answered / figures.given) : '—', figures.given ? figures.answered / figures.given : -1),
      waiting,
      numberCell(figures.middle === null ? '—' : formatHours(figures.middle), figures.middle === null ? -1 : figures.middle),
      numberCell(formatNumber(figures.full), figures.full)
    );
    body.append(line);
  });

  table.append(head, body);
  labelCells(table);
  sortableTable(table);
}

function render() {
  const rows = currentRows();
  showFilterNote('filter-note', rows);
  showTiles(rows);
  showTable(rows);
}

const exportRows = exportButton('Export these rows', () => {
  const rows = currentRows();
  const names = [...new Set(rows.map((request) => request.person))].sort();
  downloadRows(
    'requests-by-person',
    ['Person', 'Requests', 'Replies recorded', 'Nothing recorded', 'Waiting over a week', 'Hours to first reply', 'Full notes'],
    names.map((name) => {
      const figures = figuresFor(rows.filter((request) => request.person === name));
      return [name, figures.given, figures.answered, figures.waiting, figures.overAWeek, figures.middle === null ? '' : figures.middle, figures.full];
    })
  );
});
document.querySelector('.panel-head').append(exportRows);

setUpFilters(render);
Trail.watch(() => { readNameFromUrl(); render(); });
readNameFromUrl();
startPage(render);
