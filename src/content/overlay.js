/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

let Cc = Components.classes;
let Ci = Components.interfaces;
let Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("chrome://b2g-remote/content/adb.jsm");

(function() {
  let adbTracker = {
    observe: function(aSubject, aTopic, aData) {
      dump("Got device event: " + aTopic + " " + aData + "\n");

      let connected = aTopic == "adb-device-connected";
      let alertsService = Cc["@mozilla.org/alerts-service;1"]
                            .getService(Ci.nsIAlertsService);
      alertsService.showAlertNotification(
        "chrome://b2g-remote/skin/logo_0064_65.png",
        "B2G Remote Control",
        aData + (connected ? " is now connected."
                           : " is now disconnected.")
      );
    }
  }

  Services.obs.addObserver({
    observe: function(aSubject, aTopic, aData) {
      ADB.trackDevices();
      Services.obs.addObserver(adbTracker, "adb-device-connected", false);
      Services.obs.addObserver(adbTracker, "adb-device-disconnected", false);
    }
  }, "adb-ready", false);
})()
