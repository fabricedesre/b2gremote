/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

let Cc = Components.classes;
let Ci = Components.interfaces;
let Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");
try {
  Cu.import("resource://gre/modules/commonjs/promise/core.js");
} catch (e) {
  Cu.import("resource://gre/modules/commonjs/sdk/core/promise.js");
}
Cu.import("resource://gre/modules/devtools/dbg-client.jsm");

this.EXPORTED_SYMBOLS = ["Debugger"];

this.Debugger = {
  _client: null,
  _webappsActor: null,

  init: function dbg_init(aPort) {
    dump("Debugger init(" + aPort + ")\n");
    let enabled = Services.prefs.getBoolPref("devtools.debugger.remote-enabled");
    if (!enabled) {
      Services.prefs.setBoolPref("devtools.debugger.remote-enabled", true);
    }

    let transport = debuggerSocketConnect("localhost", aPort);
    this._client = new DebuggerClient(transport);

    let deferred = Promise.defer();
    let self = this;

    this._client.connect(function onConnected(aType, aTraits) {
      self._client.listTabs(function(aResponse) {
        if (aResponse.webappsActor) {
          self._webappsActor = aResponse.webappsActor;
          deferred.resolve();
        } else {
          deferred.reject();
        }
      });
    });
    return deferred.promise;
  },

  webappsRequest: function dbg_webappsRequest(aData) {
    dump("webappsRequest " + this._webappsActor + "\n");
    aData.to = this._webappsActor;
    dump("about to send " + JSON.stringify(aData, null, 2) + "\n");
    let deferred = Promise.defer();
    this._client.request(aData,
      function onResponse(aResponse) {
      dump("response=" + JSON.stringify(aResponse, null, 2) + "\n");
      if (aResponse.error) {
        deferred.reject(aResponse.message);
      } else {
        deferred.resolve();
      }
    });
    return deferred.promise;
  },

  setWebappsListener: function dbg_setWebappsListener(aListener) {
    this._client.addListener("webappsEvent", aListener);
  }
}
