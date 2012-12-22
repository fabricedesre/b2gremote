/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

(function() {
  let res = {}
  let appInfo = Cc["@mozilla.org/xre/app-info;1"]
                  .getService(Ci.nsIXULAppInfo);
  res.platform_version = appInfo.platformVersion;
  res.platform_build_id = appInfo.platformBuildID;

  let prefs = Cc["@mozilla.org/preferences-service;1"]
                .getService(Ci.nsIPrefService).QueryInterface(Ci.nsIPrefBranch);
  res.update_channel = prefs.getCharPref("app.update.channel");
  return JSON.stringify(res);
})()