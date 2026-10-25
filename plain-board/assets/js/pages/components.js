setUpShell();

// Every part the kit ships, drawn once, with the call that drew it underneath.
// This page exists so nobody has to read four page scripts to find out what is here.
//
// It uses made-up numbers of its own on purpose: a component should be judged on how
// it looks, not on whatever the demo data happens to say today.

function demo(title, what, node, call) {
  const line = create('li', 'demo-item');
  line.append(create('b', '', title), create('span', 'demo-what', what));

  const stage = create('div', 'demo-stage');
  stage.append(node);

  const code = create('pre', 'demo-code');
  code.append(create('code', '', call));

  line.append(stage, code);
  return line;
}

function fill(id, items) {
  document.getElementById(id).replaceChildren(...items);
}

// ---------- charts ----------

fill('chart-list', [
  demo('Ring', 'A share of a whole, when there is one number worth staring at.',
    (() => {
      const row = create('div', 'ring-row');
      row.append(
        ringChart(0.62, 'Delivery', '62 of 100 requests', 'accent'),
        ringChart(0.28, 'Billing', '28 of 100 requests', 'warn')
      );
      return row;
    })(),
    "ringChart(0.62, 'Delivery', '62 of 100 requests', 'accent')\n// tone: 'accent' | 'good' | 'warn'"),

  demo('Donut', 'A share of a whole across a handful of named parts.',
    donutChart([
      { label: 'Email', value: 62 },
      { label: 'Phone', value: 24 },
      { label: 'Web form', value: 14 }
    ]),
    "donutChart([\n  { label: 'Email', value: 62 },\n  { label: 'Phone', value: 24 },\n  { label: 'Web form', value: 14 }\n])"),

  demo('Area', 'A run of values over time, with a key and a reading that follows the pointer.',
    areaChart(
      [9, 12, 8, 15, 14, 19, 17, 22, 18, 24, 21, 27].map((value, index) => ({ label: `${12 - index}w ago`, value })),
      { label: 'requests', key: 'Arriving' }
    ),
    "areaChart(points, { label: 'requests', key: 'Arriving' })\n// points: [{ label, value }]"),

  demo('Paired bars', 'The same things measured twice, so two periods can be compared.',
    pairedBars(
      [
        { label: 'Email', first: 17, second: 31 },
        { label: 'Phone', first: 14, second: 10 },
        { label: 'Web form', first: 8, second: 18 }
      ],
      { first: 'Previous 4 weeks', second: 'This 4 weeks' }
    ),
    "pairedBars(rows, { first: 'Previous 4 weeks', second: 'This 4 weeks' })\n// rows: [{ label, first, second, colour? }]"),

  demo('Bar list', 'A ranking, where the label matters as much as the number.',
    barList([
      { label: 'Says what happened', value: 48 },
      { label: 'Barely a note', value: 17, note: 'the next person would have to ask' },
      { label: 'One word', value: 9 }
    ]),
    "barList(rows)\n// rows: [{ label, value, note?, colour? }]"),

  demo('Columns', 'A shape across ordered buckets — ages, bands, days of the week.',
    columnChart([
      { label: 'Today', value: 4 },
      { label: '1 to 3', value: 7 },
      { label: '4 to 7', value: 5 },
      { label: '8 to 14', value: 3 },
      { label: '15+', value: 6, note: 'oldest' }
    ]),
    "columnChart(rows, { groups: [] })\n// rows: [{ label, value, group?, note? }]")
]);

// ---------- figures ----------

fill('tile-list', [
  demo('Figure tile', 'A name, the figure, and one muted line: its base, and how it moved. The movement takes a colour only where the board can call a direction better or worse. No chip and no small chart: if the run behind a figure matters, it gets a table or a panel of its own. Every tile carries an (i) saying what it does not prove, and tools/check-tiles.js will not let the pages build otherwise.',
    (() => {
      const holder = create('div', 'tiles');
      holder.append(
        statTile({
          label: 'Requests',
          value: '129',
          verdict: changeWords(movement(129, 109, { good: null, suffix: ' on the 4 weeks before' })),
          about: 'One row per request, counted once. It is what the board holds, not what was sent.'
        }),
        statTile({
          label: 'Answered within a day',
          value: '82%', note: '41 of 50 replies',
          verdict: changeWords(movement(82, 74, { good: 'up', suffix: ' on the 4 weeks before' })),
          about: 'Counted only on requests with a recorded reply. A request nobody wrote anything against cannot be measured.'
        }),
        statTile({
          label: 'Nothing recorded',
          value: '23', note: 'Longest 72 days',
          verdict: changeWords(movement(23, 19, { good: 'down', suffix: ' on the 4 weeks before' })),
          about: 'Requests with no reply written against them. It does not prove nobody replied, only that nobody wrote it down.'
        })
      );
      return holder;
    })(),
    "statTile({\n  label, value,\n  note,                       // the base: what the figure is out of\n  verdict,                    // changeWords(movement(now, before, { good, suffix }))\n  about,                      // shows the (i). Required: the build checks for it\n  watch                       // { value, unit, better }: lets a reader draw a line\n})"),

  demo('Status chip', 'A state, in words as well as colour, so the colour is never the only carrier.',
    (() => {
      const holder = create('div', 'demo-inline');
      [
        ['good', 'Checked and passed'],
        ['waiting', '4 to 7 days'],
        ['changed', '15 days or more'],
        ['well', '18%'],
        ['poor', '9%'],
        ['info', 'Managers']
      ].forEach(([tone, text]) => holder.append(statusChip({ tone, text })));
      holder.append(
        statusChip({ tone: 'well', direction: 'up', text: '18%' }),
        statusChip({ tone: 'poor', direction: 'down', text: '9%' })
      );
      return holder;
    })(),
    "statusChip({ tone, text, direction })\n// tone: good | waiting | changed | well | poor | info\n// direction: 'up' | 'down' adds an arrow and a screen-reader word"),

  demo('The banner', 'One to a page, at the top of the landing page, with one message. The loudest thing becomes the figure and the sentence. A line under it is only for something waiting that has no home lower on the page, and no figure card repeats the banner\'s figure. Every count is true right now and the link goes to the list it counts.',
    (() => {
      const holder = create('div', 'demo-stack');
      const live = buildBanner([
        { count: 5, one: 'request has waited over a week with nothing recorded', many: 'requests have waited over a week with nothing recorded', tone: 'is-stop', href: '#' },
        { count: 9, one: 'reply was recorded in a single word', many: 'replies were recorded in a single word', tone: 'is-hold' }
      ], { action: 'Open the waiting list' });
      live.querySelector('.banner-link').addEventListener('click', (event) => event.preventDefault());

      // The calm one is the state nobody designs for, so it is shown rather than described.
      const calm = buildBanner([], {
        calmTitle: 'Nothing in this selection is waiting on anybody.',
        calmNote: 'Every request here has a reply recorded against it.'
      });
      holder.append(live, calm);
      return holder;
    })(),
    "buildBanner(items, { action, calmTitle, calmNote })\n// items: { count, one, many, tone, href }\n// no item with a count left standing gives the calm banner"),

  demo('Drill-down tile', 'A group you open. The step goes in the address bar, so back works and a link can be shared.',
    (() => {
      const grid = create('div', 'status-grid');
      [['3', 'requests', 'changed', '15 days or more'], ['7', 'requests', 'waiting', '4 to 7 days']].forEach(([count, unit, tone, label]) => {
        const tile = create('button', 'status-tile');
        tile.type = 'button';
        const top = create('div', 'status-top');
        top.append(create('b', '', count), create('span', '', unit));
        tile.append(top, statusChip({ tone, text: label }), create('p', '', '3 people'));
        grid.append(tile);
      });
      return grid;
    })(),
    "// .status-grid > button.status-tile\n// Trail.go(['15-plus']) puts the step in the hash")
]);

// ---------- controls ----------

fill('control-list', [
  demo('Segmented', 'A small set of choices where one is always on. The pressed one moves on click.',
    (() => {
      const holder = create('div', 'segmented segmented-three');
      holder.id = 'demo-segmented';
      buildSegmented(holder, [['a', '7 days'], ['b', '4 weeks'], ['c', '12 weeks']], 'b', () => {});
      return holder;
    })(),
    "buildSegmented(container, [['a', '7 days'], ['b', '4 weeks']], 'b', onChange)"),

  demo('Buttons', 'One primary, one secondary, one that saves what is on screen.',
    (() => {
      const holder = create('div', 'demo-inline');
      const primary = create('button', 'button', 'Sign in');
      primary.type = 'button';
      const secondary = create('button', 'button button-secondary button-inline', 'Show everything');
      secondary.type = 'button';
      holder.append(primary, secondary, exportButton('Export these rows', () => showToast('This is the demo page, so nothing was exported.')));
      return holder;
    })(),
    "exportButton('Export these rows', () => downloadRows(name, headings, rows))\n\n// An action for the whole page goes in the header, beside Refresh:\naddHeaderAction(button)\naddHeaderAction(button, { print: true })  // a print button: hidden on a phone"),

  demo('More filters', 'The filters a page reaches for less often, and its saved views, behind one button at the end of the filter row. It opens by itself when one of them is set, counts them while closed, and fades in over 150ms.',
    (() => {
      const holder = create('div', 'controls');
      const select = create('select', 'select');
      select.setAttribute('aria-label', 'Product');
      select.append(new Option('All products', 'All'), new Option('Delivery', 'd'));
      const button = create('button', 'button button-secondary button-inline more-filters', 'More filters');
      button.type = 'button';
      const set = create('div', 'more-filter-set');
      set.id = 'demo-more-set';
      button.setAttribute('aria-controls', set.id);
      const person = create('select', 'select');
      person.setAttribute('aria-label', 'Person');
      person.append(new Option('Everyone', 'All'), new Option('Ada Nkemelu', 'Ada'));
      set.append(person);
      holder.append(select, button, set);
      const show = moreFilters(() => (person.value === 'All' ? 0 : 1), { button, set });
      person.addEventListener('change', show);
      return holder;
    })(),
    "moreFilters(countOn, { button, set, label })\n// countOn: () => how many of the hidden filters are set\n// label: 'Saved views' when only saved views sit behind it\n// returns show(): call it when the selection changes"),

  demo('Fields', 'A search and a select, at the size a finger can hit.',
    (() => {
      const holder = create('div', 'controls');
      const search = create('input', 'search');
      search.type = 'search';
      search.placeholder = 'Search a person, a product or a request';
      search.setAttribute('aria-label', 'Search');
      const select = create('select', 'select');
      select.setAttribute('aria-label', 'Product');
      select.append(new Option('All products', 'All'), new Option('Delivery', 'd'), new Option('Billing', 'b'));
      holder.append(search, select);
      return holder;
    })(),
    "// .controls wraps .search and .select"),

  demo('Toast', 'A short confirmation that gets out of the way by itself.',
    (() => {
      const button = create('button', 'button button-secondary button-inline', 'Show a toast');
      button.type = 'button';
      button.addEventListener('click', () => showToast('Sample figures, so nothing refreshes.'));
      return button;
    })(),
    "showToast('Sample figures, so nothing refreshes.')\nshowToast('Marked as sent.', { label: 'Undo', run: () => {} })")
]);

// ---------- tables ----------

const TABLE_ROWS = [
  ['Ada Nkemelu', 22, 0.63, 4, 5, 12],
  ['Tomas Brandt', 19, 0.75, 2, 3, 14],
  ['Priya Raghunathan', 26, 0.57, 5, 8, 9],
  ['Joel Okonkwo', 17, 0.82, 3, 2, 11]
];

function demoTable() {
  const table = create('table', 'results');
  table.id = 'demo-table';

  const head = create('thead');
  const headRow = create('tr');
  ['Person', 'Requests', 'Replies recorded', 'Nothing recorded', 'Hours to first reply', 'Full notes'].forEach((label, index) => {
    const cell = create('th', index ? 'cell-number' : '', label);
    cell.scope = 'col';
    headRow.append(cell);
  });
  head.append(headRow);

  const body = create('tbody');
  TABLE_ROWS.forEach(([name, given, share, waiting, hours, full]) => {
    const line = create('tr');
    const first = create('th', 'cell-name');
    first.scope = 'row';
    first.append(create('b', '', name));

    const waitingCell = numberCell('', waiting);
    waitingCell.append(statusChip({ tone: waiting > 3 ? 'changed' : 'waiting', text: String(waiting) }));

    line.append(
      first,
      numberCell(String(given), given),
      numberCell(formatPercent(share), share),
      waitingCell,
      numberCell(`${hours}h`, hours),
      numberCell(String(full), full)
    );
    body.append(line);
  });

  table.append(head, body);
  labelCells(table);
  sortableTable(table);
  return table;
}

fill('table-list', [
  demo('Results table', 'Click any heading to sort. On a phone the heading row is dropped and every cell carries its own heading instead.',
    (() => {
      const wrap = create('div', 'table-wrap');
      wrap.append(demoTable());
      return wrap;
    })(),
    "labelCells(table);    // phone headings\nsortableTable(table); // click-to-sort\n\n// a formatted cell keeps its raw value for sorting:\nnumberCell('4h', 4)")
]);

// ---------- the honest states ----------

fill('state-list', [
  demo('Nothing to show', 'An empty result says which filter emptied it, not just that it is empty.',
    create('p', 'empty', 'Nothing in this band matches the filters above.'),
    "create('p', 'empty', 'Nothing in this band matches the filters above.')"),

  demo('Nothing to compare against', 'The longest period reaches the start of the data, so the board says so rather than comparing against a shorter, unfair stretch.',
    create('p', 'empty', 'No earlier 12 weeks to compare with. The board starts here.'),
    "hasPrevious(filterState.range)  // false on the longest range"),

  demo('A change too small to be a percentage', 'Two requests becoming eight is not a 300% improvement, it is six requests.',
    (() => {
      const holder = create('div', 'demo-inline');
      holder.append(
        statusChip(movement(8, 2, { good: 'up' })),
        statusChip(movement(31, 17, { good: 'up' })),
        statusChip(movement(10, 14, { good: 'up' })),
        statusChip(movement(31, 17, { good: null })),
        statusChip(movement(17, 17, { good: 'up' }))
      );
      return holder;
    })(),
    "movement(now, before, { good: 'up' | 'down' | null })\n// under a base of 5 it reads '2 to 8' instead of '+300%'\n// good: null states the move without calling it good or bad"),

  demo('Waiting for data', 'A stand-in with the shape of what is coming, so the page does not jump when it lands. No spinner — a spinner says "wait" without saying what for.',
    (() => {
      const holder = create('div', 'state-waiting');
      const bars = create('div', 'skeleton-tiles');
      for (let i = 0; i < 4; i++) bars.append(create('div', 'skeleton-tile'));
      holder.append(bars);
      return holder;
    })(),
    "startPage(render)  // shared/loading.js\n// see it on any page: ?state=loading"),

  demo('Could not read its data', 'What went wrong, what it does not mean, and the way out. An empty board and a board that failed to load are different things, and saying so is the whole point.',
    (() => {
      const panel = create('section', 'panel state-failed');
      const head = create('div', 'panel-head');
      head.append(create('h2', '', 'This board could not read its data'));
      panel.append(head, create('p', '', 'The source did not answer.'));
      panel.append(create('p', 'panel-note', 'Nothing on this page is out of date, because nothing on this page was drawn.'));
      const again = create('button', 'button button-secondary button-inline');
      again.type = 'button';
      again.append(icon(ICONS.refresh, 16), document.createTextNode('Try again'));
      const tools = create('div', 'state-actions');
      tools.append(again);
      panel.append(tools);
      return panel;
    })(),
    "// BoardData.load() returns a promise.\n// Replace it with a real fetch and nothing else changes.\n// see it on any page: ?state=failed"),

  demo('More rows than anybody will read',
    'A cap, and a line saying what was capped. Showing the first two hundred silently would be showing part of the answer and calling it the answer.',
    create('p', 'panel-note', 'Showing the 200 that have waited longest, of 405 requests. Export saves all of them.'),
    "rows.slice(0, 200)  // and say so in the panel note"),

  demo('A page somebody may not open', 'It stays in the menu, labelled, rather than vanishing. The redirect in session.js is what enforces it.',
    (() => {
      const holder = create('div', 'demo-menu');
      const shut = create('span', 'menu-item is-shut');
      shut.append(icon(['M12 3.5l8.5 5v7l-8.5 5-8.5-5v-7z', 'M8.5 12l2.5 2.5 4.5-5'], 20), create('span', '', 'Needs a decision'), create('span', 'tag', 'Managers'));
      holder.append(shut);
      return holder;
    })(),
    "// build-pages.js: { access: 'manager' }\n// session.js sends anybody else back")
]);
