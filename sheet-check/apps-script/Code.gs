// The sheet layer: reads the spreadsheet, calls the rules in Rules.gs and
// writes the Validation tab. Anything worth testing lives in Rules.gs.

var CONFIG_TAB = 'Rules';
var RESULT_TAB = 'Validation';
var RULES_PROPERTY = 'SHEET_CHECK_RULES';
var PASS_COLOUR = '#d9ead3';
var FAIL_COLOUR = '#f4cccc';

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Sheet check')
    .addItem('Check now', 'runCheck')
    .addSeparator()
    .addItem('Check every morning', 'installDailyCheck')
    .addItem('Stop the morning check', 'stopDailyCheck')
    .addToUi();
}

function runCheck() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var config = readConfig_(ss);
  var data = config.sheet ? ss.getSheetByName(config.sheet) : null;
  var values = data ? data.getDataRange().getValues() : null;
  var failures = checkValues(config, values, function (a1) {
    try {
      return ss.getRange(a1).getValue();
    } catch (err) {
      return undefined;
    }
  });
  writeResult_(ss, config, values, failures);
  return failures.length;
}

// Rules come from the Rules tab if there is one, otherwise from a script
// property holding the same rules as JSON.
function readConfig_(ss) {
  var tab = ss.getSheetByName(CONFIG_TAB);
  if (tab) {
    return parseRules(tab.getDataRange().getValues().slice(1), CONFIG_TAB);
  }
  var json = PropertiesService.getScriptProperties().getProperty(RULES_PROPERTY);
  if (!json) {
    return parseRules([], 'no Rules tab or ' + RULES_PROPERTY + ' property');
  }
  return parseRules(rowsFromJson(json), RULES_PROPERTY);
}

function writeResult_(ss, config, values, failures) {
  var tab = ss.getSheetByName(RESULT_TAB) || ss.insertSheet(RESULT_TAB);
  tab.clear();
  var rows = [['Rule', 'Cell', 'Value found', "What's wrong"]];
  if (failures.length === 0) {
    rows.push(['All ' + config.rules.length + ' rules pass', config.sheet,
      (values.length - 1) + ' rows checked', '']);
  } else {
    failures.forEach(function (f) {
      rows.push([f.rule, f.cell, f.value, f.message]);
    });
  }
  // Plain text, so a value such as 2026-02-30 is shown exactly as it was found.
  var range = tab.getRange(1, 1, rows.length, 4);
  range.setNumberFormat('@').setValues(rows);
  tab.getRange(1, 1, 1, 4).setFontWeight('bold');
  tab.getRange(2, 1, rows.length - 1, 4).setBackground(failures.length ? FAIL_COLOUR : PASS_COLOUR);
  tab.getRange(1, 1).setNote('Last checked ' +
    Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), 'yyyy-MM-dd HH:mm'));
  tab.setFrozenRows(1);
}
