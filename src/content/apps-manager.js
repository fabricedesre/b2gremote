/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

Cu.import("resource://gre/modules/NetUtil.jsm");

let appsManager = {
  apps: null,

  init: function appsMgrInit() {
    initFuncts["apps-manager"] = this.updateLists.bind(this);
    document.getElementById("newcert-upload")
            .addEventListener("click", this.uploadCert);
    document.getElementById("package-upload")
            .addEventListener("click", this.install);
  },

  updateLists: function appsMgrUpdateLists() {
    this.updateApps();
    this.updateCerts();
  },

  updateApps: function appsMgrUpdateApps() {
    let list = document.getElementById("applications-list");
    Debugger.runScript("getApps.js").then(
      function onSuccess(aResult) {
        appsManager.apps = Debugger.unpackResult(aResult, true);
        let html = "";
        for (let i = 0; i < appsManager.apps.length; i++) {
          let app = appsManager.apps[i];
          html += "<tr><td>" + app.name + "</td><td>" +
                  "<button class=\"btn\" onclick=\"appsManager.launch(" +
                  i + ")\">Launch</button>";
          if (app.removable) {
            html += "<button class=\"btn\" onclick=\"appsManager.uninstall(" +
                    i + ")\">Uninstall</button>";
          }
          html += "</td></tr>";
        }
        list.innerHTML = html;
      },
      function onError() {
      }
    );
  },

  launch: function appsMgrLaunch(aId) {
    let app = this.apps[aId];
    Debugger.runScript("launchApp.js", app.manifestURL, app.origin);
  },

  uninstall: function appsMgrUninstall(aId) {
    let app = this.apps[aId];
    Debugger.runScript("uninstallApp.js", app.origin).then(
      function onSuccess(aResult) {
        appsManager.list();
      }
    );
  },

  install: function appsMgrInstall() {
    /*ADB.push("/home/fabrice/test.bin",
             "/data/local/test.bin"); */
    let path = document.getElementById("package-path").value;
    dump("Uploading application from " + path + "\n");
    $("#appInstallModal").modal("hide");

    // Steps to install:
    // 1. open the file as a zip, check that it contains /manifest.webapp
    // 2. create a new UUID for this app.
    // 3. upload the files as uuid.zip and uuid.webapp under /data/local/tmp
    // 4. run the magic script, with uuid as a parameter

    // 1.
    let file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
    file.initWithPath(path);
    if (!file.exists()) {
      return;
    }
    let zipReader = Cc["@mozilla.org/libjar/zip-reader;1"]
                      .createInstance(Ci.nsIZipReader);
    zipReader.open(file);
    if (!zipReader.hasEntry("manifest.webapp")) {
      dump("No manifest.webapp in application package!!\n");
      zipReader.close();
      return;
    }
    zipReader.close();

    // 2.
    let uuidGenerator = Cc["@mozilla.org/uuid-generator;1"]
                          .getService(Ci.nsIUUIDGenerator);
    let uuid = uuidGenerator.generateUUID().toString();

    // 3.
    ADB.push(path, "/data/local/tmp/" + uuid + ".zip").then(
      function onSuccess(aResult) {
        dump("Pushed zip succeeded: " + aResult + "\n");
        Debugger.runScript("installApp.js", uuid).then(
          function onSuccess(aResult) {
            dump("Install script: " + aResult.result + "\n");
            updateApps.updateApps();
          }
        );
      },
      function onError(aError) {
        dump("Pushed zip failed: " + aError + "\n");
      }
    );
  },

  updateCerts: function appsMgrUpdateCerts() {
    let list = document.getElementById("certs-list");
    Debugger.runScript("getCertList.js").then(
      function onSuccess(aResult) {
        let certs = Debugger.unpackResult(aResult, true);
        let html = "";
        certs.forEach(function(aCert) {
          html += "<tr><td>" + aCert + "</td></tr>";
        });
        list.innerHTML = html;
      },
      function onError() {
      }
    );
  },

  uploadCert: function appsMgrUploadCert() {
    let filePath = document.getElementById("newcert-path").value;
    if (!filePath) {
      $("#certModal").modal("hide");
      return;
    }

    let certName = document.getElementById("newcert-name").value || "dev-cert";
    dump("Uploading " + filePath + " as " + certName + "\n");
    // We load the certificate locally, encode it in base 64 to send it via
    // the remote debugger.
    let file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
    file.initWithPath(filePath);

    try {
      let fstream = Cc["@mozilla.org/network/file-input-stream;1"]
                      .createInstance(Ci.nsIFileInputStream);
      fstream.init(file, -1, 0, 0);
      let data = NetUtil.readInputStreamToString(fstream, fstream.available());
      fstream.close();

      Debugger.runScript("addCert.js", window.btoa(data), certName).then(
        function onSuccess(aResult) {
          // XXX : check if this was successful.
          appsManager.updateCerts();
        }
      );
    } catch(e) { dump(e + "\n"); }

    $("#certModal").modal("hide");
  }
}
