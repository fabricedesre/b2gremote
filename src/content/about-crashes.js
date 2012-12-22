/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

let aboutCrashes = {

  init: function crashesInit() {
    initFuncts["about-crashes"] = this.buildUI.bind(this);
  },

  buildUI: function crashesBuildUI() {
    let submitted = document.getElementById("aboutcrashes-submitted");
    let pending = document.getElementById("aboutcrashes-pending");
    submitted.innerHTML = "";
    pending.innerHTML = "";

    Debugger.runScript("getCrashes.js").then(
      function onSuccess(aResult) {
        let res = Debugger.unpackResult(aResult, true);
        let html = ""
        res.submitted.forEach(function(aItem) {
          let date = new Date(aItem.date);
          let url = res.reportURL + aItem.id;
          html += "<tr><td><a href='" + url + "'> " + aItem.id +
                  "</a></td><td>" + date.toLocaleString() + "</td></tr>";
        });
        submitted.innerHTML = html;

        html = ""
        res.pending.forEach(function(aItem) {
          let date = new Date(aItem.date);
          html += "<tr><td>" + aItem.id + "</td><td>" +
                  date.toLocaleString() + "</td></tr>";
        });
        pending.innerHTML = html;
      }
    );
  }
}
