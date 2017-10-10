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
let quotedLinesIgnored = false;

function activeElement() {
  return activeTextarea;
}

function setActiveElement(el) {
  activeTextarea = el;
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
 * @param {DOMElement} focusElement
 * @return {bool}
 */
function isEditorElement(focusElement) {
  return (
    focusElement &&
    isAllowSpellcheck(focusElement) &&
    (focusElement.tagName === "TEXTAREA" ||
      focusElement.contentEditable !== "inherit" ||
      (focusElement.tagName === "IFRAME" &&
        (focusElement.className.indexOf("cke_wysiwyg_frame") !== -1 ||
          focusElement.title.indexOf("Rich Text Area") !== -1)))
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

function getCheckResult(markupList, metaData, callback, errorCallback) {
    console.warn('getCheckResult', markupList, metaData);
    Tools.getApiServerUrl(serverUrl => {
      let text = Markup.markupList2text(markupList);
      if (ignoreQuotedLines) {
          const textOrig = text;
          // A hack so the following replacements don't happen on messed up character positions.
          // See https://github.com/languagetool-org/languagetool-browser-addon/issues/25:
          text = text.replace(/^>.*?\n/gm, function(match) {
              return " ".repeat(match.length - 1) + "\n";
          });
          quotedLinesIgnored = text != textOrig;
      }
      if (text.trim().length === 0) {
        return callback('{}');
      }
      const req = new XMLHttpRequest();
      req.timeout = 60 * 1000; // milliseconds
      const url = serverUrl + (serverUrl.endsWith("/") ? "check" : "/check");
      console.warn('url', url);
      req.open('POST', url);
      req.onload = function() {
          let response = req.response;
          if (!response) {
              errorCallback(chrome.i18n.getMessage("noResponseFromServer", serverUrl), "noResponseFromServer");
              return;
          }
          if (req.status !== 200) {
              errorCallback(chrome.i18n.getMessage("noValidResponseFromServer", [serverUrl, req.response, req.status]), "noValidResponseFromServer");
              return;
          }
          console.warn('response', response);
          callback(response);
      };
      req.onerror = function(evt) {
          console.warn('error', evt);
          errorCallback(chrome.i18n.getMessage("networkError", serverUrl), "networkError");
      };
      req.ontimeout = function() {
          errorCallback(chrome.i18n.getMessage("timeoutError", serverUrl), "timeoutError");
      };
      let userAgent = "webextension";
      if (Tools.isFirefox()) {
          userAgent += "-firefox";
      } else if (Tools.isChrome()) {
          userAgent += "-chrome";
      } else {
          userAgent += "-unknown";
      }
      let params = 'disabledRules=WHITESPACE_RULE' +   // needed because we might replace quoted text by spaces (see issue #25) 
          '&useragent=' + userAgent;
      Tools.getStorage().get({
          havePremiumAccount: false,
          username: "",
          password: "",
          motherTongue: false,
          enVariant: "en-US",
          deVariant: "de-DE",
          ptVariant: "pt-PT",
          caVariant: "ca-ES",
      }, function(items) {
          const { motherTongue, havePremiumAccount, username, password, enVariant, deVariant, ptVariant, caVariant } = items;
          //console.log("metaData", metaData);
          //console.log("havePremiumAccount", items.havePremiumAccount);
          if (havePremiumAccount) {  // requires LT 3.9 or later
              const json = {text: text, metaData: metaData};
              params += '&data=' + encodeURIComponent(JSON.stringify(json));
          } else {
              params += '&text=' + encodeURIComponent(text);
          }
          if (motherTongue) {
              params += "&motherTongue=" + motherTongue;
          }
          if (typeof manuallySelectedLanguage !== 'undefined' && manuallySelectedLanguage) {
              params += "&language=" + manuallySelectedLanguage;
              manuallySelectedLanguage = "";
          } else {
              params += "&language=auto";
              let preferredVariants = [];
              if (enVariant) {
                  preferredVariants.push(enVariant);
              }
              if (deVariant) {
                  preferredVariants.push(deVariant);
              }
              if (ptVariant) {
                  preferredVariants.push(ptVariant);
              }
              if (caVariant) {
                  preferredVariants.push(caVariant);
              }
              if (preferredVariants.length > 0) {
                  params += "&preferredVariants=" + preferredVariants;
              }
          }
          if (havePremiumAccount) {
              params += "&username=" + encodeURIComponent(username) +
                      "&password=" + encodeURIComponent(password);
            req.send(params);
        } else {
            req.send(params);
        }
    });
  });
}

/** Automatically handle errors, only works for popup **/
window.addEventListener('error', function(evt) {
	const { error } = evt;
	if (error) {
    Tools.track("unknown", `error message: ${error.message}`, error.stack);
	}
});