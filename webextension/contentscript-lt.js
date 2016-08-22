/* LanguageTool for Chrome 
 * Copyright (C) 2015 Daniel Naber (http://www.danielnaber.de)
 * 
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301
 * USA
 */
"use strict";

/* We tell languagetool.org that we're already installed.
 * See https://developer.chrome.com/webstore/inline_installation
 */
var isInstalledNode = document.createElement('div');
isInstalledNode.id = 'extension-is-installed';
document.body.appendChild(isInstalledNode);

/* transfer usage count on uninstall - doesn't work as this page
   will only be called when the add-on has just been uninstalled...
if (window.location.href && window.location.href == 'https://languagetool.org/webextension/uninstall.php') {
    var storage = chrome.storage.sync ? chrome.storage.sync : chrome.storage.local;
    storage.get({
        usageCounter: 0
    }, function(items) {
        let usageCounterDiv = document.getElementById('usageCounter');
        if (usageCounterDiv) {
            usageCounterDiv.value = items.usageCounter;
        }
    });
}
*/