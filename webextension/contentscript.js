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

let toolbarUI;
let lastUseDate = new Date().getTime();  // TODO: should actually be saved in prefs
let lastReminderDate = new Date().getTime();  // TODO: should actually be saved in prefs
let unusedMinutesShowReminder = 0.5;
    
function handleRequest(request, sender, callback) {
    if (request.action === 'checkText') {
        checkText(callback);
    } else if (request.action === 'getCurrentText') {
        callback(getCurrentText());
    } else if (request.action === 'applyCorrection') {
        applyCorrection(request);
        callback();
    } else if (request === 'toggle-in-page-toolbar') {
        if (toolbarUI) {
            toggleToolbar(toolbarUI);
        } else {
            toolbarUI = initToolbar();
        }
    } else {
        alert("Unknown action: " + request.action);
    }
}

function checkText(callback) {
    lastUseDate = new Date().getTime();
    let selection = window.getSelection();
    if (selection && selection.toString() !== "") {
        callback({markupList: [{text: selection.toString()}], isEditableText: false});
    } else {
        try {
            let markupList = getMarkupListOfActiveElement(document.activeElement);
            callback({markupList: markupList, isEditableText: true});
        } catch(e) {
            // Fallback e.g. for tinyMCE as used on languagetool.org - document.activeElement simple doesn't
            // seem to work if focus is inside the iframe.
            let iframes = document.getElementsByTagName("iframe");
            var found = false;
            for (var i = 0; i < iframes.length; i++) {
                try {
                    found = true;
                    let markupList = getMarkupListOfActiveElement(iframes[i].contentWindow.document.activeElement);
                    callback({markupList: markupList, isEditableText: true});
                } catch(e) {
                    // ignore - what else could we do here? We just iterate the frames until
                    // we find one with text in its activeElement
                }
            }
            if (!found) {
                callback({message: e.toString()});
            }
        }
    }
}

function getCurrentText() {
    return getMarkupListOfActiveElement(document.activeElement);
}

// Note: document.activeElement sometimes seems to be wrong, e.g. on languagetool.org
// it sometimes points to the language selection drop down even when the cursor
// is inside the text field - probably related to the iframe...
function getMarkupListOfActiveElement(elem) {
    if (isSimpleInput(elem)) {
        return [{ text: elem.value }];
    } else if (elem.hasAttribute("contenteditable")) {
        return Markup.html2markupList(elem.innerHTML, document);
    } else if (elem.tagName === "IFRAME") {
        let activeElem = elem.contentWindow.document.activeElement;
        if (activeElem.textContent) {
            return [{ text: activeElem.textContent.toString() }];
        } else {
            throw chrome.i18n.getMessage("placeCursor1")
        }
    } else {
        if (elem) {
            throw chrome.i18n.getMessage("placeCursor2", elem.tagName)
        } else {
            throw chrome.i18n.getMessage("placeCursor3")
        }
    }
}

function applyCorrection(request) {
    var newMarkupList;
    try {
        newMarkupList = Markup.replace(request.markupList, request.errorOffset, request.errorText.length, request.replacement);
    } catch (e) {
        // e.g. when replacement fails because of complicated HTML
        alert(e.toString());
        return;
    }
    // TODO: active element might have changed in between?!
    let activeElem = document.activeElement;
    // Note: this duplicates the logic from getTextOfActiveElement():
    var found = false;
    if (isSimpleInput(activeElem)) {
        found = replaceIn(activeElem, "value", newMarkupList);
    } else if (activeElem.hasAttribute("contenteditable")) {
        found = replaceIn(activeElem, "innerHTML", newMarkupList);  // contentEditable=true
    } else if (activeElem.tagName === "IFRAME") {
        let activeElem2 = activeElem.contentWindow.document.activeElement;
        found = replaceIn(activeElem2, "textContent", newMarkupList);  // tinyMCE as used on languagetool.org
    }
    if (!found) {
        alert(chrome.i18n.getMessage("noReplacementPossible"));
    }
}

function isSimpleInput(elem) {
    if (elem.tagName === "TEXTAREA") {
        return true;
    } else if (elem.tagName === "INPUT" && elem.type === "text") {
        return true;
    }
    return false;
}
    
function replaceIn(elem, elemValue, markupList) {
    if (elem && elem[elemValue]) {
        elem[elemValue] = Markup.markupList2html(markupList);
        return true;
    }
    return false;
}
