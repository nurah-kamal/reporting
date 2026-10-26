// An installable trigger: unlike onOpen, it runs with the authority of the
// person who installed it, even when nobody has the spreadsheet open.

function installDailyCheck() {
  removeDailyCheck();
  ScriptApp.newTrigger('runCheck')
    .timeBased()
    .everyDays(1)
    .atHour(7)
    .create();
  SpreadsheetApp.getActive().toast('The check will run every morning between 07:00 and 08:00.');
}

function removeDailyCheck() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === 'runCheck') ScriptApp.deleteTrigger(trigger);
  });
}

function stopDailyCheck() {
  removeDailyCheck();
  SpreadsheetApp.getActive().toast('The morning check is off.');
}
