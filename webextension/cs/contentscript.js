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

function isTextNode(element) {
    return element.nodeType === 3;
}

function foundTextInNode(element, text) {
    return element.textContent.includes(text);
}

function findNodeContainText(element, searchText) {
    if (element.childNodes.length === 1 && foundTextInNode(element, searchText)) {
        if (isTextNode(element.firstChild)) {
            return element;
        }

        if (element.firstChild && element.firstChild.childNodes.length === 1) {
            return findNodeContainText(element.firstChild, searchText);
        }

        return element.firstChild;
    }
    for (let index = element.childNodes.length - 1; index >= 0; index--) {
        const elem = element.childNodes[index];
        if (!isTextNode(elem)) {
            const found = foundTextInNode(elem, searchText);
            if (found) {
                return elem;
            } else {
                const findInChild = findNodeContainText(elem, searchText);
                if (findInChild) {
                    return findInChild;
                }
            }
        }
    }
    return null;
}

function findTextNode(element, searchText) {
    for (let index = element.childNodes.length - 1; index >= 0; index--) {
        const elem = element.childNodes[index];
        if (foundTextInNode(elem, searchText)) {
            if (isTextNode(elem)) {
                return elem;
            } else {
                return findTextNode(elem, searchText);
            }
        }
    }
    return null;
}

function findTextNodePosition(textNode, offset) {
    let total = 0;
    let position = 0;
    let index = 0;
    for (index = 0; index < textNode.childNodes.length; index++) {
        let length = textNode.childNodes[index].textContent.length;
        total += length;

        if (total > offset) {
            position = Math.abs(total - length - offset);
            break;
        }
    }
    return { index, position };
}

function countBrTag(node) {
    let count = 0;

    if (node.innerHTML && node.innerHTML.includes('<br>')) {
        const totalBrTags = node.innerHTML.match(/<br>/g);
        if (totalBrTags && totalBrTags.length) {
            count = totalBrTags.length;
        }
    }
    return count;
}

function createSelection(field, start, end, searchText = '', correctionText = '') {
    if( field.createTextRange ) {
      var selRange = field.createTextRange();
      selRange.collapse(true);
      selRange.moveStart('character', start);
      selRange.moveEnd('character', end);
      selRange.select();
      field.focus();
    } else if( field.setSelectionRange ) {
      field.focus();
      field.setSelectionRange(start, end);
    } else if( typeof field.selectionStart != 'undefined' ) {
      field.selectionStart = start;
      field.selectionEnd = end;
      field.focus();
    } else {
        // select text for contentEditable
        const range = document.createRange();
        range.selectNodeContents(field);
        field.focus();
        let textNode = findNodeContainText(field, searchText);
        console.warn('textNode', textNode);
        if ( !textNode || (field && field.childNodes.length === 1 && isTextNode(field.firstChild))) {
            if (field.firstChild.textContent.length >= end) {
                range.setStart(field.firstChild, start);
                range.setEnd(field.firstChild, end);
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
                return true;
            } else {
                console.warn('not found');
                range.setStart(field.firstChild, start);

                if (isTextNode(field.lastChild)) {
                    range.setEnd(field.lastChild, field.lastChild.textContent.length);
                } else {
                    range.setEnd(field.lastChild.firstChild, field.lastChild.firstChild.textContent.length);
                }

                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
                const currentText = sel.toString();
                console.warn('selected text', currentText)
                $(field).sendkeys(currentText.replace(searchText, correctionText));
                return false;
            }
        }

        // find by position
        let offset = 0;
        const breakLine = 1; // \n 
        for (let i = 0; i < field.childNodes.length; i++) {
            let node = field.childNodes[i];
            let length = node.textContent.length + breakLine;
            if (textNode.textContent === node.textContent) {
                break;
            }
            if (isTextNode(node)) {
                offset += length;
                continue;
            }
            length += countBrTag(node) * 2;
            offset += length;
        }

        const { index: startNode, position: startPos } = findTextNodePosition(textNode, start - offset);
        const { index: endNode, position: endPos } = findTextNodePosition(textNode, end - offset);

        if (textNode.childNodes[startNode] && textNode.childNodes[startNode].textContent.includes(searchText)) {
            console.warn('startNode includes error text');
            console.log('startNode', textNode.childNodes[startNode], startPos);
            console.log('endNode', textNode.childNodes[endNode], endPos);
            let foundTextNode = textNode.childNodes[startNode];
            if (typeof foundTextNode === "object" && foundTextNode.firstChild) {
                foundTextNode = isTextNode(foundTextNode.firstChild) ? foundTextNode.firstChild : foundTextNode.lastChild;
            }
            if ((foundTextNode.textContent && searchText === foundTextNode.textContent.substr(startPos, searchText.length)) || (typeof foundTextNode === "string" && foundTextNode.substr(startPos, searchText.length))) {
                range.setStart(foundTextNode, startPos);
                range.setEnd(foundTextNode, startPos + searchText.length );
            } else {
                let pos = foundTextNode.textContent ? foundTextNode.textContent.indexOf(searchText) : foundTextNode.indexOf(searchText);
                range.setStart(foundTextNode, pos);
                range.setEnd(foundTextNode, pos + searchText.length );
            }
        }  else if (textNode.childNodes[endNode] && textNode.childNodes[endNode].textContent.includes(searchText)) {
            console.warn('endNode includes error text');
            console.log('startNode', textNode.childNodes[startNode], startPos);
            console.log('endNode', textNode.childNodes[endNode], endPos);
            let foundTextNode = textNode.childNodes[endNode];
            if (typeof foundTextNode === "object" && foundTextNode.firstChild) {
                foundTextNode = isTextNode(foundTextNode.firstChild) ? foundTextNode.firstChild : foundTextNode.lastChild;
            }
            if ((foundTextNode.textContent && searchText === foundTextNode.textContent.substr(endPos, searchText.length)) || (typeof foundTextNode === "string" && foundTextNode.substr(endPos, searchText.length))) {
                range.setStart(foundTextNode, endPos);
                range.setEnd(foundTextNode, endPos + searchText.length);
            } else {
                let pos = foundTextNode.textContent ? foundTextNode.textContent.indexOf(searchText) : foundTextNode.indexOf(searchText);
                range.setStart(foundTextNode, pos);
                range.setEnd(foundTextNode, pos + searchText.length);
            }
        } else {
            // edge case, select all text and replace
            console.warn('stardNode + endNode includes error text');
            range.setStart(textNode.childNodes[startNode], 0);
            range.setEnd(textNode.childNodes[endNode], endPos);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
            const currentText = sel.toString();
            console.warn('selected text', currentText)
            $(field).sendkeys(currentText.replace(searchText, correctionText));
            return false;
        }

        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }
    return true;
}

function applyByTypings({ element, errorOffset, errorText, replacement }) {
    try {
        let found = createSelection(element, errorOffset, errorOffset + errorText.length, errorText, replacement);
        if (found) {
            $(element).sendkeys(replacement);
        }
    } catch (error) {
      console.warn('found error', error);
    }
}

function applyCorrection(request) {
    // Note: this duplicates the logic from getTextOfActiveElement():
    const activeElem = activeElement();
    let found = true;
    const { errorOffset, errorText, replacement } = request;
    if (isSimpleInput(activeElem) || activeElem.hasAttribute("contenteditable")) {
        applyByTypings({ element: activeElem, errorOffset, errorText, replacement });
    } else if (activeElem.tagName === "IFRAME") {
        const activeElem2 = activeElementOnIframe();
        let newMarkupList;
        if (activeElem2) {
            try {
                newMarkupList = Markup.replace(request.markupList, request.errorOffset, request.errorText.length, request.replacement);
            } catch (e) {
                // e.g. when replacement fails because of complicated HTML
                alert(e.toString());
                Tools.track(request.pageUrl, "Exception in applyCorrection: " + e.message);
                return;
            }
            if (activeElem2.innerHTML) {
                found = replaceIn(activeElem2, "innerHTML", newMarkupList);  // e.g. on wordpress.com
            } else if (isSimpleInput(activeElem2)) {
                found = replaceIn(activeElem2, "value", newMarkupList);  // e.g. sending messages on upwork.com (https://www.upwork.com/e/.../contracts/v2/.../)
            } else {
                found = replaceIn(activeElem2, "textContent", newMarkupList);  // tinyMCE as used on languagetool.org
            }
        } else {
            found = false;
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
