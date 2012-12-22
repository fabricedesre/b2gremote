/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const UserAgents = {
  "custom": { name: "Custom UA" },
  "default": { value: "Mozilla/5.0 (Mobile; rv:18.0) Gecko/18.0 Firefox/18.0",
               name: "Default B2G" },
  "fennec":  { value: "Mozilla/5.0 (Android; Mobile; rv:18.0) Gecko/18.0 Firefox/18.0",
               name: "Fennec" },
  "android": { value: "Mozilla/5.0 (Linux; Android 4.0.4; Galaxy Nexus Build/IMM76B) AppleWebKit/535.19 (KHTML, like Gecko) Chrome/18.0.1025.133 Mobile Safari/535.19",
               name: "Stock Android" },
  "iphone":  { value: "Mozilla/5.0 (iPhone; U; CPU like Mac OS X; en) AppleWebKit/420+ (KHTML, like Gecko) Version/3.0 Mobile/1A543 Safari/419.3",
               name: "iPhone" },
  "ipad":    { value: "Mozilla/5.0 (iPad; U; CPU OS 3_2 like Mac OS X; en-us) AppleWebKit/531.21.10 (KHTML, like Gecko) Version/4.0.4 Mobile/7B334b Safari/531.21.10",
               name: "iPad" }
}

let userAgent = {
  init: function userAgentInit() {
    // Add the user agents to the <select>
    let uaList = document.getElementById("user-agent-select");
    let index = 0;
    for (let ua in UserAgents) {
      uaList.innerHTML += "<option value='" + ua + "'>" +
                          UserAgents[ua].name + "</option>";
    }
    uaList.firstChild.nextSibling.setAttribute("selected", "selected");

    uaList.addEventListener("change",
      function(event) {
        let ua = event.target.value;
        if (ua in UserAgents) {
          Debugger.setPref("general.useragent.override", UserAgents[ua].value);
        }
      }
    );

    document.getElementById("custom-ua-button").addEventListener("click",
      function(event) {
        let ua = document.getElementById("custom-ua").value.trim();
        if (ua.length) {
          Debugger.setPref("general.useragent.override", ua);
          uaList.selectedIndex = 0;
        }
      }
    );
  }
}