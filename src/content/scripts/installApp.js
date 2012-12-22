/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

(function() {
Components.utils.import("resource://gre/modules/Webapps.jsm");
Components.utils.import("resource://gre/modules/FileUtils.jsm");

/**
 * Pseudo-install steps:
 * - Create /data/local/webapps/$1
 * - Move /data/local/tmp/$1.zip to /data/local/$1/application.zip
 * - Extract manifest.webapp
 * - create the app object and register it.
 * - install permissions and web activities.
 * - broadcast an "oninstall" event to content.
 */

let res = "OK";

try {
let id = "$1";

let appDir = FileUtils.getDir("webappsDir", ["webapps", id], true);
appDir.permissions = FileUtils.PERMS_DIRECTORY;

let zipFile = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
zipFile.initWithPath("/data/local/tmp/" + id + ".zip");
zipFile.moveTo(appDir, "application.zip");

zipfile = FileUtils.getFile("webappsDir",
                            ["webapps", id, "application.zip"], true, true);
zipFile.permissions = FileUtils.PERMS_FILE;

let zipReader = Cc["@mozilla.org/libjar/zip-reader;1"]
                  .createInstance(Ci.nsIZipReader);
zipReader.open(zipfile);

let manifest = FileUtils.getFile("webappsDir",
                                 ["webapps", id, "manifest.webapp"], true, true);
let entry = zipReader.extract("manifest.webapp", manifest);

let reg = DOMApplicationRegistry;

let app = {
  id: id,
  origin: "app://" + id,
  installOrigin: "app://" + id,
  removable: true,
  manifestURL: "app://" + id + "/manifest.webapp",
  basePath: FileUtils.getDir("webappsDir", ["webapps"], true, true).path,
  appStatus: 2,
  installTime: Date.now(),
  installState: "installed",
  localId: reg._nextLocalId()
}

reg.webapps[id] = app;
reg.updatePermissionsForApp(id);

reg._readManifests([{ id: id }], function(aResult) {
  let manifest = aResult[0].manifest;
  app.name = manifest.name;
  reg._registerSystemMessages(manifest, app);
  reg._registerActivities(manifest, app, true);
  reg._saveApps();
  app.manifest = manifest;
  reg.broadcastMessage("Webapps:Install:Return:OK",
                       { app: app,
                         oid: "foo",
                         requestID: "bar"
                       });
  delete app.manifest;
  reg.broadcastMessage("Webapps:AddApp", { id: id, app: app });
});

} catch(e) {
  res = "FAIL: " + e;
}

return res;
})()
