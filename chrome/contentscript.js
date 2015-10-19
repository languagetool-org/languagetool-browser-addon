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

chrome.runtime.onMessage.addListener(
    function(request, sender, callback) {
        if (request.action === 'checkText') {
            checkText(callback);
        } else if (request.action === 'applyCorrection') {
            applyCorrection(request);
        } else {
            console.log("Unknown action: " + request.action);
        }
    }
);

function checkText(callback) {
    let selection = window.getSelection();
    if (selection && selection.toString() !== "") {
        callback({text: selection.toString()});
    } else {
        if (document.activeElement.tagName === "TEXTAREA") {
            callback({text: document.activeElement.value});
        } else if (document.activeElement.hasAttribute("contenteditable")) {
            callback({text: document.activeElement.textContent});
        } else {
            callback({message: "Please place the cursor in an editable field or select text."});
        }
    }
}

function applyCorrection(request) {
    let searchText = request.contextLeft + request.errorText + request.contextRight;
    // TODO: active element might have changed in between:
    if (document.activeElement.value.indexOf(searchText) !== -1) {
        let replaceText = request.contextLeft + request.replacement + request.contextRight;
        document.activeElement.value = document.activeElement.value.replace(searchText, replaceText);    
    } else {
        alert("Sorry, LanguageTool extension could not find error context in text:\n" + searchText);
    }
}
