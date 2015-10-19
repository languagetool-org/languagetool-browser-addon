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
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        var selection = window.getSelection();
        if (selection && selection.toString() !== "") {
            sendResponse({text: selection.toString()});
        } else {
            if (document.activeElement.tagName === "TEXTAREA") {
                sendResponse({text: document.activeElement.value});
            } else if (document.activeElement.hasAttribute("contenteditable")) {
                sendResponse({text: document.activeElement.textContent});
            } else {
                sendResponse({message: "Please place the cursor in an editable field or select text."});
            }
        }
    }
);
