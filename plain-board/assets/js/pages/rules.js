setUpShell();

// Every counting rule in one place. On a real board this page is the one people argue
// with, which is the point — a figure nobody can check is a figure nobody should trust.

const RULES = [
  {
    name: 'A request',
    detail: `One row in the log, counted once, on the day it arrived. The board holds ${plural(REQUESTS.length, 'row', 'rows')} covering ${SNAPSHOT.days} days.`,
    limit: 'It counts what reached the log, not what was sent. A request that never arrived does not appear anywhere on this board.'
  },
  {
    name: 'Something recorded',
    detail: 'A reply written against the row. Anything else counts as nothing recorded.',
    limit: 'It does not prove the customer was reached, or that the reply helped. It proves somebody wrote something down.'
  },
  {
    name: 'Nothing recorded',
    detail: 'A row with no reply against it, whatever its state.',
    limit: 'It proves nobody wrote it down — not that nobody replied. Treating a blank as proof of inaction is the most common way to misread this board.'
  },
  {
    name: 'Answered within a day',
    detail: 'Of the rows carrying a recorded reply, the share where that reply came within 24 hours.',
    limit: 'Rows with nothing recorded are left out of the calculation entirely, rather than counted as slow. Adding them would invent a number.'
  },
  {
    name: 'Hours to first reply',
    detail: 'The middle value across rows with a recorded reply — not the average.',
    limit: 'One very slow request cannot drag the middle. Only rows carrying a reply can be measured at all.'
  },
  {
    name: 'Waiting',
    detail: 'From the day the request arrived to today, for rows with nothing recorded.',
    limit: 'A recent week always looks better than an old one, because there has been less time for anything to go unanswered.'
  },
  {
    name: 'Note quality',
    detail: `Measured on word count alone: ${NOTE_GRADES.full.toLowerCase()} (six words or more), ${NOTE_GRADES.thin.toLowerCase()} (two to five), ${NOTE_GRADES['one-word'].toLowerCase()} (one).`,
    limit: 'Length is the only thing the text can honestly be read for. Nothing here judges whether the work was any good, and it should never be used to rank a person.'
  },
  {
    name: 'A change against the period before',
    detail: 'The same length of time immediately before the selected one, narrowed by exactly the same filters.',
    limit: `On the longest period the board reaches the start of its own data, so there is nothing behind it. The page says so rather than comparing against a shorter, unfair stretch.`
  },
  {
    name: 'Open right now',
    detail: 'Every row with nothing recorded, whatever its age. Workload and Needs a decision use this and ignore the period picker.',
    limit: 'A count of open requests is not a measure of effort. One request can be five minutes or a fortnight.'
  }
];

const CHOICES = [
  {
    name: 'Everything is worked out from one list',
    detail: 'The arrivals chart, the twelve-week table and the headline figures are all computed from the same request rows. Nothing is typed in twice, so a headline and a chart cannot quietly disagree.'
  },
  {
    name: 'Supply, speed and quality are kept apart',
    detail: 'How much arrived, how fast it was answered, and what the note says are three separate measures. Averaging them into one score would produce a number that means nothing.'
  },
  {
    name: 'The middle value, not the average',
    detail: 'Used wherever one very old row could drag the figure. The average is easier to explain and easier to mislead with.'
  },
  {
    name: 'A blank is shown as a dash, not a zero',
    detail: 'A week where nobody recorded a reply has no middle time. Drawing that as zero would read as instant replies.'
  },
  {
    name: 'No score, no ranking, no verdict',
    detail: 'The board puts numbers next to names because the work is assigned to people. It does not grade them, and the Workload page says so in as many words.'
  },
  {
    name: 'A group colour is a label, not a judgement',
    detail: 'The product colours include a red because a set of distinguishable colours needs one. A state always lives in a chip with words in it, never in the colour of a bar.'
  }
];

function showList(id, items, withLimit) {
  document.getElementById(id).replaceChildren(...items.map((item) => {
    const line = create('li');
    line.append(create('b', '', item.name), create('span', '', item.detail));
    if (withLimit && item.limit) line.append(create('small', '', `What it will not prove: ${item.limit}`));
    return line;
  }));
}

showList('rule-list', RULES, true);
showList('choice-list', CHOICES, false);
