/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

let updates = {
  init: function() {
    document.getElementById("check-updates").addEventListener("click", this);
    document.getElementById("download-update").addEventListener("click", this);
  },

  handleEvent: function(aEvent) {
    let id = aEvent.target.getAttribute("id");
    if (id == "check-updates") {
      this.checkUpdates();
    } else if (id == "download-update") {
      this.downloadUpdate();
    }
  },

  downloadUpdate: function() {
    let persist = Cc["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"]
                    .createInstance(Ci.nsIWebBrowserPersist);
    let tmp = Cc["@mozilla.org/file/directory_service;1"]
                .getService(Ci.nsIProperties)
                .get("TmpD", Ci.nsIFile);
    tmp.append("update.mar");
    let uri = Services.io.newURI(this.patch.url, null, null);
    let progress = document.getElementById("updates-progress");
    progress.max = this.patch.size;
    progress.value = 0;
    persist.progressListener = {
      onProgressChange: function(aWebProgress, aRequest, aCurSelfProgress,
                                 aMaxSelfProgress, aCurTotalProgress,
                                 aMaxTotalProgress) {
        progress.value = aCurTotalProgress;
      },
      onStateChange: function(aWebProgress, aRequest, aStateFlags, aStatus) {
        dump("State: " + aStateFlags & Ci.nsIWebProgressListener.STATE_STOP +
             " " + aStatus + "\n");
      }
    }
    progress.removeAttribute("hidden");
    persist.saveURI(uri, null, null, null, "", tmp, null);
  },

  checkUpdates: function() {
    let progress = document.getElementById("updates-progress");
    let updateAvailable = document.getElementById("updates-available");
    updateAvailable.setAttribute("hidden", "hidden");

    Debugger.runScript("updates.js").then(
      function onSuccess(aResult) {
        let res = Debugger.unpackResult(aResult, true);
        let currentBuildID = res.currentBuildID;
        let xhr =  Cc["@mozilla.org/xmlextras/xmlhttprequest;1"]
                     .createInstance(Ci.nsIXMLHttpRequest);
        xhr.open("GET", res.updateURL, true);
        xhr.addEventListener("load", function(event) {
          progress.setAttribute("hidden", "hidden");
          updateAvailable.removeAttribute("hidden");
          let root = xhr.responseXML.documentElement;
          let update = root.firstElementChild;
          if (update) {
            let updateBuildID = update.getAttribute("buildID");
            if (updateBuildID != currentBuildID) {
              let patch = update.firstElementChild;
              replaceTextNode("update-msg", "Update available: " +
                              humanSize(patch.getAttribute("size")));
              updates.patch = { url: patch.getAttribute("URL"),
                                size: patch.getAttribute("size")
                              }
            } else {
              replaceTextNode("update-msg", "No Update available.");
            }
          } else {
            replaceTextNode("update-msg", "No update node found.");
          }
        });
        xhr.addEventListener("error", function(event) {
          progress.setAttribute("hidden", "hidden");
        });
        progress.removeAttribute("hidden");
        xhr.send(null);
      }
    );
  }
}
