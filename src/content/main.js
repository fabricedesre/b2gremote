/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

let Cc = Components.classes;
let Ci = Components.interfaces;
let Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/commonjs/sdk/core/promise.js");
Cu.import("chrome://b2g-remote/content/adb.jsm");
Cu.import("chrome://b2g-remote/content/debugger.jsm");
Cu.import("resource://gre/modules/osfile.jsm");
Cu.import("resource://gre/modules/NetUtil.jsm");
Cu.import("resource://gre/modules/FileUtils.jsm");

// The default remote debugging port.
let debuggerPort = 6000;

// l10n string bundle
let strings = Services.strings
              .createBundle("chrome://b2g-remote/locale/b2gremote.properties");

// Can be "hosted" or "packaged"
let appKind;

// The application type, as defined in nsIPrincipal
let appType;

// The path to the app's directory.
let appPath;

// The app id used to push to the device.
let appId;

// true if we have a device connected through ADB.
let adbReady = false;

// true if we the remote debugger is connected.
let dbgReady = false;

function log(aText) {
  window.console.log(aText);
  dump(aText + "\n");
}

function replaceTextNode(aId, aText) {
  document.getElementById(aId).firstChild.textContent = aText;
}

function guessAppKind() {
  let dir = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
  dir.initWithPath(appPath);
  appKind = null;
  if (!dir.exists()) {
    return;
  }

  appId = dir.leafName;

  let file = dir.clone();
  file.append("application.zip");
  if (file.exists()) {
    appKind = "packaged";
    return;
  }

  let missing = ["manifest.webapp", "metadata.json"]
                .some(function(aName) {
                  file = dir.clone();
                  dir.append(aName);
                  return !file.exists();
                });
  if (!missing) {
    appKind = "hosted";
  }
}

function appStatusFromType(aType) {
  switch(aType) {
    case "privileged":
      return Ci.nsIPrincipal.APP_STATUS_INSTALLED;
      break;
    case "certified":
      return Ci.nsIPrincipal.APP_STATUS_CERTIFIED;
      break;
    default:
      return Ci.nsIPrincipal.APP_STATUS_INSTALLED;
  }
}

// Get the application type by either reading manifest.webapp or extracting
// it from application.zip
function getAppType(aCallback) {
  if (!appKind) {
    return;
  }

  let dir = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
  dir.initWithPath(appPath);

  // Default value if anything goes wrong.
  appType = Ci.nsIPrincipal.APP_STATUS_INSTALLED;

  if (appKind == "hosted") {
    let file = dir.clone();
    file.append("manifest.webapp");

    let decoder = new TextDecoder();
    let promise = OS.File.read(file.path);
    promise = promise.then(
      function onSuccess(aArray) {
        try {
          let manifest = JSON.parse(decoder.decode(aArray));
          if ("type" in manifest) {
            appType = appStatusFromType(manifest.type);
          }
        } catch(e) { }
        aCallback();
      },
      function onError() {
        aCallback();
      }
    );
  } else {
    let file = dir.clone();
    file.append("application.zip");
    let zipReader  = Cc["@mozilla.org/libjar/zip-reader;1"]
                       .createInstance(Ci.nsIZipReader);
    zipReader.open(file);
    let istream = zipReader.getInputStream("manifest.webapp");

    // Obtain a converter to read from a UTF-8 encoded input stream.
    let converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"]
                      .createInstance(Ci.nsIScriptableUnicodeConverter);
    converter.charset = "UTF-8";

    let manifest = JSON.parse(converter.ConvertToUnicode(NetUtil.readInputStreamToString(istream,
                                                         istream.available()) || ""));

    zipReader.close();
    appType = appStatusFromType(manifest.type);
    aCallback();
  }
}

function chooseAppDir() {
  let picker = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
  picker.init(window, strings.GetStringFromName("choose-app-dir"),
              picker.modeGetFolder);
  picker.appendFilters(picker.filterAll);
  picker.open(
    {
      done: function(aResult) {
        const typeStrings = ["NoApp", "Web", "Privileged", "Certified"];

        if (aResult != picker.returnOK) {
          return;
        }
        appPath = picker.fileURL.QueryInterface(Ci.nsIFileURL).path;
        guessAppKind();
        if (appKind) {
          getAppType(function() {
            replaceTextNode("app-info",
                             appKind ? appPath + " : " + appKind +
                                       " (" + typeStrings[appType] + ")"
                                     : " ");
            updateUIState();
          });
        }
        updateUIState();
      }
    }
  );
}

function updateUIState() {
  log("updating UI - dbgReady=" + dbgReady + " adbReady=" + adbReady);
  let deviceButton = document.getElementById("push-device");
  let simulatorButton = document.getElementById("push-simulator");
  let pushBox = document.getElementById("push-box");

  if (dbgReady) {
    simulatorButton.removeAttribute("disabled");
    if (adbReady) {
      deviceButton.removeAttribute("disabled");
    } else {
      deviceButton.setAttribute("disabled", "true");
    }
  } else {
    deviceButton.setAttribute("disabled", "true");
    simulatorButton.setAttribute("disabled", "true");
  }

  if (appPath && appKind) {
    pushBox.removeAttribute("hidden");
  } else {
    pushBox.setAttribute("hidden", "true");
  }
}

let pushProgress = {
  get _node() { return document.getElementById("push-progress") },

  show: function progressShow() {
    this._node.removeAttribute("hidden");
  },

  hide: function progressHide() {
    this._node.setAttribute("hidden", "true");
  },

  setMessage: function progressMessage(aMsg) {
    replaceTextNode("progress-message", aMsg);
  }
}

function onWebappsEvent(aState, aType, aPacket) {
  pushProgress.hide();
  if (aType.error) {
    window.alert(strings.GetStringFromName("install.error") +
                 " " + aType.message);
  } else {
    window.alert(strings.GetStringFromName("install.success"));
  }
}

function pushToDevice() {
  if (!appKind || !appPath || !appId) {
    return;
  }

  pushProgress.show();

  let filesToPush = appKind == "hosted" ? ["manifest.webapp", "metadata.json"]
                                        : ["application.zip"];

  let destDir = "/data/local/tmp/b2g/" + appId + "/";
  let dir = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
  dir.initWithPath(appPath);

  let filePushed  =0;
  let error = false;

  function pushedFile() {
    filePushed++;
    log(filePushed + " files pushed.");
    if (filePushed == filesToPush.length && !error) {
      log("All files pushed.");
      // We can now call the remote debugger install method.
      pushProgress.setMessage("Installing application");
      Debugger.webappsRequest({ type: "install",
                                appId: appId,
                                appType: Ci.nsIPrincipal.APP_STATUS_INSTALLED
                              })
      .then(
        function installSuccess() {
          // Nothing to do here, we'll wait for the async event.
        },
        function installError(aError) {
          window.alert(strings.GetStringFromName("install.error") +
                       " " + aType.message);
          pushProgress.hide();
        }
      );
    } else {
      pushProgress.hide();
    }
  }

  filesToPush.forEach(function(aName) {
    let file = dir.clone();
    file.append(aName);
    pushProgress.setMessage("Pushing file: " + aName);

    ADB.push(file.path, destDir + aName).then(
      pushedFile,
      function pushError() {
        error = true;
        pushedFile();
      }
    );
  });
}

function pushToSimulator() {
  if (!appKind || !appPath || !appId) {
    return;
  }

  // Move needed files to $TMP/b2g/$appId
  let filesToPush = appKind == "hosted" ? ["manifest.webapp", "metadata.json"]
                                        : ["application.zip"];

  let destDir = FileUtils.getDir("TmpD", ["b2g", appId], true, false);
  let origDir = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
  origDir.initWithPath(appPath);
  filesToPush.forEach(function(aName) {
    let file = origDir.clone();
    file.append(aName);
    file.moveTo(destDir, aName);
  });

  // We can now call the remote debugger install method.
  pushProgress.show();
  pushProgress.setMessage("Installing application");
  Debugger.webappsRequest({ type: "install",
                            appId: appId,
                            appType: Ci.nsIPrincipal.APP_STATUS_INSTALLED
                          })
  .then(
    function installSuccess() {
      // Nothing to do here, we'll wait for the async event.
    },
    function installError(aError) {
      window.alert(strings.GetStringFromName("install.error") +
                   " " + aType.message);
      pushProgress.hide();
    }
  );
}

function initADB() {
  ADB.listDevices().then(
    function onSuccess(data) {
      if (data.length) {
        replaceTextNode("adb-device", data[0]);
      }
      ADB.forwardPort(debuggerPort).then(
        function onSuccess(data) {
          adbReady = true;
          updateUIState();
        }
      );
    },
    function onError(error) {
      window.console.log(error);
    }
  );
}

function initDBG() {
  Debugger.init(debuggerPort).then(
    function onSuccess() {
      dbgReady = true;
      Debugger.setWebappsListener(onWebappsEvent);
      updateUIState();
    }
  );
}

function init() {
  log("init b2gremote");
  updateUIState();

  initADB();
  initDBG();

  document.getElementById("choose-dir-button")
          .addEventListener("click", chooseAppDir);
  document.getElementById("push-device")
          .addEventListener("click", pushToDevice);
  document.getElementById("push-simulator")
          .addEventListener("click", pushToSimulator);
}

let ADBObserver = {
  observe: function(aSubject, aTopic, aData) {
    if (aTopic == "adb-device-connected") {
      initADB();
    } else {
      adbReady = false;
      updateUIState();
    }
  }
}

// Global initialization
window.addEventListener("load", function loadWindow() {
  window.removeEventListener("load", loadWindow);

  init();
});

Services.obs.addObserver(ADBObserver, "adb-device-connected", false);
Services.obs.addObserver(ADBObserver, "adb-device-disconnected", false);
