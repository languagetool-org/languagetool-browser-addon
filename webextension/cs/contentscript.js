/* LanguageTool WebExtension
 * Copyright (C) 2015-2017 Daniel Naber (http://www.danielnaber.de)
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
let initLanguage = "";
let manuallySelectedLanguage = "";

function handleRequest(request, sender, callback) {
    if (request.action === "turnOffAutoCheck") {
        autoCheckOnDomain = false;
    } else if (request.action === "reactivateIcon") {
        disableOnDomain = false;
    } else if (request.action === "closePopup") {
        closePopup();
    } else if (request.action === "showErrorNumberOnMarker") {
        showMatchedResultOnMarker(request.data);
    } else if (request.action === 'checkText') {
        checkText(callback, request);
    } else if (request.action === 'getCurrentText') {
        callback(getCurrentText());
    } else if (request.action === 'applyCorrection') {
        applyCorrection(request);
        callback();
    } else if (request.action === 'saveLanguagesSettings') {
        initLanguage = request.data.initLanguage;
        manuallySelectedLanguage = request.data.manuallySelectedLanguage;
    } else if (request.action === 'getLanguagesSettings') {
        callback({
            initLanguage: initLanguage,
            manuallySelectedLanguage: manuallySelectedLanguage
        });
    } else if (request === 'toggle-in-page-toolbar') {
        if (toolbarUI) {
            toggleToolbar(toolbarUI);
        } else {
            toolbarUI = initToolbar();
        }
    } else {
        alert(`Unknown action: ${request.action}`);
        Tools.track("internal", `Unknown action: ${request.action}`);
    }
}

function closePopup() {
  $.featherlight.close();
}

function checkText(callback, request) {
    lastUseDate = new Date().getTime();
    const metaData = getMetaData(request.pageUrl);
    if (document.activeElement.tagName === "IFRAME") {
        // this case happens e.g. in roundcube when selecting text in an email one is reading:
        try {
            if (document.activeElement
                && document.activeElement.contentWindow
                && document.activeElement.contentWindow.document.getSelection()
                && document.activeElement.contentWindow.document.getSelection().toString() !== "") {
                // TODO: actually the text might be editable, e.g. on wordpress.com:
                const text = document.activeElement.contentWindow.document.getSelection().toString();
                callback({markupList: [{text: text}], metaData: metaData, isEditableText: false, url: request.pageUrl});
                return;
            }
        } catch (err) {
            Tools.track(request.pageUrl, `error on checkText for iframe: ${err.message}`);
        }
    }
    const selection = window.getSelection();
    if (selection && selection.toString() !== "") {
        // TODO: because of this, a selection in a textarea will not offer clickable suggestions:
        callback({markupList: [{text: selection.toString()}], metaData: metaData, isEditableText: false, url: request.pageUrl});
    } else {
        try {
            if (activeElement()) {
                callback({markupList: getMarkupListOfActiveElement(activeElement()), metaData: metaData, isEditableText: true, url: request.pageUrl});
            }
            else {
                const markupList = getMarkupListOfActiveElement(document.activeElement);
                callback({markupList: markupList, metaData: metaData, isEditableText: true, url: request.pageUrl});
            }
        } catch(e) {
            //console.log("LanguageTool extension got error (document.activeElement: " + document.activeElement + "), will try iframes:");
            //console.log(e);
            // Fallback e.g. for tinyMCE as used on languagetool.org - document.activeElement simply doesn't
            // seem to work if focus is inside the iframe.
            Tools.track(request.pageUrl, `error on checkText - get selection: ${e.message}`);
            const iframes = document.getElementsByTagName("iframe");
            let found = false;
            for (let i = 0; i < iframes.length; i++) {
                try {
                    const markupList = getMarkupListOfActiveElement(iframes[i].contentWindow.document.activeElement);
                    found = true;
                    callback({markupList: markupList, metaData: metaData, isEditableText: true, url: request.pageUrl});
                } catch(e) {
                    // ignore - what else could we do here? We just iterate the frames until
                    // we find one with text in its activeElement
                    //console.log("LanguageTool extension got error (iframes " + i + "):");
                    //console.log(e);
                }
            }
            if (!found) {
                callback({message: e.toString()});
                Tools.track(request.pageUrl, "Exception and failing fallback in checkText: " + e.message);
            }
        }
    }
}

function cleanEMail(email) {
    // remove so we don't transfer data we don't need
    if (email) {
        return email.replace(/@[0-9a-zA-Z.-]+/, "@replaced.domain")
    } else {
        return email;
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
        const activeElem = elem.contentWindow.document.activeElement;
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
    let newMarkupList;
    try {
        newMarkupList = Markup.replace(request.markupList, request.errorOffset, request.errorText.length, request.replacement);
    } catch (e) {
        // e.g. when replacement fails because of complicated HTML
        alert(e.toString());
        Tools.track(request.pageUrl, "Exception in applyCorrection: " + e.message);
        return;
    }
    // TODO: active element might have changed in between?!
    const activeElem = activeElement();
    // Note: this duplicates the logic from getTextOfActiveElement():
    let found = false;
    if (isSimpleInput(activeElem)) {
        found = replaceIn(activeElem, "value", newMarkupList);
    } else if (activeElem.hasAttribute("contenteditable")) {
        found = replaceIn(activeElem, "innerHTML", newMarkupList);  // contentEditable=true
    } else if (activeElem.tagName === "IFRAME") {
      const activeElem2 = activeElem.contentWindow.document.activeElement;
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
        Tools.track(request.pageUrl, "Problem in applyCorrection: noReplacementPossible");
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
