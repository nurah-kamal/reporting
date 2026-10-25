// The requests generator from sa-turnaround (scripts/make-sample.js), unchanged
// apart from this comment and the command-line part, so the two projects share
// one dataset. Everything is invented and there is no person in it, not even a
// made-up one. The same seed always gives the same rows.

import { addDays, weekday } from '../src/dates.js';
import { addWorkingDays, isWorkingDay } from '../src/index.js';

const START = '2023-01-01';
const END = '2025-12-31';
const SEED = 20261025;

// Target in working days, and how much work a request usually takes.
export const CATEGORIES = [
  { name: 'Account change', target: 2, effort: [0, 1, 1, 1, 2, 2, 3], weight: 30 },
  { name: 'Billing query', target: 3, effort: [1, 1, 2, 2, 2, 3, 3, 4], weight: 25 },
  { name: 'Document request', target: 3, effort: [1, 2, 2, 2, 3, 3, 4], weight: 20 },
  { name: 'Refund', target: 5, effort: [2, 3, 3, 4, 4, 5, 6], weight: 15 },
  { name: 'Complaint', target: 5, effort: [1, 2, 3, 3, 4, 5, 7], weight: 10 },
];

const CHANNELS = [
  { name: 'Email', weight: 45 },
  { name: 'Web form', weight: 35 },
  { name: 'Phone', weight: 20 },
];

// Planted: from 1 July 2025 refunds need a second sign-off, adding 1 to 3 days.
const REFUND_SIGN_OFF_FROM = '2025-07-01';

// January is busy, December is quiet.
const MONTH_FACTOR = [1.35, 1.15, 1.05, 0.95, 1, 1, 0.95, 1, 1, 1, 0.95, 0.7];
const PER_WORKING_DAY = 7;

function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function poisson(rand, mean) {
  const limit = Math.exp(-mean);
  let k = 0;
  for (let p = rand(); p > limit; p *= rand()) k += 1;
  return k;
}

function pick(rand, items, weight = (x) => x.weight) {
  const total = items.reduce((s, x) => s + weight(x), 0);
  let r = rand() * total;
  for (const x of items) {
    r -= weight(x);
    if (r < 0) return x;
  }
  return items.at(-1);
}

export function makeRequests(seed = SEED) {
  const rand = mulberry32(seed);
  const rows = [];
  for (let day = START; day <= END; day = addDays(day, 1)) {
    const month = +day.slice(5, 7);
    const working = isWorkingDay(day);
    // Only the web form takes requests when the desk is closed.
    const mean = PER_WORKING_DAY * MONTH_FACTOR[month - 1] * (working ? 1 : weekday(day) === 0 ? 0.12 : 0.2);
    const count = poisson(rand, mean);
    for (let i = 0; i < count; i++) {
      const category = pick(rand, CATEGORIES);
      const channel = working ? pick(rand, CHANNELS) : CHANNELS[1];
      let effort = category.effort[Math.floor(rand() * category.effort.length)];
      if (category.name === 'Refund' && day >= REFUND_SIGN_OFF_FROM) effort += 1 + Math.floor(rand() * 3);
      if (!working) effort = Math.max(effort, 1); // nobody closes it before the desk opens
      if (rand() < 0.04) effort += 3 + Math.floor(rand() * 6); // the odd one that waits on someone else
      const closed = addWorkingDays(day, effort);
      rows.push({
        opened_on: day,
        closed_on: closed <= END ? closed : '',
        channel: channel.name,
        category: category.name,
        target_working_days: category.target,
      });
    }
  }
  return rows.map((r, i) => ({ request_id: `R${String(i + 1).padStart(5, '0')}`, ...r }));
}

export function toCsv(rows) {
  const cols = Object.keys(rows[0]);
  return [cols.join(','), ...rows.map((r) => cols.map((c) => r[c]).join(','))].join('\n') + '\n';
}

