/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

(function() {
  Components.utils.import("resource://gre/modules/Webapps.jsm");

  let res = [];
  for (let id in DOMApplicationRegistry.webapps) {
    let app = DOMApplicationRegistry.webapps[id];
    res.push({
      id: id,
      name: app.name,
      removable: app.removable,
      origin: app.origin,
      manifestURL: app.manifestURL
    });
  }
  return JSON.stringify(res);
})()
