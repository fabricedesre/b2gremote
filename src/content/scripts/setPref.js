/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

let prefs = Cc["@mozilla.org/preferences-service;1"]
              .getService(Ci.nsIPrefService)
              .QueryInterface(Ci.nsIPrefBranch);

let type = "$3";
switch(type) {
  case "boolean":
    prefs.setBoolPref("$1", "$2" == "true");
    break;
  case "integer":
    prefs.setIntPref("$1", parseInt("$2"));
    break;
  case "string":
    prefs.setCharPref("$1", "$2");
    break;
}
