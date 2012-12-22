/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

let Cc = Components.classes;
let Ci = Components.interfaces;
let Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/commonjs/promise/core.js");
Cu.import("resource://gre/modules/devtools/dbg-client.jsm");

this.EXPORTED_SYMBOLS = ["Debugger"];

this.Debugger = {
  _client: null,

  init: function dbg_init(aPort) {
    let enabled = Services.prefs.getBoolPref("devtools.debugger.remote-enabled");
    if (!enabled) {
      Services.prefs.setBoolPref("devtools.debugger.remote-enabled", true);
    }

    let transport = debuggerSocketConnect("localhost", aPort);
    let client = new DebuggerClient(transport);

    let deferred = Promise.defer();
    let self = this;

    client.connect(function onConnected(aType, aTraits) {
      client.listTabs(function(aResponse) {
        client.attachConsole(aResponse.consoleActor, [],
                              function onResponse(aResponse, aConsole) {
          if (!aResponse.error) {
            self._client = aConsole;
            deferred.resolve();
          } else {
            deferred.reject();
          }
        });
      });
    });
    return deferred.promise;
  },

  _buildCode: function dbg_buildCode(aCode) {
    let res = aCode.replace(/Cc\[/g, "Components.classes[")
                   .replace(/Ci./g, "Components.interfaces.");
    return res;
  },

  runCode: function dbg_runCode(aText) {
    let deferred = Promise.defer();
    if (!this._client) {
      let window = Services.wm.getMostRecentWindow("navigator:browser");
      window.setTimeout(function() { deferred.reject("DBG_NOT_READY"); });
      return deferred.promise;
    }

    this._client.evaluateJS(this._buildCode(aText), function(aResponse) {
      deferred.resolve(aResponse);
    });

    return deferred.promise;
  },

  setPref: function dbg_changePref(aName, aValue, aType) {
    //dump("setPref " + aName + " " + aValue + " " + typeof(aValue) + "\n");
    return this.runScript("setPref.js", aName, aValue, aType || "string");
  },

  // Extract the result from a return message.
  unpackResult: function dbg_unpackResult(aResult, aForceJSON) {
    if (aResult.error) {
      let window = Services.wm.getMostRecentWindow("navigator:browser");
      window.console.error("Error unpacking: " + aResult.error);
      return;
    }

    let result = aResult.result;
    if (!aForceJSON && result.type !== "object") {
      return result;
    }

    return JSON.parse(result);
  },

  // Runs a script available under chrome://b2g-remote/content/scripts/
  // Additionnal parameters can be sent and will be substituated for $n
  runScript: function dbg_runScript(aName) {
    //dump("runScript " + aName + "\n");
    let args = arguments;

    let uri = "chrome://b2g-remote/content/scripts/" + aName;
    let deferred = Promise.defer();

    let xhr = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"]
                .createInstance(Ci.nsIXMLHttpRequest);
    xhr.open("GET", uri, true);
    xhr.responseType = "text";

    xhr.addEventListener("load", (function() {
      let text = xhr.responseText;

      for (let i = 1; i < args.length && i < 10; i++) {
        let regexp = new RegExp("\\$" + i, "g");
        text = text.replace(regexp, args[i]);
      }
      //dump(text + "\n");
      let cPromise = this.runCode(text);
      cPromise.then(
        function onSuccess(aResult) {
          //dump("SUCCESS: " + JSON.stringify(aResult, null, 2));
          deferred.resolve(aResult);
        },
        function onError(aError) {
          //dump("ERROR: " + JSON.stringify(aResult, null, 2));
          deffered.reject(aError);
        }
      );
    }).bind(this));

    xhr.addEventListener("error", function() {
      deferred.reject("NO_SUCH_SCRIPT");
    });

    xhr.send(null);
    return deferred.promise;
  }
}
