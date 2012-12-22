/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

(function() {
  let res = [];

  let dir = Cc["@mozilla.org/file/directory_service;1"]
              .getService(Ci.nsIProperties)
              .get("TmpD", Ci.nsIFile);
  dir.initWithPath("/data/local/tmp");
  if (dir.exists() && dir.isDirectory()) {
    let iter = dir.directoryEntries;
    while (iter.hasMoreElements()) {
      let file = iter.getNext().QueryInterface(Ci.nsIFile);
      if (file.leafName.startsWith("memory-report-b2g-remote")) {
        file.remove(true);
      }
    }

    let memDumper = Cc["@mozilla.org/memory-info-dumper;1"]
                    .getService(Ci.nsIMemoryInfoDumper);
    memDumper.dumpMemoryReportsToFile("b2g-remote", false, true);

    // dumpMemoryReportsToFile() only blocks while create the parent process
    // report, so we wait for a few seconds for the content dumps to be done,
    // then return the file list.
    let thread = Cc["@mozilla.org/thread-manager;1"]
                   .getService(Ci.nsIThreadManager).currentThread;
    let when = Date.now() + 4000;
    while (Date.now() < when) {
      thread.processNextEvent(false);
    }

    iter = dir.directoryEntries;
    while (iter.hasMoreElements()) {
      let file = iter.getNext().QueryInterface(Ci.nsIFile);
      if (file.leafName.startsWith("memory-report-b2g-remote")) {
        res.push(file.path);
      }
    }
  }

  return JSON.stringify(res);
})();
