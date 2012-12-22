/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

(function() {
  let prefs = Cc["@mozilla.org/preferences-service;1"]
                .getService(Ci.nsIPrefService)
                .QueryInterface(Ci.nsIPrefBranch);

  let res = [];

  let searched = "$1".toLowerCase();

  prefs.getChildList("").forEach(function (prefName) {
    lowerName = prefName.toLowerCase();
    if (/^capability\./.test(prefName) || lowerName.indexOf(searched) == -1)
       return;

    let userSet = prefs.prefHasUserValue(prefName);
    let locked = prefs.prefIsLocked(prefName);
    let value, type;
    try {
      switch(prefs.getPrefType(prefName)) {
        case prefs.PREF_BOOL:
          type = "boolean";
          value = prefs.getBoolPref(prefName);
          break;
       case prefs.PREF_INT:
          type = "integer";
          value = prefs.getIntPref(prefName);
          break;
      case prefs.PREF_STRING:
          type = "string";
          value = prefs.getComplexValue(prefName, Ci.nsISupportsString).data;
          // Try in case it's a localized string (will throw an exception if not)
          if (!userSet &&
               /^chrome:\/\/.+\/locale\/.+\.properties/.test(value))
            value = prefs.getComplexValue(prefName, Ci.nsIPrefLocalizedString).data;
          break;
      }
    } catch(e) { }
   res.push({
     name: prefName,
     value: value,
     type: type,
     locked: locked,
     user_set: userSet
   });
  });

  return JSON.stringify(res);
})()
