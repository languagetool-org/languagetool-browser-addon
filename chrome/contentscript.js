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

chrome.runtime.onMessage.addListener(handleRequest);

function handleRequest(request, sender, callback) {
    if (request.action === 'checkText') {
        checkText(callback);
    } else if (request.action === 'getCurrentText') {
        callback(getCurrentText());
    } else if (request.action === 'applyCorrection') {
        applyCorrection(request);
        callback();
    } else {
        alert("Unknown action: " + request.action);
    }
}

function checkText(callback) {
    let selection = window.getSelection();
    if (selection && selection.toString() !== "") {
        callback({text: selection.toString()});
    } else {
        try {
            let text = getTextOfActiveElement(document.activeElement);
            callback({text: text});
        } catch(e) {
            // Fallback e.g. for tinyMCE as used on languagetool.org - document.activeElement simple doesn't
            // seem to work if focus is inside the iframe.
            let iframes = document.getElementsByTagName("iframe");
            var found = false;
            for (var i = 0; i < iframes.length; i++) {
                try {
                    found = true;
                    let text = getTextOfActiveElement(iframes[i].contentWindow.document.activeElement);
                    callback({text: text});
                } catch(e) {
                    // ignore - what else could we do here? We just iterate the frames until
                    // we find one with text in its activeElement
                }
            }
            if (!found) {
                callback({message: e});
            }
        }
    }
}

function getCurrentText() {
    return getTextOfActiveElement(document.activeElement);
}

function getTextOfActiveElement(elem) {
    if (elem.tagName === "TEXTAREA") {
        return elem.value;
    } else if (elem.hasAttribute("contenteditable")) {
        return elem.textContent;
    } else if (elem.tagName === "IFRAME") {
        let activeElem = elem.contentWindow.document.activeElement;
        if (activeElem.textContent) {
            return activeElem.textContent.toString();
        } else {
            throw "Please place the cursor in an editable field or select text (no active element in iframe found)."
        }
    } else {
        if (elem) {
            throw "Please place the cursor in an editable field or select text (active element: " + elem.tagName + ")."
        } else {
            throw "Please place the cursor in an editable field or select text (no active element found)."
        }
    }
}

function applyCorrection(request) {
    let searchText = request.contextLeft + request.errorText + request.contextRight;
    let replaceText = request.contextLeft + request.replacement + request.contextRight;
    // TODO: active element might have changed in between:
    if (document.activeElement.value && document.activeElement.value.indexOf(searchText) !== -1) {
        document.activeElement.value = document.activeElement.value.replace(searchText, replaceText);
    } else if (document.activeElement.textContent && document.activeElement.textContent.indexOf(searchText) !== -1) {  // contentEditable=true
        document.activeElement.textContent = document.activeElement.textContent.replace(searchText, replaceText);
    } else {
        alert("Sorry, LanguageTool extension could not find error context in text:\n" + searchText);
    }
}
