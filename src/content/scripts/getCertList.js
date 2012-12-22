/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

(function() {
  let certdb = Cc["@mozilla.org/security/x509certdb;1"]
                 .getService(Ci.nsIX509CertDB2);

  let res = [];

  let e = certdb.getCerts().getEnumerator();
  while (e.hasMoreElements()) {
    let cert = e.getNext().QueryInterface(Ci.nsIX509Cert);
    if (!cert.windowTitle.startsWith("Builtin Object Token")) {
      res.push(cert.windowTitle);
    }
  }

  return JSON.stringify(res);
})()
