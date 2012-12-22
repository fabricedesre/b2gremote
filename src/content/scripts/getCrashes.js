/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function() {
  function findInsertionPoint(reports, date) {
    if (reports.length == 0)
      return 0;

    var min = 0;
    var max = reports.length - 1;
    while (min < max) {
      var mid = parseInt((min + max) / 2);
      if (reports[mid].date < date)
        max = mid - 1;
      else if (reports[mid].date > date)
        min = mid + 1;
      else
        return mid;
    }
    if (reports[min].date <= date)
      return min;
    return min + 1;
  }

  function getReports(aSubmitted) {
    let directoryService = Cc["@mozilla.org/file/directory_service;1"]
                             .getService(Ci.nsIProperties);

    reportsDir = directoryService.get("UAppData", Ci.nsIFile);
    reportsDir.append("Crash Reports");
    reportsDir.append(aSubmitted ? "submitted" : "pending");
    let reports = aSubmitted ? res.submitted : res.pending;

    if (reportsDir.exists() && reportsDir.isDirectory()) {
      let entries = reportsDir.directoryEntries;
      while (entries.hasMoreElements()) {
        let file = entries.getNext().QueryInterface(Ci.nsIFile);
        let leaf = file.leafName;
        if ((aSubmitted && leaf.substr(0, 3) == "bp-" &&
             leaf.substr(-4) == ".txt") ||
            (leaf.substr(-4) == ".dmp")) {
          let entry = {
            id: leaf.slice(0, -4),
            date: file.lastModifiedTime,
          };
          let pos = findInsertionPoint(reports, entry.date);
          reports.splice(pos, 0, entry);
        }
      }
    }
  }

  let res = {
    submitted: [],
    pending: []
  }

  let prefs = Cc["@mozilla.org/preferences-service;1"]
                .getService(Ci.nsIPrefBranch);

  try {
    res.reportURL = prefs.getCharPref("breakpad.reportURL");
    // Ignore any non http/https urls
    if (!/^https?:/i.test(reportURL))
      res.reportURL = null;
  }
  catch (e) { }

  if (res.reportURL) {
    getReports(true);
    getReports(false);
  }

  return JSON.stringify(res);
})()
