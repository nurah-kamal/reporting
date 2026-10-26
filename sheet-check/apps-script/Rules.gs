// The rules, with nothing that touches a spreadsheet. Code.gs reads the sheets
// and hands the values in here, which is what lets the tests run in Node.

var RULES = ['sheet', 'required', 'type', 'not blank', 'unique', 'total'];
var TYPES = ['number', 'whole number', 'date', 'text', 'yes/no'];
var TOLERANCE = 0.005; // half a cent

// Turns the rows of the Rules tab (without its header) into a config.
// `source` names where they came from, so a problem can point back at it.
function parseRules(rows, source) {
  var config = { sheet: '', rules: [], problems: [] };
  rows.forEach(function (row, i) {
    var at = source === 'Rules' ? 'Rules!A' + (i + 2) : source + ', rule ' + (i + 1);
    var rule = clean(row[0]).toLowerCase();
    var column = clean(row[1]);
    var setting = clean(row[2]);
    var where = clean(row[3]);
    if (!rule && !column && !setting && !where) return;

    if (RULES.indexOf(rule) === -1) {
      config.problems.push(problem('rules', at, row[0], 'Unknown rule. Use one of: ' + RULES.join(', ') + '.'));
      return;
    }
    if (rule === 'sheet') {
      config.sheet = setting;
      return;
    }
    if (!column) {
      config.problems.push(problem('rules', at, row[0], 'This rule needs a column.'));
      return;
    }
    if (rule === 'type' && TYPES.indexOf(setting.toLowerCase()) === -1) {
      config.problems.push(problem('rules', at, setting, 'Unknown type. Use one of: ' + TYPES.join(', ') + '.'));
      return;
    }
    if (rule === 'total' && !setting) {
      config.problems.push(problem('rules', at, '', 'A total needs the cell it must match, such as Summary!B2.'));
      return;
    }
    var filter = null;
    if (where) {
      var parts = where.split('=');
      if (parts.length !== 2 || !clean(parts[0])) {
        config.problems.push(problem('rules', at, where, 'Write "Only where" as Column = value.'));
        return;
      }
      filter = { column: clean(parts[0]), value: clean(parts[1]) };
    }
    config.rules.push({ rule: rule, column: column, setting: setting, where: filter, at: at });
  });
  if (!config.sheet) {
    config.problems.push(problem('rules', source, '', 'No "sheet" rule, so there is nothing to check.'));
  }
  return config;
}

// The same rules kept as JSON in a script property instead of a tab:
// [{"rule": "required", "column": "Invoice"}, ...]
function rowsFromJson(json) {
  return JSON.parse(json).map(function (r) {
    return [r.rule, r.column, r.setting, r.where];
  });
}

// Checks a sheet's values (header row first) against a config.
// `valueAt` returns the value of a cell such as "Summary!B2", or undefined
// if there is no such cell. Returns one failure per problem found.
function checkValues(config, values, valueAt) {
  var failures = config.problems.slice();
  if (!values) {
    if (config.sheet) {
      failures.push(problem('sheet', config.sheet, '', 'There is no sheet called ' + config.sheet + '.'));
    }
    return failures;
  }

  var sheet = config.sheet;
  var header = (values[0] || []).map(clean);
  var rows = values.slice(1);
  var find = function (name) {
    var wanted = name.toLowerCase();
    for (var c = 0; c < header.length; c++) if (header[c].toLowerCase() === wanted) return c;
    return -1;
  };
  var required = {};
  config.rules.forEach(function (r) {
    if (r.rule === 'required') required[r.column.toLowerCase()] = true;
  });

  config.rules.forEach(function (r) {
    var col = find(r.column);
    var label = describe(r);

    if (r.rule === 'required') {
      if (col === -1) {
        var lastCol = columnLetter(Math.max(header.length, 1) - 1);
        failures.push(problem(label, ref(sheet, 'A1:' + lastCol + '1'), header.join(', '), 'There is no column called ' + r.column + '.'));
      }
      return;
    }
    if (col === -1) {
      // A missing required column is already reported once.
      if (!required[r.column.toLowerCase()]) {
        failures.push(problem(label, r.at, r.column, 'There is no column called ' + r.column + ' in ' + sheet + '.'));
      }
      return;
    }

    var filterCol = -1;
    if (r.where) {
      filterCol = find(r.where.column);
      if (filterCol === -1) {
        failures.push(problem(label, r.at, r.where.column, 'There is no column called ' + r.where.column + ' in ' + sheet + '.'));
        return;
      }
    }
    var cell = function (i) {
      return ref(sheet, columnLetter(col) + (i + 2));
    };

    if (r.rule === 'type') {
      var type = r.setting.toLowerCase();
      rows.forEach(function (row, i) {
        var v = row[col];
        if (isBlank(v) || isType(v, type)) return;
        failures.push(problem(label, cell(i), v, 'Expected ' + article(type) + ', found ' + kind(v) + '.'));
      });
    } else if (r.rule === 'not blank') {
      rows.forEach(function (row, i) {
        if (isBlank(row[col])) failures.push(problem(label, cell(i), row[col], 'This cell is blank.'));
      });
    } else if (r.rule === 'unique') {
      var firstRow = {};
      rows.forEach(function (row, i) {
        var v = row[col];
        if (isBlank(v)) return;
        var key = shown(v);
        if (firstRow[key] === undefined) {
          firstRow[key] = i + 2;
        } else {
          failures.push(problem(label, cell(i), v, 'Already used in row ' + firstRow[key] + '.'));
        }
      });
    } else if (r.rule === 'total') {
      var sum = 0;
      rows.forEach(function (row) {
        if (r.where && clean(row[filterCol]).toLowerCase() !== r.where.value.toLowerCase()) return;
        if (typeof row[col] === 'number' && isFinite(row[col])) sum += row[col];
      });
      var target = valueAt(r.setting);
      var scope = r.where ? ' for ' + r.where.column + ' = ' + r.where.value : '';
      if (target === undefined) {
        failures.push(problem(label, r.at, r.setting, 'There is no cell ' + r.setting + '.'));
      } else if (typeof target !== 'number') {
        failures.push(problem(label, r.setting, target, 'Expected a number to compare with, found ' + kind(target) + '.'));
      } else if (Math.abs(sum - target) > TOLERANCE) {
        failures.push(problem(label, r.setting, target,
          r.column + scope + ' adds up to ' + money(sum) + ', which is ' + money(Math.abs(sum - target)) +
          (sum > target ? ' more' : ' less') + ' than this cell.'));
      }
    }
  });
  return failures;
}

function isType(v, type) {
  if (type === 'number') return typeof v === 'number' && isFinite(v);
  if (type === 'whole number') return typeof v === 'number' && Math.floor(v) === v;
  if (type === 'date') return isDate(v) && !isNaN(v.getTime());
  if (type === 'text') return typeof v === 'string';
  if (type === 'yes/no') return typeof v === 'boolean';
  return false;
}

// Dates from a sheet may come from another realm (as in the tests), so
// instanceof Date isn't reliable.
function isDate(v) {
  return Object.prototype.toString.call(v) === '[object Date]';
}

function isBlank(v) {
  return v === '' || v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
}

function kind(v) {
  if (isBlank(v)) return 'a blank';
  if (isDate(v)) return 'a date';
  if (typeof v === 'number') return 'a number';
  if (typeof v === 'boolean') return 'yes/no';
  return 'text "' + v + '"';
}

function article(type) {
  return type === 'yes/no' || type === 'text' ? type : 'a ' + type;
}

function describe(r) {
  var text = r.rule + ': ' + r.column;
  if (r.rule === 'type') text += ' is ' + r.setting.toLowerCase();
  if (r.rule === 'total') text += ' matches ' + r.setting;
  if (r.where) text += ' (' + r.where.column + ' = ' + r.where.value + ')';
  return text;
}

function problem(rule, cell, value, message) {
  return { rule: rule, cell: cell, value: shown(value), message: message };
}

// How a value appears in the Validation tab. Dates come out as yyyy-mm-dd.
function shown(v) {
  if (isBlank(v)) return '';
  if (isDate(v)) {
    if (isNaN(v.getTime())) return 'invalid date';
    return v.getFullYear() + '-' + pad(v.getMonth() + 1) + '-' + pad(v.getDate());
  }
  return String(v);
}

function pad(n) {
  return n < 10 ? '0' + n : String(n);
}

function money(n) {
  return n.toFixed(2);
}

function clean(v) {
  return v === null || v === undefined ? '' : String(v).trim();
}

function columnLetter(index) {
  var letters = '';
  for (var n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    letters = String.fromCharCode(65 + ((n - 1) % 26)) + letters;
  }
  return letters;
}

function ref(sheet, a1) {
  return (/^[A-Za-z0-9_]+$/.test(sheet) ? sheet : "'" + sheet.replace(/'/g, "''") + "'") + '!' + a1;
}
