/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

(function() {
  Components.utils.import("resource://gre/modules/ContactDB.jsm");

  let res = {};
  let global = this;
  let db = new ContactDB(global);
  db.init(global);
  let done = false;

  db.find(
    function onSuccess(aResult) {
      res = aResult;
      done = true;
    },
    function onError() {
      res.error = "ERROR";
      done = true;
    },
    {}
  );

  let thread = Cc["@mozilla.org/thread-manager;1"]
                 .getService(Ci.nsIThreadManager).currentThread;
  while (!done) {
    thread.processNextEvent(false);
  }

  return JSON.stringify(res);
})()
