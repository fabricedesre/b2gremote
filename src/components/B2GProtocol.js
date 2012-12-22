/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("chrome://b2g-remote/content/adb.jsm");
Cu.import("chrome://b2g-remote/content/debugger.jsm");
Cu.import("resource://gre/modules/osfile.jsm");

function B2GProtocolHandler() {
}

B2GProtocolHandler.prototype = {
  classID: Components.ID("{783a881d-eae8-4cfb-8ac4-6b9f3b353a11}"),
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIProtocolHandler]),

  scheme: "b2g",
  defaultPort: -1,

  protocolFlags: Ci.nsIProtocolHandler.URI_NOAUTH |
                 Ci.nsIProtocolHandler.URI_LOADABLE_BY_ANYONE,

  newURI: function app_phNewURI(aSpec, aOriginCharset, aBaseURI) {
    let uri = Cc["@mozilla.org/network/standard-url;1"]
              .createInstance(Ci.nsIStandardURL);
    uri.init(Ci.nsIStandardURL.URLTYPE_NO_AUTHORITY, -1, aSpec, aOriginCharset,
             aBaseURI);
    return uri.QueryInterface(Ci.nsIURI);
  },

  _createTempFile: function b2g_phCreateTemp(aName) {
    let tmp = Cc["@mozilla.org/file/directory_service;1"]
                .getService(Ci.nsIProperties)
                .get("TmpD", Ci.nsIFile);
    tmp.append(aName);
    tmp.createUnique(Ci.nsIFile.NORMAL_FILE_TYPE, parseInt("644", 8));
    return tmp.path;
  },

  newChannel: function b2g_phNewChannel(aURI) {
    let path = decodeURIComponent(aURI.spec.substring("b2g://".length));

    let tmpPath;

    // Really hackish for now. The right way to do that is to write a new
    // channel implementation.
    // We load listDirectory to check if it's a directory.
    //   - yes? store the json file and serve a file:// url for that.
    //   - no? do an |adb pull $file $tmp| and serve this file.

    let self = this;
    let done = false;
    let uri;

    Debugger.runScript("listDirectory.js", path).then(
      function onSuccess(aResult) {
        let data = Debugger.unpackResult(aResult, true);
        if (data.error) {
          if (data.error == "NoSuchPath") {
            done = true;
          } else if (data.error == "NotDirectory") {
            // This is a file, pull it.
            let ext = path.split(".").reverse()[0];
            tmpPath = self._createTempFile("b2g-file." + ext);
            ADB.pull(path, tmpPath).then(
              function onSuccess(aResult) {
                uri = "file://" + tmpPath;
                done = true;
              },
              function onError() {
                done = true;
              }
            );
          }
        } else {
          // Save the JSON to a tmp file.
          tmpPath = self._createTempFile("b2g-dir.json");
          let encoder = new TextEncoder();
          let promise = OS.File.writeAtomic(tmpPath,
                                            encoder.encode(JSON.stringify(data)),
                                            { tmpPath: tmpPath + ".tmp"});
          promise.then(function onSuccess(aResult) {
            uri = "file://" + tmpPath;
            done = true;
          });
        }
      }
    );

    let currentThread = Services.tm.currentThread;
    while (!done) {
      currentThread.processNextEvent(false);
    }

    if (!uri) {
      throw Components.results.NS_ERROR_ILLEGAL_VALUE;
    }

    // Registering the temp file for removal at shutdown, since we don't
    // have a reliable way to do it sooner.
    let helperSvc = Cc["@mozilla.org/uriloader/external-helper-app-service;1"]
                      .getService(Ci.nsPIExternalAppLauncher);
    let file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
    file.initWithPath(tmpPath);
    helperSvc.deleteTemporaryFileOnExit(file);

    let channel = Services.io.newChannel(uri, null, null);
    channel.QueryInterface(Ci.nsIChannel).originalURI = aURI;

    return channel;
  },

  allowPort: function b2g_phAllowPort(aPort, aScheme) {
    return false;
  }
};

this.NSGetFactory = XPCOMUtils.generateNSGetFactory([B2GProtocolHandler]);
