// The signed-in pages share one shell: the same head, the same menu, the same footer.
// Keeping it in one place means a menu entry can never be right on eight pages and
// wrong on the ninth.
//
// Run it after changing the shell or adding a page:
//
//   node tools/build-pages.js
//
// It refuses to build if any tile carries a figure without an (i) saying what that
// figure does not prove — see tools/check-tiles.js.
//
// Then run tools/stamp-assets.js before committing.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');

// The board's name, as it appears in the browser tab and at the top of the menu.
// Keep it the same as BOARD.name in assets/js/shared/board.js.
const BOARD_NAME = 'Help desk';
const BOARD_TEAM = 'Support';

const ICONS = {
  today: '<path d="M4 12.5l5 5L20 6.5"/>',
  waiting: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  notes: '<path d="M6 3.5h9l4 4V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z"/><path d="M14.5 3.5V8H19"/><path d="M8.5 13h7M8.5 16.5h4"/>',
  channels: '<path d="M4 7.5h16M4 12h16M4 16.5h10"/><circle cx="18.5" cy="16.5" r="2"/>',
  team: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19.5a5.5 5.5 0 0 1 11 0"/><path d="M16.5 6.2a3 3 0 0 1 0 5.8M17.5 19.5a5.4 5.4 0 0 0-2.2-4.3"/>',
  workload: '<path d="M4 20V9.5M10 20V4.5M16 20v-7M22 20H2"/>',
  decisions: '<path d="M12 3.5l8.5 5v7l-8.5 5-8.5-5v-7z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  trends: '<path d="M3.5 16.5l5-5 3.5 3.5 6.5-7"/><path d="M15 8h3.5v3.5"/>',
  sources: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  rules: '<path d="M5 3.5h14a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  components: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><circle cx="17" cy="17" r="3.5"/>',
  data: '<path d="M4 6.5c0-1.4 3.6-2.5 8-2.5s8 1.1 8 2.5-3.6 2.5-8 2.5-8-1.1-8-2.5z"/><path d="M4 6.5v11c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5v-11"/><path d="M4 12c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5"/>'
};

const svg = (paths, size = 20) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

// group:  where the entry sits in the menu. null means it sits above the first heading.
// access: 'manager' marks a page a non-manager is sent away from, in session.js.
const PAGES = [
  { file: 'today.html', script: 'today', name: 'Today', icon: 'today', group: null,
    title: 'Today', note: 'What the requests show today, and what is waiting on somebody.',
    description: 'What the support requests show today.' },

  { file: 'requests.html', script: 'requests', name: 'Waiting for a reply', icon: 'waiting', group: 'Requests',
    title: 'Waiting for a reply', note: 'Requests with nothing recorded against them, longest wait first.',
    description: 'Requests with nothing recorded against them yet.' },
  { file: 'notes.html', script: 'notes', name: 'Note quality', icon: 'notes', group: 'Requests',
    title: 'Note quality', note: 'What people wrote down, and whether the next person could use it.',
    description: 'The replies people recorded against requests.' },
  { file: 'channels.html', script: 'channels', name: 'Channels', icon: 'channels', group: 'Requests',
    title: 'Channels', note: 'Where requests arrive, against the period before.',
    description: 'Where support requests arrive and how each channel is doing.' },

  { file: 'team.html', script: 'team', name: 'By person', icon: 'team', group: 'Team',
    title: 'By person', note: 'What each person was given, and what came back on it.',
    description: 'Requests and recorded replies for each person.' },
  { file: 'workload.html', script: 'workload', name: 'Workload', icon: 'workload', group: 'Team',
    title: 'Workload', note: 'What is open against each person now, for balancing, not judging.',
    description: 'What is open against each person right now.' },

  { file: 'decisions.html', script: 'decisions', name: 'Needs a decision', icon: 'decisions', group: 'Decisions',
    access: 'manager',
    title: 'Needs a decision', note: 'What is waiting on a manager, by what has to happen next.',
    description: 'Requests waiting on a decision from a manager.' },

  { file: 'trends.html', script: 'trends', name: 'Trends', icon: 'trends', group: 'Evidence',
    title: 'Trends', note: 'Twelve weeks on every measure this board reports.',
    description: 'Twelve weeks of support measures.' },
  { file: 'sources.html', script: 'sources', name: 'Sources and coverage', icon: 'sources', group: 'Evidence',
    title: 'Sources and coverage', note: 'What this board reads, when it was read, and what it cannot see.',
    description: 'What this board reads and what it cannot see.' },
  { file: 'rules.html', script: 'rules', name: 'Reading rules', icon: 'rules', group: 'Evidence',
    title: 'Reading rules', note: 'How each figure is counted, and what it will not prove.',
    description: 'How each figure on this board is counted.' },

  { file: 'components.html', script: 'components', name: 'Components', icon: 'components', group: 'The kit',
    title: 'Components', note: 'Every part the kit ships, drawn once, with the call that drew it.',
    description: 'Every chart, control and state the kit ships.' },

  { file: 'data.html', script: 'data', name: 'Your data', icon: 'data', group: 'The kit',
    title: 'Your data', note: 'What this board is reading, and how to give it your own rows.',
    description: 'Point the board at your own rows.' }
];

function menu(current) {
  const lines = [];
  let group = null;
  PAGES.forEach((page) => {
    if (page.group !== group) {
      group = page.group;
      if (group) lines.push(`        <p class="menu-label">${group}</p>`);
    }
    const here = page.file === current ? ' aria-current="page"' : '';
    const access = page.access ? ` data-access="${page.access}"` : '';
    lines.push(`        <a class="menu-item" href="${page.file}"${here}${access}>`);
    lines.push(`          ${svg(ICONS[page.icon])}`);
    lines.push(`          <span>${page.name}</span>`);
    lines.push('        </a>');
  });
  return lines.join('\n');
}

// The filter row. The period, the product and the search are what people change, so
// they stay on the row; the person and the saved views sit behind More filters, which
// opens by itself when one of them is set (moreFilters() in shared/app.js).
function filters(withoutRange) {
  const range = withoutRange ? '' : `          <div class="segmented segmented-three" id="range-picker" role="group" aria-label="Period"></div>
`;
  return `        <div class="controls">
${range}          <label class="sr-only" for="product-filter">Product</label>
          <select class="select" id="product-filter"></select>
          <label class="sr-only" for="row-search">Search the requests</label>
          <input class="search" id="row-search" type="search" placeholder="Search a person, a product or a request" autocomplete="off">
          <button class="button button-secondary button-inline more-filters" id="more-filters" type="button" aria-expanded="false" aria-controls="more-filter-set">More filters</button>
          <div class="more-filter-set" id="more-filter-set" hidden>
            <label class="sr-only" for="person-filter">Person</label>
            <select class="select" id="person-filter"></select>
            <div class="views" id="saved-views"></div>
          </div>
          <button class="button button-secondary button-inline" id="filters-clear" type="button" hidden>Show everything</button>
        </div>`;
}

const shell = (page, body) => `<!doctype html>
<html lang="en" data-page="app"${page.access ? ` data-access="${page.access}"` : ''}>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; form-action 'self'; base-uri 'self'; object-src 'none'">
  <meta name="theme-color" content="#F4F5F8" media="(prefers-color-scheme: light)">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <meta name="description" content="${page.description}">
  <title>${page.title} · ${BOARD_NAME}</title>
  <link rel="icon" href="../assets/img/logo.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@500&display=swap">
  <link rel="stylesheet" href="../assets/css/styles.css">
  <script src="../assets/js/shared/session.js"></script>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <div class="app" id="app">
    <aside class="sidebar" id="sidebar" aria-label="Main menu">
      <a class="brand" href="today.html"><img src="../assets/img/logo.svg" width="36" height="36" alt=""><span class="brand-text"><b>${BOARD_NAME}</b><small>${BOARD_TEAM}</small></span></a>

      <nav class="menu" aria-label="Pages">
${menu(page.file)}
      </nav>

      <div class="sidebar-user">
        <span class="avatar" id="user-initials" aria-hidden="true"></span>
        <div><b id="user-name"></b><small id="user-role"></small></div>
        <button class="icon-button" id="sign-out" type="button" aria-label="Sign out" title="Sign out">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></svg>
        </button>
      </div>
    </aside>

    <div class="scrim" id="scrim"></div>

    <div class="app-body">
      <header class="topbar">
        <button class="icon-button" id="menu-button" type="button" aria-label="Open menu" aria-controls="sidebar" aria-expanded="false">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
        </button>
        <a class="brand" href="today.html"><img src="../assets/img/logo.svg" width="30" height="30" alt=""><span>${BOARD_NAME}</span></a>
      </header>

      <main class="app-main" id="main" tabindex="-1">
        <div class="page-header">
          <div>
            <h1>${page.title}</h1>
            <p class="page-note">${page.note}</p>
          </div>
        </div>

${body}
      </main>
    </div>
  </div>

  <div class="toast" id="toast" role="status" hidden></div>

  <script src="../assets/js/shared/source.js"></script>
  <script src="../assets/js/shared/data.js"></script>
  <script src="../assets/js/shared/board.js"></script>
  <script src="../assets/js/shared/app.js"></script>
  <script src="../assets/js/shared/lines.js"></script>
  <script src="../assets/js/shared/charts.js"></script>
  <script src="../assets/js/shared/filters.js"></script>
  <script src="../assets/js/shared/views.js"></script>
  <script src="../assets/js/shared/loading.js"></script>
  <script src="../assets/js/pages/${page.script}.js"></script>
</body>
</html>
`;

// The body of each page: the markup its script fills in.
const BODIES = {
  today: `        <div class="start-here" id="start-here"></div>

        <section class="tiles tiles-four tiles-lead" id="tiles" aria-label="Totals"></section>

${filters()}

        <p class="panel-note" id="filter-note" hidden></p>

        <div class="grid">
          <section class="panel span-7" aria-labelledby="waiting-title">
            <div class="panel-head">
              <h2 id="waiting-title">How long requests have been waiting</h2>
            </div>
            <div id="waiting-chart"></div>
            <p class="panel-note">Counted from the day the request arrived to today, for requests with nothing recorded against them.</p>
          </section>

          <section class="panel span-5" aria-labelledby="channels-title">
            <div class="panel-head">
              <h2 id="channels-title">Where requests come from</h2>
            </div>
            <div id="channel-chart"></div>
            <p class="panel-note">Every request in this selection, counted once against the channel it arrived on.</p>
          </section>

          <section class="panel span-7" aria-labelledby="arrivals-title">
            <div class="panel-head">
              <h2 id="arrivals-title">Requests arriving by day</h2>
            </div>
            <div id="arrivals-chart"></div>
            <p class="panel-note">Every request the board holds, counted on the day it came in. The last thirty days, whatever period is chosen above.</p>
          </section>

          <section class="panel span-5" aria-labelledby="notes-title">
            <div class="panel-head">
              <h2 id="notes-title">What people wrote down</h2>
            </div>
            <div id="notes-chart"></div>
            <p class="panel-note">Measured on length alone: whether the next person could pick the request up. Nothing here judges the work.</p>
          </section>

          <section class="panel span-12" aria-labelledby="weeks-title">
            <div class="panel-head">
              <h2 id="weeks-title">The last six weeks</h2>
            </div>
            <div class="table-wrap">
              <table class="results" id="weeks-table"></table>
            </div>
            <p class="panel-note">Every request the board holds, week by week, whatever is chosen above.</p>
          </section>
        </div>`,

  requests: `${filters(true)}

        <p class="panel-note" id="filter-note" hidden></p>

        <section class="open-section" aria-labelledby="band-grid-title">
          <h2 class="sr-only" id="band-grid-title">Choose how long they have waited</h2>
          <div class="status-grid" id="band-grid"></div>
        </section>

        <section class="panel" aria-labelledby="waiting-title" id="waiting-panel" hidden>
          <div class="panel-head">
            <h2 id="waiting-title">Requests with nothing recorded</h2>
          </div>
          <div class="table-wrap">
            <table class="results" id="waiting-table"></table>
          </div>
          <p class="panel-note">Longest wait first. Waiting is counted from the day the request arrived to today; it does not prove nobody replied, only that nobody wrote it down.</p>
        </section>`,

  notes: `${filters()}

        <p class="panel-note" id="filter-note" hidden></p>

        <section class="open-section" aria-labelledby="grade-grid-title">
          <h2 class="sr-only" id="grade-grid-title">Choose how much the note says</h2>
          <div class="status-grid" id="grade-grid"></div>
        </section>

        <section class="panel" aria-labelledby="grade-title" id="grade-panel" hidden>
          <div class="panel-head">
            <h2 id="grade-title">Notes</h2>
          </div>
          <div class="table-wrap">
            <table class="results" id="grade-table"></table>
          </div>
          <p class="panel-note">Graded on length alone, because length is the only thing the text can honestly be read for. A short note is not bad work — it is a note the next person cannot use.</p>
        </section>`,

  channels: `${filters()}

        <p class="panel-note" id="filter-note" hidden></p>

        <div class="grid">
          <section class="panel span-7" aria-labelledby="compare-title">
            <div class="panel-head">
              <h2 id="compare-title">Against the period before</h2>
            </div>
            <div id="compare-chart"></div>
            <p class="panel-note" id="compare-note"></p>
          </section>

          <section class="panel span-5" aria-labelledby="share-title">
            <div class="panel-head">
              <h2 id="share-title">Share of the selection</h2>
            </div>
            <div id="share-chart"></div>
            <p class="panel-note">Every request counted once, against the channel it arrived on.</p>
          </section>

          <section class="panel span-12" aria-labelledby="channel-table-title">
            <div class="panel-head">
              <h2 id="channel-table-title">Every channel</h2>
            </div>
            <div class="table-wrap">
              <table class="results" id="channel-table"></table>
            </div>
            <p class="panel-note">Change is against the same length of time just before. A channel with nothing in this selection is left out rather than shown as a zero.</p>
          </section>
        </div>`,

  team: `${filters(true)}

        <p class="panel-note" id="filter-note" hidden></p>

        <section class="tiles tiles-four" id="tiles" aria-label="Totals"></section>

        <section class="panel" aria-labelledby="team-title">
          <div class="panel-head">
            <h2 id="team-title">Everyone in this selection</h2>
          </div>
          <div class="table-wrap">
            <table class="results" id="team-table"></table>
          </div>
          <p class="panel-note">A request counts against the person it was assigned to, once. Nothing here measures how good the reply was.</p>
        </section>`,

  workload: `        <p class="panel-note" id="workload-note"></p>

        <section class="panel" aria-labelledby="rings-title">
          <div class="panel-head">
            <h2 id="rings-title">Open right now, per person</h2>
          </div>
          <div class="ring-row" id="rings"></div>
          <p class="panel-note">What is open against each person today, regardless of the period chosen elsewhere. The ring shows their share of everything open, not a target.</p>
        </section>

        <div class="grid">
          <section class="panel span-7" aria-labelledby="oldest-title">
            <div class="panel-head">
              <h2 id="oldest-title">The oldest thing on each desk</h2>
            </div>
            <div id="oldest-chart"></div>
            <p class="panel-note">How long the longest-waiting open request has been sitting with each person.</p>
          </section>

          <section class="panel span-5" aria-labelledby="balance-title">
            <div class="panel-head">
              <h2 id="balance-title">Is it evenly spread?</h2>
            </div>
            <ul class="gap-list" id="balance-list"></ul>
          </section>
        </div>`,

  decisions: `        <p class="panel-note" id="decisions-note"></p>

        <section class="tiles" id="tiles" aria-label="Totals"></section>

        <section class="panel" aria-labelledby="decisions-title">
          <div class="panel-head">
            <h2 id="decisions-title">Waiting on a manager</h2>
          </div>
          <ul class="decision-list" id="decision-list"></ul>
        </section>`,

  trends: `        <div class="controls">
          <div class="segmented segmented-three" id="measure-picker" role="group" aria-label="Measure"></div>
        </div>

        <p class="panel-note" id="trends-note"></p>

        <section class="panel" aria-labelledby="trend-title">
          <div class="panel-head">
            <h2 id="trend-title">Twelve weeks</h2>
          </div>
          <div id="trend-chart"></div>
          <p class="panel-note" id="trend-about"></p>
        </section>

        <section class="panel" aria-labelledby="weeks-title">
          <div class="panel-head">
            <h2 id="weeks-title">Every week, every measure</h2>
          </div>
          <div class="table-wrap">
            <table class="results" id="weeks-table"></table>
          </div>
          <p class="panel-note">A week with no recorded reply cannot have a middle time, so it shows a dash rather than a zero.</p>
        </section>`,

  sources: `        <div class="grid">
          <section class="panel span-7" aria-labelledby="reads-title">
            <div class="panel-head">
              <h2 id="reads-title">What this board reads</h2>
            </div>
            <ul class="source-list" id="source-list"></ul>
          </section>

          <section class="panel span-5" aria-labelledby="coverage-title">
            <div class="panel-head">
              <h2 id="coverage-title">How far back it goes</h2>
            </div>
            <ul class="source-list" id="coverage-list"></ul>
          </section>

          <section class="panel span-12" aria-labelledby="gaps-title">
            <div class="panel-head">
              <h2 id="gaps-title">What it will not tell you</h2>
            </div>
            <ul class="gap-list" id="gap-list"></ul>
          </section>
        </div>`,

  data: `        <section class="panel" aria-labelledby="showing-title">
          <div class="panel-head">
            <h2 id="showing-title">What this board is reading</h2>
          </div>
          <div id="showing"></div>
        </section>

        <section class="panel" aria-labelledby="load-title">
          <div class="panel-head">
            <h2 id="load-title">Give it your own rows</h2>
          </div>
          <p class="panel-note">The file is read here, in this browser, and kept here. It is not uploaded: there is no server to upload it to, and the content security policy on every page of this board would not allow one to be reached.</p>
          <p class="needs"><b>Two columns are needed:</b> one that names each row — <code>id</code>, <code>ref</code>, <code>ticket</code>, <code>number</code> or <code>case</code> — and one that says when it arrived: <code>arrived</code>, <code>date</code>, <code>opened</code>, <code>created</code>, <code>received</code> or <code>raised</code>. Everything else is optional, and nothing has to be renamed: the full list of headings is at the foot of this page.</p>
          <div class="drop" id="drop">
            <p><b>Drop a CSV or JSON file here</b></p>
            <p class="panel-note">or</p>
            <div class="drop-actions">
              <label class="button button-secondary button-inline" for="file">Choose a file</label>
              <button class="button button-secondary button-inline" id="example" type="button">Download an example file</button>
            </div>
            <input class="sr-only" id="file" type="file" accept=".csv,.json,text/csv,application/json">
          </div>
          <div id="outcome"></div>
        </section>

        <section class="panel" aria-labelledby="columns-title">
          <div class="panel-head">
            <h2 id="columns-title">The columns it looks for</h2>
          </div>
          <p class="panel-note">A heading is matched whatever its case, and whether it is spaced, hyphenated or underscored. Anything else in the file is left alone and named back to you.</p>
          <div class="table-wrap">
            <table class="results" id="columns"><tbody></tbody></table>
          </div>
        </section>`,

  components: `        <p class="panel-note">Everything below is drawn with its own made-up numbers, so it can be judged on how it looks rather than on whatever the demo data happens to say today. The call that drew each one is underneath it.</p>

        <section class="panel" aria-labelledby="charts-title">
          <div class="panel-head">
            <h2 id="charts-title">Charts</h2>
          </div>
          <p class="panel-note">Drawn in SVG by <code>assets/js/shared/charts.js</code>. No charting library is loaded — the content security policy would not allow one.</p>
          <ul class="demo-list" id="chart-list"></ul>
        </section>

        <section class="panel" aria-labelledby="figures-title">
          <div class="panel-head">
            <h2 id="figures-title">Figures and states</h2>
          </div>
          <ul class="demo-list" id="tile-list"></ul>
        </section>

        <section class="panel" aria-labelledby="controls-title">
          <div class="panel-head">
            <h2 id="controls-title">Controls</h2>
          </div>
          <ul class="demo-list" id="control-list"></ul>
        </section>

        <section class="panel" aria-labelledby="tables-title">
          <div class="panel-head">
            <h2 id="tables-title">Tables</h2>
          </div>
          <ul class="demo-list" id="table-list"></ul>
        </section>

        <section class="panel" aria-labelledby="honest-title">
          <div class="panel-head">
            <h2 id="honest-title">The honest states</h2>
          </div>
          <p class="panel-note">The parts that stop the board overclaiming. These are the ones worth copying even if you take nothing else.</p>
          <ul class="demo-list" id="state-list"></ul>
        </section>`,

  rules: `        <p class="panel-note">Every figure on this board is worked out from one list of requests. Nothing is typed in twice, so a headline and a chart cannot disagree.</p>

        <section class="panel" aria-labelledby="rules-title">
          <div class="panel-head">
            <h2 id="rules-title">How each figure is counted</h2>
          </div>
          <ul class="source-list" id="rule-list"></ul>
        </section>

        <section class="panel" aria-labelledby="choices-title">
          <div class="panel-head">
            <h2 id="choices-title">Choices made on purpose</h2>
          </div>
          <ul class="gap-list" id="choice-list"></ul>
        </section>`
};

// Before anything is written: every tile has to be able to say what it does not prove.
// The check exits non-zero and names the tile, so a page is never built around a figure
// with no caveat on it.
try {
  execFileSync(process.execPath, [path.join(__dirname, 'check-tiles.js')], { stdio: 'inherit' });
} catch (error) {
  console.error('Nothing was built.');
  process.exit(1);
}

PAGES.forEach((page) => {
  const body = BODIES[page.script];
  if (!body) throw new Error('no body for ' + page.script);
  fs.writeFileSync(path.join(root, 'pages', page.file), shell(page, body));
});

console.log(`built ${PAGES.length} pages`);
