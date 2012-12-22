/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const Cc = Components.classes;
const Ci = Components.interfaces;

// Simple about:b2g component that redirects to
// chrome://b2g-remote/content/about.html

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

function AboutB2G() {
}

AboutB2G.prototype = {
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIAboutModule]),
  classID: Components.ID("{30cae012-9c62-491f-a93b-ecfe554cff59}"),

  // nsIAboutModule
  getURIFlags: function(aURI) {
    return Ci.nsIAboutModule.ALLOW_SCRIPT;
  },

  newChannel: function(aURI) {
    let ios = Cc["@mozilla.org/network/io-service;1"]
                .getService(Ci.nsIIOService);

    let channel = ios.newChannel("chrome://b2g-remote/content/about.html",
                                 null, null);
    //channel.originalURI = aURI;
    return channel;
  }
};

this.NSGetFactory = XPCOMUtils.generateNSGetFactory([AboutB2G]);
