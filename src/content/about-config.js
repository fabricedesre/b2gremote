/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
let aboutConfig = {
  init: function aboutConfigInit() {
    document.getElementById("aboutconfig-form").addEventListener("submit", this.updateList);
    document.getElementById("newpref-create").addEventListener("click", this.createPref);
  },

  setBoolPref: function aboutConfigSetBoolPref(aName, aValue) {
    Debugger.setPref(aName, aValue, "boolean").then(
      function onSuccess(aResult) {
        aboutConfig.updateList();
      }
    );
  },

  setStringPref: function aboutConfigSetStringPref(aName, aValue) {
    Debugger.setPref(aName, aValue, "string").then(
      function onSuccess(aResult) {
        aboutConfig.updateList();
      }
    );
  },

  setIntPref: function aboutConfigSetIntPref(aName, aValue) {
    Debugger.setPref(aName, parseInt(aValue), "integer").then(
      function onSuccess(aResult) {
        aboutConfig.updateList();
      }
    );
  },

  createPref: function aboutConfigCreatePref() {
    $("#newPrefModal").modal("hide");

    let name = document.getElementById("newpref-name").value;
    let type = document.getElementById("newpref-type").value;
    let value = document.getElementById("newpref-value").value;

    if (type == "integer") {
      value = parseInt(value);
    } else if (type == "boolean") {
      value = parseInt(value) != 0;
    }

    Debugger.setPref(name, value, type).then(
      function onSuccess(aResult) {
        aboutConfig.updateList();
      }
    );
  },

  updateList: function aboutConfigUpdateList() {
    let value = document.getElementById("aboutconfig-filter").value
                                                             .trim().toLowerCase();
    if (!value.length) {
      return;
    }

    function printPrefName(aPref) {
      return (aPref.user_set ? "<b>" : "") + aPref.name +
             (aPref.user_set ? "</b>" : "");
    }

    function printPrefValue(aPref) {
      let res;
      switch(aPref.type) {
        case "boolean":
          res = (aPref.user_set ? "<b>" : "") +
                "<input type=\"checkbox\"" +
                " onchange=\"aboutConfig.setBoolPref('" + aPref.name + "', this.checked)\"" +
                (aPref.value ? " checked" : "") + ">&nbsp;" + aPref.value +
                (aPref.user_set ? "</b>" : "");
          break;
        case "string":
          res = (aPref.user_set ? "<b>" : "") +
                "<input type=\"text\"" +
                " onchange=\"aboutConfig.setStringPref('" + aPref.name +
                  "', this.value)\" value=\"" + aPref.value + "\"/>";
                (aPref.user_set ? "</b>" : "");
          break;
        case "integer":
          res = (aPref.user_set ? "<b>" : "") +
                "<input type=\"number\"" +
                " onchange=\"aboutConfig.setIntPref('" + aPref.name +
                  "', this.value)\" value=" + aPref.value + " />";
                (aPref.user_set ? "</b>" : "");
          break;
        default:
          res = (aPref.user_set ? "<b>" : "") + aPref.value +
                (aPref.user_set ? "</b>" : "");
          break;
      }
      return res;
    }

    let list = document.getElementById("aboutconfig-list");
    list.innerHTML = "";
    Debugger.runScript("getPrefList.js", value).then(
      function onSuccess(aResult) {
        list.parentNode.removeAttribute("hidden");
        let prefs = Debugger.unpackResult(aResult, true);
        let html = "";
        prefs.forEach(function(aPref) {
          html += "<tr><td>" + printPrefName(aPref) + "</td><td>" +
                  printPrefValue(aPref) + "</td></tr>";
        });
        list.innerHTML = html;
      },
      function onError() {
        list.parentNode.setAttribute("hidden", "hidden");
      }
    );
  }
}
