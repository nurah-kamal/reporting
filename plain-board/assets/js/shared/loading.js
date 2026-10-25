// The three states a board is ever in: waiting for its data, showing it, or unable to.
//
// This board's data is a file, so it is ready the moment the page parses and the
// waiting state flashes past. The states exist anyway, and every page goes through
// them, because the day a real source is connected is the wrong day to discover that
// nothing in the interface knows how to say "that did not load".
//
// To point the board at a file of your own: set BOARD.dataFile, or load one on the
// Your data page. To connect something that is not a file, replace BoardData.load()
// and nothing else.
//
// Both states can be seen on any page: add ?state=loading or ?state=failed.

const BoardData = {
  // Replace this. Return a promise. Resolve when the data is in place, reject with an
  // Error whose message a person could act on.
  load() {
    const forced = Params.get('state', '');
    if (forced === 'loading') return new Promise(() => {});
    if (forced === 'failed') return Promise.reject(new Error('Forced by ?state=failed, so the state can be seen.'));

    // A board carrying its own file reads it once, keeps it, and reads the page again
    // with it in place. Everything on this board is computed from the rows at parse
    // time — that is what stops a headline figure and a chart disagreeing — so rows
    // that arrive afterwards cannot be folded in without reloading.
    if (!BOARD_SOURCE && BOARD.dataFile) {
      return fetch(BOARD.dataFile)
        .then((answer) => {
          if (!answer.ok) throw new Error(`${BOARD.dataFile} answered ${answer.status}. The board is looking for it beside these pages, on this same address.`);
          return answer.text();
        })
        .then((text) => {
          const source = readSource(text, BOARD.dataFile);
          if (source.error) throw new Error(source.error);
          const kept = BoardSource.keep(source);
          if (!kept.kept) throw new Error(kept.why);
          location.reload();
          return new Promise(() => {});
        });
    }

    // The file has already run by the time this does.
    return typeof REQUESTS === 'undefined'
      ? Promise.reject(new Error('The board data did not load. assets/js/shared/data.js may be missing or may have failed to parse.'))
      : Promise.resolve();
  }
};

// A quiet stand-in with the shape of the thing being waited for, so the page does not
// jump when the real content lands. No spinner: a spinner says "wait" without saying
// what for.
function drawWaiting(main) {
  const holder = create('div', 'state-waiting');
  holder.setAttribute('role', 'status');
  holder.append(create('p', 'sr-only', 'Loading the board.'));

  const bars = create('div', 'skeleton-tiles');
  for (let i = 0; i < 4; i++) bars.append(create('div', 'skeleton-tile'));

  const panel = create('div', 'skeleton-panel');
  holder.append(bars, panel);
  main.append(holder);
  return holder;
}

// What went wrong, what it does not mean, and the way out. Never "an error occurred".
function drawFailure(main, error, retry) {
  const panel = create('section', 'panel state-failed');
  panel.setAttribute('role', 'alert');
  panel.tabIndex = -1;

  const head = create('div', 'panel-head');
  head.append(create('h2', '', 'This board could not read its data'));
  panel.append(head);

  panel.append(create('p', '', error && error.message ? error.message : 'The source did not answer.'));
  panel.append(create('p', 'panel-note', 'Nothing on this page is out of date, because nothing on this page was drawn. An empty board and a board that failed to load are different things, and this is the second one.'));

  const again = create('button', 'button button-secondary button-inline');
  again.type = 'button';
  again.append(icon(ICONS.refresh, 16), document.createTextNode('Try again'));
  again.addEventListener('click', retry);

  const tools = create('div', 'state-actions');
  tools.append(again);
  panel.append(tools);

  main.append(panel);
  return panel;
}

// Every page calls this instead of calling its own render directly.
function startPage(render) {
  const main = document.getElementById('main');
  const content = [...main.children].filter((node) => !node.classList.contains('page-header'));

  const hide = () => content.forEach((node) => { node.hidden = true; });
  const show = () => content.forEach((node) => { node.hidden = false; });

  const attempt = () => {
    main.querySelectorAll('.state-waiting, .state-failed').forEach((node) => node.remove());
    hide();
    const waiting = drawWaiting(main);

    BoardData.load().then(
      () => {
        waiting.remove();
        show();
        render();
      },
      (error) => {
        waiting.remove();
        const panel = drawFailure(main, error, attempt);
        panel.focus();
      }
    );
  };

  attempt();
}
