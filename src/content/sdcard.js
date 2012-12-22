/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

 // Manages SD card functionnality.
let sdcard = {
  currentDir: "/sdcard",
  initialized: false,

  init: function sdcardInit() {
    initFuncts.sdcard = this.doInit.bind(this);
  },

  doInit: function() {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    document.getElementById("sdcard-breadcrumb").addEventListener("click",
      (function(event) {
        let path = event.target.getAttribute("path");
        if (path) {
          dump("path=" + path + "\n");
          this.displayDir(path);
        }
      }).bind(this));
    this.displayDir("/sdcard");
  },

  displayDir: function sdcardDisplayDir(aDir) {
    let table = document.getElementById("file-list");
    table.innerHTML = "";

    let xhr = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"]
                .createInstance(Ci.nsIXMLHttpRequest);
    xhr.open("GET", "b2g://" + aDir, true);
    xhr.responseType = "json";
    xhr.addEventListener("load", function(event) {
      let breadcrumb = document.getElementById("sdcard-breadcrumb");
      breadcrumb.innerHTML = "";
      let paths = aDir.split("/");
      paths.shift();
      let current ="";
      for (let i = 0; i < paths.length; i++) {
        current += "/" + paths[i];
        let fragment;
        if (i == paths.length - 1) {
          fragment = "<li class=\"active\">" + paths[i];
        } else {
          fragment = "<li><button path=\"" + current +
                     "\" class=\"btn btn-link\">" + paths[i] +
                     "</button><span class=\"divider\">/</span>";
        }

        fragment += "</li>";
        breadcrumb.innerHTML += fragment;
      };

      let files = xhr.response;
      let html = "";

      files.forEach(function (aFile) {
        let path = aDir + "/" + aFile.name;

        html += "<tr>";
        let isDir = (aFile.kind === "directory");
        if (isDir) {
          handler = "<img class=\"file-icon\" src=\"moz-icon://file:///tmp\"/><a href=\"javascript:sdcard.displayDir('" + path + "')\">";
        } else {
          let ext = path.split(".").reverse()[0].toLowerCase();
          handler = "<img class=\"file-icon\" src=\"moz-icon://." + ext +
                    "?size=16\"/><a href='b2g://" + path + "' target='_blank'>";
        }
        html += "<td>" + handler + aFile.name + "</a></td>";

        let date = new Date(aFile.time);
        html += "<td><div class=\"file-size\">" +
                (isDir ? "" : humanSize(aFile.size)) + "</div></td>" +
                "<td>" + date.toLocaleString() + "</tr>";
      });
      table.innerHTML = html;
    });
    xhr.send(null);
  }
}
