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
        checkText(callback, request);
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

function checkText(callback, request) {
    lastUseDate = new Date().getTime();
    if (document.activeElement.tagName === "IFRAME") {
        // this case happens e.g. in roundcube when selecting text in an email one is reading:
        if (document.activeElement
            && document.activeElement.contentWindow
            && document.activeElement.contentWindow.document.getSelection()
            && document.activeElement.contentWindow.document.getSelection().toString() !== "") {
            // TODO: actually the text might be editable, e.g. on wordpress.com:
            let text = document.activeElement.contentWindow.document.getSelection().toString();
            callback({markupList: [{text: text}], isEditableText: false, url: request.pageUrl});
            return;
        }
    }
    let selection = window.getSelection();
    if (selection && selection.toString() !== "") {
        // TODO: because of this, a selection in a textarea will not offer clickable suggestions:
        callback({markupList: [{text: selection.toString()}], isEditableText: false, url: request.pageUrl});
    } else {
        try {
            let markupList = getMarkupListOfActiveElement(document.activeElement);
            callback({markupList: markupList, isEditableText: true, url: request.pageUrl});
        } catch(e) {
            //console.log("LanguageTool extension got error (document.activeElement: " + document.activeElement + "), will try iframes:");
            //console.log(e);
            // Fallback e.g. for tinyMCE as used on languagetool.org - document.activeElement simply doesn't
            // seem to work if focus is inside the iframe.
            let iframes = document.getElementsByTagName("iframe");
            var found = false;
            for (var i = 0; i < iframes.length; i++) {
                try {
                    let markupList = getMarkupListOfActiveElement(iframes[i].contentWindow.document.activeElement);
                    found = true;
                    callback({markupList: markupList, isEditableText: true, url: request.pageUrl});
                } catch(e) {
                    // ignore - what else could we do here? We just iterate the frames until
                    // we find one with text in its activeElement
                    //console.log("LanguageTool extension got error (iframes " + i + "):");
                    //console.log(e);
                }
            }
            if (!found) {
                callback({message: e.toString()});
                Tools.logOnServer("Exception and failing fallback in checkText: " + e.toString() + " on " + request.pageUrl, request.serverUrl);
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
        if (activeElem.innerHTML) {
            return Markup.html2markupList(activeElem.innerHTML, document);
        } else if (activeElem.textContent) {
            // not sure if this case ever happens?
            return [{ text: activeElem.textContent.toString() }];
        } else {
            throw chrome.i18n.getMessage("placeCursor1");
        }
    } else {
        if (elem) {
            throw chrome.i18n.getMessage("placeCursor2", elem.tagName);
        } else {
            throw chrome.i18n.getMessage("placeCursor3");
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
        Tools.logOnServer("Exception in applyCorrection: " + e.toString() + " on " + request.pageUrl, request.serverUrl);
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
        if (activeElem2 && activeElem2.innerHTML) {
            found = replaceIn(activeElem2, "innerHTML", newMarkupList);  // e.g. on wordpress.com
        } else if (isSimpleInput(activeElem2)) {
            found = replaceIn(activeElem2, "value", newMarkupList);  // e.g. sending messages on upwork.com (https://www.upwork.com/e/.../contracts/v2/.../)
        } else {
            found = replaceIn(activeElem2, "textContent", newMarkupList);  // tinyMCE as used on languagetool.org
        }
    }
    if (!found) {
        alert(chrome.i18n.getMessage("noReplacementPossible"));
        Tools.logOnServer("Problem in applyCorrection: noReplacementPossible on " + request.pageUrl, request.serverUrl);
    }
}

function isSimpleInput(elem) {
    //console.log("elem.tagName: " + elem.tagName + ", elem.type: " + elem.type);
    if (elem.tagName === "TEXTAREA") {
        return true;
    } else if (elem.tagName === "INPUT" && (elem.type === "text" || elem.type == "search")) {
        return true;
    }
    return false;
}
    
function replaceIn(elem, elemValue, markupList) {
    if (elem && elem[elemValue]) {
        // Note for reviewer: elemValue can be 'innerHTML', but markupList always comes from
        // Markup.replace() (see applyCorrection()), which makes sure the replacement coming
        // from the server is sanitized:
        elem[elemValue] = Markup.markupList2html(markupList);
        return true;
    }
    return false;
}
