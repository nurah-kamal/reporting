// Saved views.
//
// Every filter this board offers already lives in the query string, so a view is
// nothing more than a name and that query string. Nothing here knows what a filter
// means, which is why the same control works on any page that has a filter bar.
//
// A view is applied by putting its query in the address bar and reloading. On a static
// board that costs a few milliseconds and it is the only way to be certain the page is
// showing that selection and not half of it.
//
// Two honest limits, both said out loud in the page rather than only here:
//   · a saved view is kept in this browser. It is not shared, synced or backed up.
//   · the page link already carries the selection, so a link is how you send one.

const Views = {
  // Views belong to the page they were saved on: the same query means different things
  // on two pages with different filters.
  key() {
    const page = location.pathname.split('/').pop().replace('.html', '') || 'index';
    // Four boards share one address on GitHub Pages, so the key has to name the board
    // as well as the page. A board carrying a BOARD config says its own name; one that
    // does not is identified by the folder it is served from.
    const board = (typeof BOARD !== 'undefined' && BOARD.storageKey)
      || location.pathname.split('/').filter(Boolean)[0]
      || 'board';
    return `${board}:views:${page}`;
  },

  // Everything here is wrapped: a browser in private mode throws on the first read.
  all() {
    try {
      const saved = JSON.parse(localStorage.getItem(this.key()) || '[]');
      return Array.isArray(saved) ? saved.filter((v) => v && v.name) : [];
    } catch (error) {
      return [];
    }
  },

  write(views) {
    try {
      localStorage.setItem(this.key(), JSON.stringify(views));
      return true;
    } catch (error) {
      return false;
    }
  },

  // A selection is a set of filters, not the order they were pressed in: the same
  // choices made in a different order must be the same view.
  tidy(query) {
    const params = new URLSearchParams(query || '');
    const pairs = [...params.entries()].filter(([, value]) => value !== '').sort(
      (a, b) => (a[0] === b[0] ? a[1].localeCompare(b[1]) : a[0].localeCompare(b[0]))
    );
    return new URLSearchParams(pairs).toString();
  },

  // What is on screen right now, as a view would store it.
  current() {
    return this.tidy(location.search);
  },

  matching() {
    const now = this.current();
    return this.all().find((view) => this.tidy(view.query) === now) || null;
  }
};

// A board with more than a dozen of these has a naming problem, not a storage problem.
const MOST_VIEWS = 12;

// Set once the control exists, so anything that changes the selection can tell the
// control to look again. Until then it is a no-op, which is what a page without a
// filter bar wants.
let refreshSavedViews = () => {};

function buildSavedViews() {
  const holder = document.getElementById('saved-views');
  if (!holder) return;

  const label = create('label', 'sr-only', 'Saved views');
  label.htmlFor = 'views-picker';
  const picker = create('select', 'select');
  picker.id = 'views-picker';

  const action = create('button', 'button button-secondary button-inline');
  action.type = 'button';

  // The naming field replaces the button rather than sitting beside it, so the row
  // never holds two ways to do the same thing.
  const naming = create('div', 'view-naming');
  naming.hidden = true;
  const nameLabel = create('label', 'sr-only', 'Name for this view');
  nameLabel.htmlFor = 'view-name';
  const name = create('input', 'search');
  name.id = 'view-name';
  name.type = 'text';
  name.placeholder = 'Name this view';
  name.autocomplete = 'off';
  name.maxLength = 40;
  const confirm = create('button', 'button button-secondary button-inline');
  confirm.type = 'button';
  confirm.textContent = 'Save';
  const cancel = create('button', 'button button-secondary button-inline');
  cancel.type = 'button';
  cancel.textContent = 'Cancel';
  naming.append(nameLabel, name, confirm, cancel);

  function draw() {
    const views = Views.all();
    const here = Views.matching();

    picker.replaceChildren(
      new Option(views.length ? 'Saved views' : 'No saved views', ''),
      ...views.map((view) => new Option(view.name, Views.tidy(view.query)))
    );
    picker.value = here ? here.query : '';
    picker.disabled = !views.length;

    // The label always says what pressing it will do.
    action.textContent = here ? 'Remove this view' : 'Save this view';
    action.hidden = false;
    naming.hidden = true;
    picker.hidden = false;
    label.hidden = false;
  }

  picker.addEventListener('change', (event) => {
    const query = event.target.value;
    const view = Views.all().find((v) => Views.tidy(v.query) === query);
    if (!view) return;
    location.search = query;
  });

  action.addEventListener('click', () => {
    const here = Views.matching();

    if (here) {
      const left = Views.all().filter((view) => Views.tidy(view.query) !== Views.tidy(here.query));
      if (!Views.write(left)) return showToast('This browser is not letting the board save anything, so the view was not removed.');
      draw();
      showToast(`"${here.name}" is gone. The selection on screen has not changed.`);
      action.focus();
      return;
    }

    if (Views.all().length >= MOST_VIEWS) {
      return showToast(`${MOST_VIEWS} saved views is the limit. Remove one you no longer use and this will save.`);
    }

    // While it is being named the row shows one thing only: the naming of it.
    action.hidden = true;
    picker.hidden = true;
    label.hidden = true;
    naming.hidden = false;
    name.value = '';
    name.focus();
  });

  function save() {
    const given = name.value.trim();
    if (!given) { name.focus(); return; }

    const views = Views.all().filter((view) => view.name.toLowerCase() !== given.toLowerCase());
    const replaced = views.length !== Views.all().length;
    views.push({ name: given, query: Views.current() });

    if (!Views.write(views)) {
      return showToast('This browser is not letting the board save anything, so the view was not kept.');
    }
    draw();
    showToast(replaced
      ? `"${given}" now points at this selection. It is kept in this browser only. To send this view to somebody, send them the page link.`
      : `Saved as "${given}", in this browser only. To send this view to somebody, send them the page link: it already carries the selection.`);
    action.focus();
  }

  confirm.addEventListener('click', save);
  cancel.addEventListener('click', () => { draw(); action.focus(); });
  name.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') { event.preventDefault(); save(); }
    if (event.key === 'Escape') { event.stopPropagation(); draw(); action.focus(); }
  });

  holder.replaceChildren(label, picker, action, naming);
  refreshSavedViews = () => { if (naming.hidden) draw(); };
  draw();
}

// The control has to notice when the selection moves, and no two boards change their
// filters through the same code. What they do share is the address bar: every filter
// on every board is written there with history.replaceState, which fires no event. So
// the control listens to the one thing it can — that call — rather than asking each
// board to remember to tell it.
{
  const replace = history.replaceState.bind(history);
  history.replaceState = (...args) => { replace(...args); refreshSavedViews(); };
  addEventListener('popstate', () => refreshSavedViews());
  addEventListener('DOMContentLoaded', buildSavedViews);
}
