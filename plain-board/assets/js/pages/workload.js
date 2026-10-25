setUpShell();

// Workload is about right now, not about a chosen period. Everything open is everything
// open, however long ago it arrived — so this page deliberately has no filter bar.
//
// `viewer` comes from shared/filters.js, which every page loads. Declaring it again here
// would be a duplicate const in the one scope all these scripts share, and the whole of
// this file would stop running without an error anybody would notice.

const openRows = () => unanswered(REQUESTS).filter((request) => !viewer.person || request.person === viewer.person);

const people = () => (viewer.person ? [viewer.person] : PEOPLE);

function loadFor(name) {
  const own = openRows().filter((request) => request.person === name);
  return {
    name,
    open: own.length,
    oldest: own.length ? Math.max(...own.map((request) => request.days)) : null,
    overAWeek: own.filter((request) => request.days >= 8).length
  };
}

function showRings(loads, total) {
  const holder = document.getElementById('rings');
  holder.replaceChildren();

  if (!total) {
    holder.append(create('p', 'empty', 'Nothing is open. Every request on the board has a reply recorded against it.'));
    return;
  }

  loads.forEach((load) => {
    const share = load.open / total;
    const tone = load.overAWeek ? 'warn' : load.open ? 'accent' : 'good';
    const caption = load.open
      ? `${plural(load.open, 'open request', 'open requests')} · oldest ${waitingWords(load.oldest).toLowerCase()}`
      : 'nothing open';
    holder.append(ringChart(share, load.name, caption, tone));
  });
}

function showOldest(loads) {
  const bars = loads
    .filter((load) => load.oldest !== null)
    .sort((a, b) => b.oldest - a.oldest)
    .map((load) => ({
      label: load.name,
      value: load.oldest,
      note: load.overAWeek ? `${formatNumber(load.overAWeek)} over a week` : ''
    }));

  const holder = document.getElementById('oldest-chart');
  if (!bars.length) {
    holder.replaceChildren(create('p', 'empty', 'Nobody has anything open.'));
    return;
  }
  holder.replaceChildren(barList(bars, { format: (value) => waitingWords(value) }));
}

// Whether the work is evenly spread is a judgement, so the page shows the numbers
// behind it rather than declaring a verdict.
function showBalance(loads, total) {
  const list = document.getElementById('balance-list');
  const counts = loads.map((load) => load.open);
  const busiest = loads.reduce((best, load) => (load.open > best.open ? load : best), loads[0]);
  const quietest = loads.reduce((best, load) => (load.open < best.open ? load : best), loads[0]);
  const average = total / loads.length;

  const items = [
    {
      name: 'Most open',
      detail: `${busiest.name}, with ${plural(busiest.open, 'request', 'requests')}.`
    },
    {
      name: 'Fewest open',
      detail: `${quietest.name}, with ${plural(quietest.open, 'request', 'requests')}.`
    },
    {
      name: 'The spread',
      detail: `${plural(Math.max(...counts) - Math.min(...counts), 'request', 'requests')} between the busiest and the quietest, against an average of ${average.toFixed(1)} each.`
    },
    {
      name: 'What this does not say',
      detail: 'One request can be five minutes or a fortnight. A count is a count, not a measure of effort, and nothing here should be used to compare how hard people are working.'
    }
  ];

  list.replaceChildren(...items.map((item) => {
    const line = create('li');
    line.append(create('b', '', item.name), create('span', '', item.detail));
    return line;
  }));
}

function render() {
  const loads = people().map(loadFor);
  const total = loads.reduce((sum, load) => sum + load.open, 0);

  document.getElementById('workload-note').textContent = viewer.person
    ? `${plural(total, 'request', 'requests')} open against you right now · read ${SNAPSHOT.readShort}`
    : `${plural(total, 'request', 'requests')} open across ${plural(loads.length, 'person', 'people')} right now · read ${SNAPSHOT.readShort}`;

  showRings(loads, total);
  showOldest(loads);
  showBalance(loads, total);
}

const exportRows = exportButton('Export these rows', () => {
  downloadRows(
    'workload',
    ['Person', 'Open requests', 'Oldest waiting (days)', 'Open over a week'],
    people().map(loadFor).map((load) => [load.name, load.open, load.oldest === null ? '' : load.oldest, load.overAWeek])
  );
});
document.querySelector('[aria-labelledby="rings-title"] .panel-head').append(exportRows);

startPage(render);
