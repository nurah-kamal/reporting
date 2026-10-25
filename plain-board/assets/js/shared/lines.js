// Your own line on a figure.
//
// The banner says what needs somebody according to rules the board was built with.
// This is the other thing: a line *you* draw on a figure, which the board had no
// opinion about until you drew it. Keeping the two apart is the point — a reader
// should be able to tell at a glance whether a board is telling them something it
// worked out, or something they asked it to watch.
//
// What it is not, said plainly here and in the page: it is not an alert. Nothing is
// sent, because there is no server to send it. A line shows when you open the board
// and at no other time. A board that cannot reach you should not use a word that
// promises it can.

const LINES_KEY = (() => {
  const board = (typeof BOARD !== 'undefined' && BOARD.storageKey)
    || location.pathname.split('/').filter(Boolean)[0]
    || 'board';
  return `${board}:lines`;
})();

const Lines = {
  all() {
    try {
      const saved = JSON.parse(localStorage.getItem(LINES_KEY) || '{}');
      return saved && typeof saved === 'object' ? saved : {};
    } catch (error) {
      return {};
    }
  },

  for(label) {
    const line = this.all()[label];
    return line && Number.isFinite(Number(line.at)) ? line : null;
  },

  set(label, line) {
    try {
      const all = this.all();
      all[label] = line;
      localStorage.setItem(LINES_KEY, JSON.stringify(all));
      return true;
    } catch (error) {
      return false;
    }
  },

  clear(label) {
    try {
      const all = this.all();
      delete all[label];
      localStorage.setItem(LINES_KEY, JSON.stringify(all));
      return true;
    } catch (error) {
      return false;
    }
  },

  // Crossed, and which way. A figure the board could not read is never crossed:
  // a dash is not a number, and treating it as zero would invent a crossing.
  crossed(line, value) {
    if (!line || value === null || value === undefined || !Number.isFinite(Number(value))) return false;
    return line.over ? Number(value) > Number(line.at) : Number(value) < Number(line.at);
  }
};

// The words for a line, in the reader's terms rather than the board's.
function lineWords(line, unit) {
  const amount = `${formatNumber(line.at)}${unit ? ' ' + unit : ''}`;
  return `${line.over ? 'above' : 'below'} ${amount}`;
}

// The control, inside the (i) panel where a figure already explains itself. A line the
// reader draws belongs beside the counting rule it is drawn on, not in a settings page
// three clicks away from the number.
function buildLineControl(label, watch, onChange) {
  const holder = create('div', 'line-set');

  // The redraw replaces this tile, so the reader is put back: same figure, same panel
  // open, focus on the control that opens it.
  const redrawAndReturn = () => {
    onChange();
    const ask = [...document.querySelectorAll('.tile-about-open')]
      .find((button) => button.dataset.focus === `about:${label}`);
    if (!ask) return;
    if (ask.getAttribute('aria-expanded') !== 'true') ask.click();
    ask.focus();
  };

  const draw = () => {
    holder.replaceChildren();
    const line = Lines.for(label);

    if (!line) {
      const ask = create('button', 'text-link');
      ask.type = 'button';
      ask.textContent = 'Watch this figure for me';
      ask.addEventListener('click', () => form(null));
      holder.append(ask);
      return;
    }

    const said = create('p', 'line-said');
    said.append(
      document.createTextNode('Watching for '),
      create('b', '', lineWords(line, watch.unit)),
      document.createTextNode('. It shows when you open the board. Nothing is sent.')
    );

    const change = create('button', 'text-link');
    change.type = 'button';
    change.textContent = 'Change it';
    change.addEventListener('click', () => form(line));

    const stop = create('button', 'text-link');
    stop.type = 'button';
    stop.textContent = 'Stop watching';
    stop.addEventListener('click', () => {
      Lines.clear(label);
      draw();
      redrawAndReturn();
      showToast(`No line on "${label}" any more.`);
    });

    const tools = create('div', 'line-tools');
    tools.append(change, stop);
    holder.append(said, tools);
  };

  const form = (existing) => {
    holder.replaceChildren();

    const row = create('div', 'line-form');

    const wayLabel = create('label', 'sr-only', 'Above or below');
    const way = create('select', 'select');
    way.id = `line-way-${label.replace(/\W+/g, '-').toLowerCase()}`;
    wayLabel.htmlFor = way.id;
    way.append(new Option('above', 'over'), new Option('below', 'under'));
    // Where the board knows which direction is worth having, it opens on the side
    // worth watching. Where it does not — volume, headcount — it opens on "above"
    // and says nothing, because suggesting a side would be an opinion it cannot hold.
    way.value = existing ? (existing.over ? 'over' : 'under') : (watch.better === 'below' ? 'over' : 'under');

    const atLabel = create('label', 'sr-only', `The figure to watch for on "${label}"`);
    const at = create('input', 'search line-at');
    at.id = `line-at-${label.replace(/\W+/g, '-').toLowerCase()}`;
    atLabel.htmlFor = at.id;
    at.type = 'number';
    at.min = '0';
    at.step = 'any';
    at.placeholder = watch.unit || 'a number';
    at.value = existing ? String(existing.at) : '';

    const save = create('button', 'button button-secondary button-inline');
    save.type = 'button';
    save.textContent = 'Save';

    const cancel = create('button', 'button button-secondary button-inline');
    cancel.type = 'button';
    cancel.textContent = 'Cancel';
    cancel.addEventListener('click', draw);

    const keep = () => {
      const given = Number(at.value);
      if (!at.value.trim() || !Number.isFinite(given) || given < 0) {
        at.focus();
        return showToast('A line needs a number to sit at.');
      }
      if (!Lines.set(label, { at: given, over: way.value === 'over' })) {
        return showToast('This browser is not letting the board save anything, so the line was not kept.');
      }
      draw();
      redrawAndReturn();
      showToast(`Watching "${label}" for ${lineWords({ at: given, over: way.value === 'over' }, watch.unit)}. It shows when you open the board; nothing is sent, because there is nothing here to send it.`);
    };

    save.addEventListener('click', keep);
    at.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') { event.preventDefault(); keep(); }
      if (event.key === 'Escape') { event.stopPropagation(); draw(); }
    });

    row.append(wayLabel, way, atLabel, at, save, cancel);
    holder.append(row);
    if (watch.unit) holder.append(create('small', 'line-unit', `In ${watch.unit}. This is your line, not the board's: nothing on the board changes for anybody else.`));
    at.focus();
  };

  draw();
  return holder;
}
