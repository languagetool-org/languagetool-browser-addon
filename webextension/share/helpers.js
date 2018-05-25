/* LanguageTool WebExtension
 * Copyright (C) 2016 Daniel Naber (http://www.danielnaber.de)
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
let activeTextarea;
let iframeActiveElement;

function activeElement() {
  return activeTextarea;
}

function setActiveElement(el) {
  activeTextarea = el;
  if (el.tagName === "IFRAME" && isEditorElement(el.contentWindow.document.activeElement)) {
    iframeActiveElement = el.contentWindow.document.activeElement;
  }
}

function activeElementOnIframe() {
    return iframeActiveElement;
}

/**
 * Check the element is display or hidden
 * @param {DOMElement} el
 * @return {bool}
 */
function isHiddenElement(el) {
  const style = window.getComputedStyle(el);
  return el.offsetParent === null || style.display === "none";
}

/**
 * check element is on viewport or not
 * @param {DOMElement} el
 */
function isShowOnViewPort(el) {
  const bounds = el.getBoundingClientRect();
  return bounds.top < window.innerHeight && bounds.bottom > 0;
}

/**
 * Check the element is parent node
 * @param {DOMElement} parent
 * @param {DOMElement} child
 * @return boolean
 */
function isDescendant(parent, child) {
  if(child && parent) {
    let node = child.parentNode;
    while (node !== null) {
      if (node === parent) {
        return true;
      }
      node = node.parentNode;
    }
  }
  return false;
}

/**
 * Find the position of element base on window
 * @param {DOMElement} el
 * @return {object} position { top, left }
 */
function offset(el) {
  const rect = el.getBoundingClientRect();
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  return { top: rect.top + scrollTop, left: rect.left + scrollLeft };
}

/**
 * Check textarea or editor is allow spellcheck
 * @param {DOMElement} element
 */
function isAllowSpellcheck(element) {
  return (
    element.getAttribute("spellcheck") === null ||
    element.getAttribute("spellcheck") === "true"
  );
}

/**
 * True if that is textarea or html5 contentEditable element
 * @param {DOMElement} el
 * @return {bool}
 */
function isEditorElement(el) {
  return (
    el &&
    isAllowSpellcheck(el) &&
    (el.tagName === "TEXTAREA" ||
      el.contentEditable !== "inherit" ||
      (el.tagName === "IFRAME" &&
        (el.className.indexOf("cke_wysiwyg_frame") !== -1 ||
         el.name.indexOf("editor") !== -1 ||
         el.id.indexOf("editor") !== -1 ||
         el.id.indexOf("tinymce") !== -1 ||
         el.id.indexOf("content_ifr") !== -1 ||
         (el.title && el.title.indexOf("Rich Text Area") !== -1))))
  );
}

function suggestionClass(match) {
    if (isSpellingError(match)) {
        return 'hiddenSpellError';
    } else if (isSuggestion(match)) {
        return 'hiddenSuggestion';
    } else {
        return 'hiddenGrammarError';
    }
}

function isSpellingError(match) {
    const ruleId = match.rule.id;
    return ruleId.indexOf("SPELLER_RULE") >= 0 ||
           ruleId.indexOf("MORFOLOGIK_RULE") >= 0 ||
           ruleId.indexOf("HUNSPELL") >= 0
}

function isSuggestion(match) {
    const issueType = match.rule.issueType;
    return issueType === 'style' ||
           issueType === 'locale-violation' ||
           issueType === 'register'
}

function getShortCode(languageCode) {
    return languageCode.replace(/-.*/, "");
}

function isSameObject(prevObject, nextObject) {
  return JSON.stringify(nextObject) === JSON.stringify(prevObject);
}

function getMetaData(pageUrl) {
    const metaData = {};
    if (document.getElementById("_to") && document.getElementById("compose-subject")) {   // Roundcube (tested only with 1.0.1)
        metaData['EmailToAddress'] = cleanEMail(document.getElementById("_to").value);
    }
    if (pageUrl.indexOf("://mail.google.com")) {  // GMail
        const elems = document.getElementsByName("to");
        for (let obj of elems) {
            if (obj.nodeName === 'INPUT') {
                metaData['EmailToAddress'] = cleanEMail(obj.value);
                break;
            }
        }
    }
    return metaData;
}
