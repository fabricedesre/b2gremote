/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

(function() {
  let dir = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
  dir.initWithPath("$1");
  if (!dir.exists()) {
    return JSON.stringify({ error: "NoSuchPath" });
  }

  if (!dir.isDirectory()) {
    return JSON.stringify({ error: "NotDirectory" });
  }

  let iter = dir.directoryEntries;
  let res = [];
  while (iter.hasMoreElements()) {
    let file = iter.getNext().QueryInterface(Ci.nsIFile);
    res.push({
      name: file.leafName,
      size: file.fileSize,
      kind: file.isDirectory() ? "directory" : "file",
      time: file.lastModifiedTime
    });
  }

  return JSON.stringify(res);
})()