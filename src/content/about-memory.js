/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

let aboutMemory = {
  files: [],

  init: function aboutMemInit() {
    document.getElementById("ask-aboutmemory").addEventListener("click", this);
    document.getElementById("view-aboutmemory").addEventListener("click", this);
  },

  ask: function aboutMemAsk() {
    let askButton = document.getElementById("ask-aboutmemory");
    let viewButton = document.getElementById("view-aboutmemory");
    let progressBar = document.getElementById("aboutmemory-progress");
    askButton.setAttribute("disabled", "disabled");
    viewButton.parentNode.setAttribute("hidden", "hidden");
    let list = document.getElementById("memreport-list");
    list.parentNode.setAttribute("hidden", "hidden");
    progressBar.removeAttribute("hidden");
    list.innerHTML = "";
    Debugger.runScript("memoryReport.js").then(
      function onSuccess(aResult) {
        let res = aboutMemory.files = Debugger.unpackResult(aResult, true);
        let html = "";
        res.forEach(function(aPath) {
          html += "<tr><td>" + aPath + "</td></tr>";
        });
        list.innerHTML = html;
        list.parentNode.removeAttribute("hidden");
        askButton.removeAttribute("disabled");
        viewButton.parentNode.removeAttribute("hidden");
        progressBar.setAttribute("hidden", "hidden");
      },
      function onError() {
        list.parentNode.removeAttribute("hidden");
        list.innerHTML = "<tr><td>Error Creating Report</td></tr>";
        askButton.removeAttribute("disabled");
        progressBar.setAttribute("hidden", "hidden");
      }
    );
  },

  loadFile: function aboutMemLoadFile(aPath) {
    let filename = aPath.split("/").reverse()[0];
    let tmp = Cc["@mozilla.org/file/directory_service;1"]
                .getService(Ci.nsIProperties)
                .get("TmpD", Ci.nsIFile);
    tmp.append(filename);
    let deferred = Promise.defer();
    ADB.pull(aPath, tmp.path).then(
      function() {
        OS.File.read(tmp.path).then(
          function onSuccess(aResult) {
            tmp.remove(true);
            let decoder = new TextDecoder();
            deferred.resolve(decoder.decode(Zee.decompress(aResult)));
          }
        );
      },
      function() { deferred.reject(); }
    );
    return deferred.promise;
  },

  displayReports: function aboutMemDisplay() {
    // Save the report to $tmp/b2g-memory-report.json
    let tmp = Cc["@mozilla.org/file/directory_service;1"]
                .getService(Ci.nsIProperties)
                .get("TmpD", Ci.nsIFile);
    tmp.append("b2g-memory-report.json");
    let path = tmp.path
    let encoder = new TextEncoder();
    let array = encoder.encode(JSON.stringify(this.reports));
    OS.File.writeAtomic(path, array, { tmpPath: path + ".tmp"}).then(
      function onSuccess() {
        let browser = Services.wm.getMostRecentWindow("navigator:browser");
        browser.openUILinkIn("about:memory?file=" + path, "tab");
      }
    );
  },

  view: function aboutMemView() {
    if (!this.files.length) {
      return;
    }

    let filesToLoad = this.files.length;
    let filesLoaded = 0;
    let reports = this.reports =
      { "version": 1,
        "hasMozMallocUsableSize": true,
        "reports": [ ]
     };

    this.files.forEach(
      function(aFile) {
        this.loadFile(aFile).then(
          function onSuccess(aResult) {
            let data = JSON.parse(aResult);
            filesLoaded += 1;
            data.reports.forEach(function(aReport) {
              reports.reports.push(aReport);
            });
            if (filesLoaded == filesToLoad) {
              aboutMemory.displayReports();
            }
          }
        );
      }, this);
  },

  handleEvent: function aboutMemHandleEvent(event) {
    dump(event.target.getAttribute("id") + "\n");
    switch(event.target.getAttribute("id")) {
      case "ask-aboutmemory":
        this.ask();
        break;
      case "view-aboutmemory":
        this.view();
        break;
    }
  }
}
