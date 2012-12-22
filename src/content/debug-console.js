/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Initialize the source editor for the debug console.
// XXX that doesn't work for now...
/*let editor = new SourceEditor();

let config = {
mode: SourceEditor.MODES.JAVASCRIPT,
showLineNumbers: true,
initialText: ""
};
editor.init(document.getElementById("debug-input"), config);*/

let debugConsole = {
  // Debug Console functions
  init: function debugInit() {
    document.getElementById("debug-submit").addEventListener("click", this.submit);
    document.getElementById("debug-save").addEventListener("click", this.save);
    document.getElementById("debug-load").addEventListener("click", this.load);
  },

  submit: function debugSubmit(event) {
    document.getElementById("debug-submit").setAttribute("disabled", "disabled");
    Debugger.runCode(document.getElementById("debug-input").value).then(
      function onSuccess(aResult) {
        document.getElementById("debug-output").value = JSON.stringify(aResult);
        document.getElementById("debug-submit").removeAttribute("disabled");
      }
    );
  },

  showFileName: function debugShowFileName(aPath) {
    let fileNode = document.getElementById("debug-filename");
    fileNode.textContent = aPath;
    fileNode.removeAttribute("hidden");
  },

  save: function debugSave(event) {
    let picker = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
    picker.init(window, "Save Script", picker.modeSave);
    picker.appendFilters(picker.filterAll);
    picker.open(
      {
        done: function(aResult) {
          if (aResult != picker.returnOK && aResult != picker.returnReplace) {
            return;
          }
          let path = picker.fileURL.QueryInterface(Ci.nsIFileURL).path;
          let encoder = new TextEncoder();
          let array = encoder.encode(document.getElementById("debug-input").value);
          let promise = OS.File.writeAtomic(path, array,
                                            { tmpPath: path + ".tmp"}).then(
            function() { debugConsole.showFileName(path); }
          );
        }
      }
    );
  },

  load: function debugLoad(event) {
    let picker = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
    picker.init(window, "Load Script", picker.modeOpen);
    picker.appendFilters(picker.filterAll);
    picker.open(
      {
        done: function(aResult) {
          if (aResult != picker.returnOK) {
            return;
          }
          let path = picker.fileURL.QueryInterface(Ci.nsIFileURL).path;
          OS.File.read(path).then(
            function onSuccess(data) {
              let decoder = new TextDecoder();
              document.getElementById("debug-input").value = decoder.decode(data);
              debugConsole.showFileName(path);
            }
          );
        }
      }
    );
  },
}
