setUpShell();

// A board that cannot say where its figures came from is worth very little, so this
// page is part of the kit rather than an afterthought. Replace the lists below with
// the truth about your own board. The counting rules live on Reading rules.

const SOURCES = [
  {
    name: 'Request log',
    detail: 'One row per request, with the product, the channel, the person it was assigned to and anything they wrote.',
    note: `Read at ${SNAPSHOT.read} · sample data, nothing is connected`
  },
  {
    name: 'People list',
    detail: 'Who is on the service desk, so a request can be counted against somebody.',
    note: `Read at ${SNAPSHOT.read} · sample data, nothing is connected`
  },
  {
    name: 'Product list',
    detail: 'The three products a request can be about, and the colour each one keeps across every chart.',
    note: `Read at ${SNAPSHOT.read} · sample data, nothing is connected`
  }
];

function coverage() {
  const open = unanswered(REQUESTS);
  const graded = replied(REQUESTS);
  return [
    {
      name: 'How far back',
      detail: `${SNAPSHOT.days} days, or twelve whole weeks, ending ${SNAPSHOT.read.toLowerCase()}.`,
      note: 'The longest period the board offers is the whole span, so it has nothing earlier to compare against.'
    },
    {
      name: 'How much',
      detail: `${plural(REQUESTS.length, 'request', 'requests')} across ${plural(PEOPLE.length, 'person', 'people')}, ${plural(Object.keys(PRODUCTS).length, 'product', 'products')} and ${plural(CHANNELS.length, 'channel', 'channels')}.`,
      note: 'Every figure on every page is worked out from these rows and nothing else.'
    },
    {
      name: 'How complete',
      detail: `${plural(graded.length, 'request has', 'requests have')} a recorded reply. ${plural(open.length, 'has', 'have')} nothing written against them.`,
      note: 'The measures about speed can only be worked out on the first group. The second group is reported as its own figure rather than folded in.'
    }
  ];
}

const GAPS = [
  {
    name: 'Whether every request arrived',
    detail: 'Nothing compares the number of requests a channel issued against the rows that reached the log, so a request that never arrived does not appear anywhere on this board.'
  },
  {
    name: 'Whether the customer was happy',
    detail: 'No satisfaction score is joined to a request. A row marked closed is what the person recorded, and nothing has checked it.'
  },
  {
    name: 'Whether the reply was any good',
    detail: 'The board counts what was written down, and grades it on length. That is the whole of what it can see.'
  },
  {
    name: 'How much work a request was',
    detail: 'One request can be five minutes or a fortnight. Nothing here records effort, so no count on this board should be read as a measure of how hard somebody is working.'
  }
];

function showList(id, items) {
  document.getElementById(id).replaceChildren(...items.map((item) => {
    const line = create('li');
    line.append(create('b', '', item.name), create('span', '', item.detail));
    if (item.note) line.append(create('small', '', item.note));
    return line;
  }));
}

showList('source-list', SOURCES);
showList('coverage-list', coverage());
showList('gap-list', GAPS);
