// Five pages narrow the same rows the same way, so the filter bar lives here rather
// than five times over. A page gets whichever of the four controls its markup contains.
//
// The period, the product and the search stay on the row: they are what gets changed.
// The person and the saved views sit behind More filters (moreFilters() in app.js).
//
// Someone who is not a manager only ever sees their own rows: the person filter is set
// for them and locked, so the page cannot quietly show them somebody else's work.

const viewer = readSession() || {};

const filterState = {
  range: RANGES.some(([key]) => key === Params.get('range', '')) ? Params.get('range', '') : 'month',
  product: Params.get('product', 'All'),
  person: viewer.person || Params.get('person', 'All'),
  search: Params.get('search', '')
};

const rangeLabel = () => (RANGES.find(([key]) => key === filterState.range) || RANGES[1])[1];

// The rows currently on screen, after every filter the page offers.
function currentRows() {
  const search = filterState.search.trim().toLowerCase();
  return matching(filterState.range, filterState.product, filterState.person)
    .filter((request) => !search
      || `${request.id} ${request.person} ${request.channel} ${PRODUCTS[request.product]} ${request.note}`.toLowerCase().includes(search));
}

// The same selection over the period immediately before this one. A page asks
// hasPrevious(filterState.range) first: on the longest range the board reaches the
// start of its own data, and there is honestly nothing behind it.
function previousRows() {
  const search = filterState.search.trim().toLowerCase();
  return matchingBefore(filterState.range, filterState.product, filterState.person)
    .filter((request) => !search
      || `${request.id} ${request.person} ${request.channel} ${PRODUCTS[request.product]} ${request.note}`.toLowerCase().includes(search));
}

// What to say wherever a comparison cannot be drawn.
const noComparison = () => `No earlier ${rangeLabel().toLowerCase()} to compare with. The board starts here.`;

function activeFilters() {
  return [
    filterState.product !== 'All' ? PRODUCTS[filterState.product] : null,
    filterState.person !== 'All' && !viewer.person ? filterState.person : null,
    filterState.search.trim() ? `“${filterState.search.trim()}”` : null
  ].filter(Boolean);
}

// Set once the filter row is wired, so the More filters count keeps up with the row.
let showMoreFilters = () => {};

// One line under the filters, and only while something is filtered: "Showing 12 of 59
// requests · Billing". With nothing filtered the page's own figures already say how many
// it counts, so the line would only say it again. It does not name the period: the
// picker above it is already showing which one is chosen.
function showFilterNote(id, rows) {
  showMoreFilters();
  const active = activeFilters();
  const clear = document.getElementById('filters-clear');
  if (clear) clear.hidden = !active.length && filterState.range === 'month';

  const holder = document.getElementById(id);
  if (!holder) return;
  holder.hidden = !active.length;
  const all = matching(filterState.range, 'All', viewer.person || 'All').length;
  holder.textContent = active.length
    ? `Showing ${formatNumber(rows.length)} of ${plural(all, 'request', 'requests')} · ${active.join(' and ')}`
    : '';
}

function clearFilters(redraw) {
  filterState.range = 'month';
  filterState.product = 'All';
  if (!viewer.person) filterState.person = 'All';
  filterState.search = '';
  Params.set({ range: '', product: '', person: '', search: '' });

  const product = document.getElementById('product-filter');
  const person = document.getElementById('person-filter');
  const search = document.getElementById('row-search');
  if (product) product.value = 'All';
  if (person && !viewer.person) person.value = 'All';
  if (search) search.value = '';

  buildRangePicker(redraw);
  redraw();
  if (product) product.focus();
}

function buildRangePicker(redraw) {
  const holder = document.getElementById('range-picker');
  if (!holder) return;
  buildSegmented(holder, RANGES, filterState.range, (value) => {
    filterState.range = value;
    Params.set({ range: value === 'month' ? '' : value });
    redraw();
  });
}

function fillSelect(id, label, options, value, onChange) {
  const select = document.getElementById(id);
  if (!select) return;
  select.replaceChildren(new Option(label, 'All'), ...options.map(([key, name]) => new Option(name, key)));
  select.value = value;
  select.addEventListener('change', (event) => onChange(event.target.value));
}

// Wires up whichever of the four controls the page actually has.
function setUpFilters(redraw) {
  buildRangePicker(redraw);

  fillSelect('product-filter', 'All products', Object.entries(PRODUCTS), filterState.product, (value) => {
    filterState.product = value;
    Params.set({ product: value });
    redraw();
  });

  const person = document.getElementById('person-filter');
  if (person) {
    if (viewer.person) {
      person.replaceChildren(new Option(viewer.person, viewer.person));
      person.value = viewer.person;
      person.disabled = true;
      person.title = 'You are seeing the requests assigned to you.';
    } else {
      fillSelect('person-filter', 'Everyone', [...PEOPLE].sort().map((name) => [name, name]), filterState.person, (value) => {
        filterState.person = value;
        Params.set({ person: value });
        redraw();
      });
    }
  }

  const search = document.getElementById('row-search');
  if (search) {
    search.value = filterState.search;
    search.addEventListener('input', (event) => {
      filterState.search = event.target.value;
      Params.set({ search: filterState.search });
      redraw();
    });
  }

  const clear = document.getElementById('filters-clear');
  if (clear) clear.addEventListener('click', () => clearFilters(redraw));

  // Only a person someone chose counts: a team member's own name is set for them.
  showMoreFilters = moreFilters(() => (filterState.person !== 'All' && !viewer.person ? 1 : 0));
}

// The words a request's state gets, wherever it is shown.
const STATE_WORDS = {
  open: ['Nothing recorded', 'changed'],
  answered: ['Replied to', 'waiting'],
  closed: ['Closed', 'good']
};

const waitingWords = (days) => (days === 0 ? 'Today' : days === 1 ? '1 day' : `${formatNumber(days)} days`);
