// Everything about this particular board lives here.
//
// This is the file you edit when you copy the kit. The shell in app.js reads these
// settings and follows them, so nothing else has to know what the board is about.

const BOARD = {
  // The board's name. Also set it in tools/build-pages.js, which writes the page titles.
  name: 'Help desk',

  // Where a visitor lands after signing in.
  home: 'today.html',

  // A file of rows sitting beside this board on the same address, read the first time
  // somebody opens the board and kept in their browser after that. null means the board
  // shows the demo until somebody loads a file on Your data.
  //
  // It has to be on this address. The content security policy on every page allows
  // connections to 'self' only, so a file on another domain — a published sheet, an
  // API — will not load, by design. Widening that policy is a decision to take on
  // purpose in tools/build-pages.js, knowing what it opens up.
  dataFile: null,

  // Prefix for the choices this board remembers in the current tab. Give each board
  // its own, or two boards on the same address will read each other's choices.
  storageKey: 'plain-board',

  // One line at the foot of every page, saying what this board is and is not. It has to
  // change when the rows do: "sample data" printed under somebody's real figures is a
  // worse lie than no line at all.
  footer: LOADED
    ? `Your file, ${LOADED.name || 'loaded here'} · read-only. Read in this browser and kept in this browser.`
    : 'Sample data · read-only. Nothing on this board is connected to a live system.',

  // The refresh button in the page header, and what pressing it says. A board with a
  // live source would reread it here instead; this one is honest about one fixed reading.
  refreshLabel: 'Refresh',
  refreshNote: () => (LOADED
    ? `A file does not refresh. These rows were read at ${SNAPSHOT.read}, and they stay that reading until another file is loaded on Your data.`
    : `Sample figures, so nothing refreshes. The data was read at ${SNAPSHOT.read} and that reading is fixed.`),

  // The small state line at the foot of the menu.
  state: () => ({
    text: LOADED ? 'Your file · read ' : 'Not connected · read ',
    value: SNAPSHOT.readShort,
    title: LOADED ? `${LOADED.name || 'A file you loaded'}, read ${SNAPSHOT.read}` : SNAPSHOT.read
  }),

  // The pages that get a place in the bottom bar on phones, as [file, short name].
  // Three is the comfortable maximum; everything else lives behind More.
  tabs: [['today.html', 'Today'], ['requests.html', 'Waiting'], ['team.html', 'People']],

  // Links out to other boards, as [address, name]. An empty list hides the section.
  related: [],

  // One search across the whole board. Return as many results as match; each one is a
  // link to the page that holds it, using the same addresses the pages themselves use.
  search(term) {
    const text = term.trim().toLowerCase();
    if (text.length < 2) return [];
    const has = (...parts) => parts.filter(Boolean).join(' ').toLowerCase().includes(text);
    const found = [];

    PEOPLE.forEach((person) => {
      if (has(person)) {
        found.push({
          group: 'Person',
          label: person,
          detail: `${plural(REQUESTS.filter((request) => request.person === person).length, 'request', 'requests')} on this board`,
          href: `team.html#${encodeURIComponent(person)}`
        });
      }
    });

    Object.entries(PRODUCTS).forEach(([key, label]) => {
      if (has(label)) {
        found.push({
          group: 'Product',
          label,
          detail: plural(REQUESTS.filter((request) => request.product === key).length, 'request', 'requests'),
          href: `requests.html?product=${encodeURIComponent(key)}`
        });
      }
    });

    CHANNELS.forEach((channel) => {
      if (has(channel)) {
        found.push({
          group: 'Channel',
          label: channel,
          detail: plural(REQUESTS.filter((request) => request.channel === channel).length, 'request', 'requests'),
          href: `channels.html`
        });
      }
    });

    REQUESTS.forEach((request) => {
      if (has(request.id, request.note, request.person, PRODUCTS[request.product])) {
        found.push({
          group: 'Request',
          label: request.id,
          detail: `${PRODUCTS[request.product]} · ${request.channel} · ${request.person}`,
          href: `requests.html?search=${encodeURIComponent(request.id)}`
        });
      }
    });

    return found;
  }
};
