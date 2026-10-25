// Reading figures the way a report prints them, and comparing them at the
// precision the report chose to show.

// "1,284", "R 12 450", "80.6%", "80,6", "(1 200)" and "-3.5" all parse.
// Returns { value, decimals, percent } or null when the text is not a number.
export function parseFigure(text) {
  if (text == null) return null;
  let s = String(text).trim();
  if (!s) return null;
  let negative = false;
  if (/^\(.*\)$/.test(s)) { negative = true; s = s.slice(1, -1).trim(); }
  if (s.startsWith('-') || s.startsWith('−')) { negative = !negative; s = s.slice(1).trim(); }
  s = s.replace(/^(R|ZAR|\$|€|£)\s*/i, '');
  if (s.startsWith('-')) { negative = !negative; s = s.slice(1); }
  const percent = s.endsWith('%');
  s = s.replace(/%$/, '').replace(/[\s  ']/g, '');
  if (!/^[\d.,]+$/.test(s) || !/\d/.test(s)) return null;

  let whole = s;
  let frac = '';
  const dot = s.lastIndexOf('.');
  const comma = s.lastIndexOf(',');
  const dots = (s.match(/\./g) || []).length;
  const commas = (s.match(/,/g) || []).length;
  if (dots && commas) {
    const at = Math.max(dot, comma);
    whole = s.slice(0, at).replace(/[.,]/g, '');
    frac = s.slice(at + 1);
  } else if (commas) {
    if (/^\d{1,3}(,\d{3})+$/.test(s)) whole = s.replace(/,/g, '');
    else if (commas === 1) [whole, frac] = s.split(',');
    else return null;
  } else if (dots) {
    if (dots === 1) [whole, frac] = s.split('.');
    else if (/^\d{1,3}(\.\d{3})+$/.test(s)) whole = s.replace(/\./g, '');
    else return null;
  }
  if (!/^\d*$/.test(whole) || !/^\d*$/.test(frac)) return null;
  const value = Number(`${whole || '0'}.${frac || '0'}`);
  return { value: negative && value ? -value : value, decimals: frac.length, percent };
}

// Round half away from zero. The nudge stops 0.285 (stored as 0.28499...)
// rounding down.
export function roundTo(x, decimals) {
  const f = 10 ** decimals;
  return (Math.sign(x) * Math.round(Math.abs(x) * f * (1 + 1e-12))) / f;
}

// Does a recalculated value agree with the report at the report's precision?
export function agrees(figure, value) {
  if (!Number.isFinite(value)) return false;
  return Math.abs(roundTo(value, figure.decimals) - figure.value) < 1e-9;
}

// One step of the report's precision: 1 for whole numbers, 0.1 for one decimal.
export function unit(figure) {
  return 10 ** -figure.decimals;
}

// 1284.5 -> "1,284.5"
export function formatNumber(value, decimals = 0) {
  if (!Number.isFinite(value)) return '–';
  const fixed = Math.abs(roundTo(value, decimals)).toFixed(decimals);
  const [whole, frac] = fixed.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const sign = value < 0 && Number(fixed) !== 0 ? '-' : '';
  return sign + grouped + (frac ? `.${frac}` : '');
}

// A recalculated value shown at the report's precision, or one more place
// when that is what makes a rounding problem visible.
export function formatLike(figure, value, extra = 0) {
  return formatNumber(value, figure.decimals + extra) + (figure.percent ? '%' : '');
}
