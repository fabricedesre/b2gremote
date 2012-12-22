/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

let contacts = {
  init: function contactsInit() {
    document.getElementById("browse-contacts").addEventListener("click", this);
  },

  formatContact: function contactsFormat(aContact) {
    let props = aContact.properties;
    let html = "<tr>";

    function addProp(aProp, aInnerFunc) {
      html += "<td>";
      if (props[aProp]) {
        props[aProp].forEach(function(aItem) {
          html += "<div>" + aInnerFunc(aItem) + "</div>";
        });
      }

      html += "</td>";
      dump(html);
    }

    addProp("name", function(aItem) { return aItem; });
    addProp("email", function(aItem) { return "<a href=\"mailto:" +
                                              aItem.value + "\">" +
                                              aItem.value + "</a>"; });
    addProp("tel", function(aItem) { return aItem.value; });

    html += "</tr>";
    return html;
  },

  handleEvent: function contactsHandleEvent(event) {
    let list = document.getElementById("contacts-list");
    list.innerHTML = "";
    Debugger.runScript("getContacts.js").then(
      function onSuccess(aResult) {
        let items = Debugger.unpackResult(aResult, true);
        let html = "";
        for (id in items) {
          html += contacts.formatContact(items[id]);
        }
        list.innerHTML = html;
        list.parentNode.removeAttribute("hidden");
      }
    );
  }
}

let messages = {
  init: function messagesInit() {
    //document.getElementById("browse-messages").addEventListener("click", this);
  },

  handleEvent: function messagesHandleEvent(event) {

  }
}
