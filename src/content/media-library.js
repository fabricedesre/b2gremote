/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

let MediaLibrary = {
  init: function mlInit() {
    document.getElementById("medialibrary-sync")
            .addEventListener("click", MediaLibrary.sync);

    let pictures = Cc["@mozilla.org/file/directory_service;1"]
                     .getService(Ci.nsIProperties)
                     .get("XDGPict", Ci.nsIFile);
    dump("Local pictures directory: " + pictures.path + "\n");
  },

  sync: function mlSync() {

  }
}
