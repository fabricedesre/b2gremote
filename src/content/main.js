/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

let Cc = Components.classes;
let Ci = Components.interfaces;
let Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/commonjs/promise/core.js");
Cu.import("chrome://b2g-remote/content/adb.jsm");
Cu.import("chrome://b2g-remote/content/debugger.jsm");
Cu.import("resource://gre/modules/osfile.jsm");

//Cu.import("resource:///modules/source-editor.jsm");

// The default remote debugging port.
let debuggerPort = 6000;

function log(aText) {
  window.console.log(aText);
}

function replaceTextNode(aId, aText) {
  document.getElementById(aId).firstChild.textContent = aText;
}

function humanSize(aSize) {
  let oneK = 1024;
  let oneM = oneK * oneK;
  let oneG = oneM * oneK;

  function pad(aValue) {
    let s = "" + aValue;
    if (s.indexOf(".") == -1) {
      s += ".0";
    }
    return s;
  }

  if (aSize > oneG) {
    return pad(Math.round((aSize / oneG) * 10) / 10) + "G";
  } else if (aSize > oneM) {
    return pad(Math.round((aSize / oneM) * 10) / 10) + "M";
  } else if (aSize > oneK) {
    return pad(Math.round((aSize / oneK) * 10) / 10) + "K";
  } else {
    return aSize + "B";
  }
}

let initFuncts = {};

// Panel navigation
let oldHash = window.location.hash || '#device-info';
function showPanel() {
  let hash = window.location.hash || '#device-info';

  let oldPanel = document.querySelector(oldHash);
  let newPanel = document.querySelector(hash);

  oldPanel.setAttribute("hidden", "true");
  newPanel.removeAttribute("hidden");

  [oldHash, hash].forEach(function(aHash) {
    let selector = "li a[href='" + aHash + "']";
    let node = document.querySelector(selector);
    if (node) {
      node.parentNode.classList.toggle("active");
    }
  });

  oldHash = hash;

  let initFunct = initFuncts[hash.substring(1)];
  if (initFunct && typeof initFunct == "function") {
    initFunct();
  }
}

function init() {
  ADB.listDevices().then(
    function onSuccess(data) {
      if (data.length) {
        replaceTextNode("adb-device", data[0]);
        document.getElementById("adb-device").classList.remove("error");
        let nodes = document.querySelectorAll(".needs-adb, .needs-dbg-adb");
        for (let i = 0; i < nodes.length; i++) {
          nodes.item(i).classList.add("has-adb");
        }
        document.getElementById("adb-help").classList.add("hidden");
      }
      ADB.forwardPort(debuggerPort).then(
        function onSuccess(data) {
          Debugger.init(debuggerPort).then(
            function onSuccess() {
              replaceTextNode("remote-connection",
                              "Remote Debugger Connected on Port " + debuggerPort);
              document.getElementById("remote-connection")
                      .classList.remove("error");
              let nodes = document.querySelectorAll(".needs-dbg, .needs-dbg-adb");
              for (let i = 0; i < nodes.length; i++) {
                nodes.item(i).classList.add("has-dbg");
              }
              document.getElementById("dbg-help").classList.add("hidden");
              Debugger.runScript("deviceInfo.js").then(
                function onSuccess(aResult) {
                  let res = Debugger.unpackResult(aResult, true);
                  let table = document.getElementById("device-info-details");
                  table.parentNode.removeAttribute("hidden");
                  function addRow(aName, aValue) {
                    table.innerHTML += "<tr><td>" + aName + "</td><td>" +
                                       aValue + "</td></tr>";
                  }
                  addRow("Gecko version", res.platform_version);
                  addRow("Build ID", res.platform_build_id);
                  addRow("Update Channel", res.update_channel);
                }
              );
            }
          );
        }
      );
    },
    function onError(error) {
      window.console.log(error);
    }
  );
}

// Global initialization
window.addEventListener("load", function loadWindow() {
  window.removeEventListener("load", loadWindow);
  window.addEventListener("hashchange", showPanel);

  userAgent.init();
  sdcard.init();
  contacts.init();
  messages.init();
  aboutConfig.init();
  aboutMemory.init();
  aboutCrashes.init();
  updates.init();
  MediaLibrary.init();
  debugConsole.init();
  appsManager.init();

  init();
});

let ADBObserver = {
  observe: function(aSubject, aTopic, aData) {
    window.location.reload();
  }
}

Services.obs.addObserver(ADBObserver, "adb-device-connected", false);
Services.obs.addObserver(ADBObserver, "adb-device-disconnected", false);
