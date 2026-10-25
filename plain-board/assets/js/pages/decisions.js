setUpShell();

// A manager-only page. session.js sends anybody else back before this script runs,
// because the page carries data-access="manager" — so nothing here has to check again.

// What actually needs a person to decide something, rather than just to do the work.
// Each group says what it is, why it is here, and what the decision actually is.
function groups() {
  const open = unanswered(REQUESTS);

  return [
    {
      key: 'stale',
      title: 'Waiting over a fortnight',
      rows: open.filter((request) => request.days >= 15),
      tone: 'stop',
      action: 'Reassign, or close them and say why',
      why: 'Nobody has written anything against these for two weeks or more. Either they are still live and somebody must pick them up, or they are dead and the board should stop counting them as open.'
    },
    {
      key: 'unbalanced',
      title: 'One desk carrying too much',
      rows: heaviest(open),
      tone: 'hold',
      action: 'Move some across, or decide the split is fine',
      why: 'The busiest person is carrying noticeably more open work than the quietest. That may be deliberate. If it is not, it will not fix itself.'
    },
    {
      key: 'thin-notes',
      title: 'Replies nobody else could use',
      rows: replied(REQUESTS).filter((request) => ['one-word', 'none'].includes(noteGrade(request.note))).slice(0, 40),
      tone: 'hold',
      action: 'Agree what a usable note has to say',
      why: 'These were answered, but what was written down will not tell the next person what happened. That is a standard to agree, not a person to correct.'
    },
    {
      key: 'channel-gap',
      title: 'A channel with nothing recorded',
      rows: worstChannel(open),
      tone: 'hold',
      action: 'Check whether that channel is being worked at all',
      why: 'One channel accounts for more of the unanswered pile than its share of arrivals. It may be harder to work, or it may not be reaching anybody.'
    }
  ].filter((group) => group.rows.length);
}

// The open requests sitting with whoever has the most, when that is meaningfully
// more than whoever has the least.
function heaviest(open) {
  const counts = PEOPLE.map((name) => ({ name, rows: open.filter((request) => request.person === name) }));
  const most = counts.reduce((best, entry) => (entry.rows.length > best.rows.length ? entry : best), counts[0]);
  const least = counts.reduce((best, entry) => (entry.rows.length < best.rows.length ? entry : best), counts[0]);
  return most.rows.length - least.rows.length >= 3 ? most.rows : [];
}

// The channel whose share of the unanswered pile most exceeds its share of arrivals.
function worstChannel(open) {
  if (!open.length) return [];
  const scored = CHANNELS.map((channel) => {
    const arrived = REQUESTS.filter((request) => request.channel === channel).length;
    const waiting = open.filter((request) => request.channel === channel);
    return { channel, rows: waiting, gap: arrived ? waiting.length / open.length - arrived / REQUESTS.length : 0 };
  });
  const worst = scored.reduce((best, entry) => (entry.gap > best.gap ? entry : best), scored[0]);
  return worst.gap > 0.08 ? worst.rows : [];
}

function showTiles(all) {
  const open = unanswered(REQUESTS);
  const tiles = [
    {
      label: 'Waiting on a decision',
      value: formatNumber(all.length),
      note: 'Of the four kinds this page looks for',
      about: 'A group appears only when there is something in it. An empty board here means nothing needs a manager today, not that nothing is happening.'
    },
    {
      label: 'Requests involved',
      value: formatNumber(new Set(all.flatMap((group) => group.rows.map((request) => request.id))).size),
      note: 'Each counted once',
      about: 'A request can sit in more than one group. This counts it once, so the figure cannot be inflated by adding groups.'
    },
    {
      label: 'Open right now',
      value: formatNumber(open.length),
      note: open.length ? `Oldest waiting ${waitingWords(Math.max(...open.map((request) => request.days))).toLowerCase()}` : 'Nothing open',
      about: 'Every request with nothing recorded against it, regardless of age. This page does not filter by period, because a decision does not expire.'
    }
  ];
  document.getElementById('tiles').replaceChildren(...tiles.map(statTile));
}

function showGroups(all) {
  const list = document.getElementById('decision-list');
  list.replaceChildren();

  if (!all.length) {
    list.append(create('li', 'empty', 'Nothing is waiting on a manager today.'));
    return;
  }

  all.forEach((group) => {
    const line = create('li');

    const top = create('div', 'decision-top');
    top.append(create('h3', '', group.title), statusChip({ tone: group.tone, text: plural(group.rows.length, 'request', 'requests') }));

    const people = [...new Set(group.rows.map((request) => request.person))];

    line.append(
      top,
      create('p', 'decision-action', group.action),
      create('p', '', group.why),
      create('small', '', `${plural(people.length, 'person', 'people')} · ${people.slice(0, 3).join(', ')}${people.length > 3 ? ' and others' : ''}`)
    );
    list.append(line);
  });
}

function render() {
  const all = groups();
  // Why there is no period picker is said once, in the (i) on Open right now.
  document.getElementById('decisions-note').textContent = `Everything open, whenever it arrived · read ${SNAPSHOT.readShort}`;
  showTiles(all);
  showGroups(all);
}

const exportRows = exportButton('Export these rows', () => {
  downloadRows(
    'needs-a-decision',
    ['Group', 'What has to happen', 'Request', 'Product', 'Channel', 'Assigned to', 'Days waiting'],
    groups().flatMap((group) => group.rows.map((request) => [
      group.title, group.action, request.id, PRODUCTS[request.product], request.channel, request.person, request.days
    ]))
  );
});
document.querySelector('[aria-labelledby="decisions-title"] .panel-head').append(exportRows);

startPage(render);
