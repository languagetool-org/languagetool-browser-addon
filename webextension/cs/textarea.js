/* LanguageTool WebExtension
 * Copyright (C) 2017 Daniel Naber (http://www.danielnaber.de)
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

/* global activeElement, setActiveElement */

const REMIND_WRAPPER_CLASS = "lt-marker-container";
const POPUP_CONTENT_CLASS = "ltaddon-popup-content";
const BTN_CLASS = "lt-buttons";
const REMIND_BTN_CLASS = "lt-remind-btn";
const CHECK_DONE_BTN_CLASS = "lt-check-done-btn";
const LOADING_BTN_CLASS = "lt-check-loading-btn";
const ERROR_BTN_CLASS = "lt-error-btn";
const DISABLE_BTN_CLASS = "lt-disable-btn";
const AUTO_CHECK_BTN_CLASS = "lt-auto-check-btn";
const AUTO_CHECK_OFF_BTN_CLASS = "lt-auto-check-off-btn";
const AUTO_CHECK_MANUAL_BTN_CLASS = "lt-auto-check-manual-btn";
const MARGIN_TO_CORNER = 8;
const REMIND_BTN_SIZE = 16;
const CLEAN_TIMEOUT_MILLIS = 200;
const BG_CHECK_TIMEOUT_MILLIS = 1500;

const DOMAIN_SETTINGS = {
  "twitter.com": {left: -22}
};

let wrapperId = 0;
let disableOnDomain = false;
let autoCheckOnDomain = false;
let ignoreQuotedLines = true;
let autoCheck = false;
let ignoreCheckOnDomains = [];
let totalErrorOnCheckText = -1; // -1 = not checking yet
let lastCheckResult = { markupList: [], result: {}, total: -1, isProcess: false, success: true };

const activeElementHandler = ally.event.activeElement();
const port = chrome.runtime.connect({name: "LanguageTool"});

function isGmail() {
  const currentUrl = window.location.href;
  const { hostname } = new URL(currentUrl);
  return hostname === "mail.google.com";
}

function cleanErrorMessage(msg) {
  const position = msg.lastIndexOf('Error:');
  if (position !== -1) {
    return msg.substr(position + 7);
  }
  return msg;
}

function isAutoCheckEnable() {
  const currentUrl = window.location.href;
  const { hostname } = new URL(currentUrl);
  return autoCheckOnDomain || (autoCheck && !ignoreCheckOnDomains.includes(hostname));
}

/** event handlers */

function checkErrorMenu(evt) {
  evt.stopPropagation();
  evt.preventDefault();
  const currentUrl = window.location.href;
  const textAreaElement = activeElement();
  if (textAreaElement) {
    if (textAreaElement.setActive) {
      textAreaElement.setActive();
    } else {
      textAreaElement.focus();
    }
  }
  const popupWidth = 450;
  const popupHeight = Math.min(window.innerHeight * 80 / 100, 600);
  $.featherlight.defaults.closeIcon = "&nbsp;";
  $.featherlight({
    iframe: `${chrome.runtime.getURL("popup.html")}?pageUrl=${currentUrl}`,
    iframeWidth: popupWidth,
    iframeHeight: popupHeight,
    namespace: "ltaddon-popup",
    beforeOpen: () => {
      const popupContainers = document.getElementsByClassName(POPUP_CONTENT_CLASS);
      for (let counter = 0; counter < popupContainers.length; counter++) {
        const popupContainer = popupContainers[counter];
        popupContainer.style.minWidth = `${popupWidth}px`;
        popupContainer.style.minHeight = `${popupHeight}px`;
      }
    },
    afterOpen: () => {
      const currentPopup = $.featherlight.current();
      currentPopup.$content.focus();
    }
  });
}

function removeAllButtons() {
  const btns = document.getElementsByClassName(REMIND_WRAPPER_CLASS);
  for (let counter = 0; counter < btns.length; counter++) {
    const btn = btns[counter];
    btn.parentNode.removeChild(btn);
  }
}

function disableMenu(evt) {
  evt.preventDefault();
  disableOnDomain = true;
  removeAllButtons();
  Tools.getStorage().get(
    {
      disabledDomains: []
    },
    items => {
      const currentUrl = window.location.href;
      const { hostname } = new URL(currentUrl);
      items.disabledDomains.push(hostname);
      Tools.getStorage().set({
        disabledDomains: Array.from(new Set(items.disabledDomains))
      });
      Tools.track(hostname, "reminder deactivated");
    }
  );
}

function manualAutoCheck(evt) {
  evt.preventDefault();
  lastCheckResult = Object.assign({},lastCheckResult, { markupList: [], result: {}, total: -1, isProcess: false, success: true });
  const currentUrl = window.location.href;
  const { hostname } = new URL(currentUrl);
  Tools.getStorage().get(
    {
      ignoreCheckOnDomains: ignoreCheckOnDomains
    },
    items => {
      if (!items.ignoreCheckOnDomains.includes(hostname)) {
        items.ignoreCheckOnDomains.push(hostname);
        ignoreCheckOnDomains = Array.from(new Set(items.ignoreCheckOnDomains));
        Tools.getStorage().set({
          ignoreCheckOnDomains
        });
      } else {
        ignoreCheckOnDomains = items.ignoreCheckOnDomains.filter(item => item !== hostname);
        Tools.getStorage().set({
          ignoreCheckOnDomains
        });
      }
      const textAreaElement = activeElement();
      if (textAreaElement) {
        if (textAreaElement.setActive) {
          textAreaElement.setActive();
        } else {
          textAreaElement.focus();
        }
        positionMarkerOnChangeSize();
      }
  });
}

function autoCheckMenu(evt) {
  evt.preventDefault();
  autoCheckOnDomain = !autoCheckOnDomain;
  if (!autoCheckOnDomain) {
    lastCheckResult = Object.assign({},lastCheckResult, { markupList: [], result: {}, total: -1, isProcess: false, success: true });
  }
  const textAreaElement = activeElement();
  if (textAreaElement) {
    if (textAreaElement.setActive) {
      textAreaElement.setActive();
    } else {
      textAreaElement.focus();
    }

    if (autoCheckOnDomain) {
      const { markupList, metaData } = getMarkupListFromElement(textAreaElement);
      checkTextFromMarkup({ markupList, metaData }).then(result => {
        if (result) {
          showMatchedResultOnMarker(result);
        }
      }).catch(error => {
        console.error(error);
        Tools.track(window.location.href, "auto-check error", error.message);
      });
    } else {
      positionMarkerOnChangeSize();
    }
  }

  Tools.getStorage().get(
    {
      autoCheckOnDomains: []
    },
    items => {
      const currentUrl = window.location.href;
      const { hostname } = new URL(currentUrl);
      if (autoCheckOnDomain) {
        items.autoCheckOnDomains.push(hostname);
        Tools.getStorage().set({
          autoCheckOnDomains: Array.from(new Set(items.autoCheckOnDomains))
        });
      } else {
        Tools.getStorage().set({
          autoCheckOnDomains: items.autoCheckOnDomains.filter(item => item !== hostname)
        });
      }

      if (autoCheckOnDomain) {
        Tools.track(hostname, "auto-check activated");
      } else {
        Tools.track(hostname, "auto-check deactivated");
      }
    }
  );
}

/** DOM manipulate */

function styleRemindButton(btn, position, num) {
  const { top, left, offsetHeight, offsetWidth } = position;
  btn.style.position = "absolute";
  if (isGmail()) {
    const tables = document.querySelectorAll("table#undefined");
    const activeTable = Array.prototype.find.call(tables, table =>
      isDescendant(table, document.activeElement)
    );
    // find parent of active table
    const allTables = document.getElementsByTagName("table");
    const gmailComposeToolbarHeight = 155;
    for (let counter = allTables.length - 1; counter > 0; counter--) {
      const parentTable = allTables[counter];
      if (isDescendant(parentTable, activeTable)) {
        let topPosition = offset(parentTable).top;
        if (topPosition < gmailComposeToolbarHeight) {
          topPosition = gmailComposeToolbarHeight;
        }
        btn.style.top = `${topPosition}px`;
        break;
      }
    }
  } else {
    btn.style.top = `${top + offsetHeight - REMIND_BTN_SIZE - MARGIN_TO_CORNER}px`;
  }
  const { hostname } = new URL(window.location.href);
  const leftTmp = DOMAIN_SETTINGS[hostname] ? left + DOMAIN_SETTINGS[hostname].left : left;
  btn.style.left = `${leftTmp + offsetWidth - (REMIND_BTN_SIZE + MARGIN_TO_CORNER)*num}px`;
}

function remindLanguageToolButton(clickHandler, position, num) {
  const btn = document.createElement(BTN_CLASS, { is: "a" });
  if (isAutoCheckEnable()) {
     if (!lastCheckResult.isTyping && lastCheckResult.isProcess) { // show loading on calling check api
      btn.className = `${BTN_CLASS} ${LOADING_BTN_CLASS}`;
      btn.setAttribute("tooltip", chrome.i18n.getMessage("reminderIconTitle"));
      btn.innerHTML = `<div class="lt-sk-three-bounce"><div class="lt-sk-child lt-sk-bounce1"></div><div class="lt-sk-child lt-sk-bounce2"></div><div class="lt-sk-child lt-sk-bounce3"></div></div>`;
     } else {
      if (lastCheckResult.success) {
        if (totalErrorOnCheckText > 0) {
          btn.className = `${BTN_CLASS} ${ERROR_BTN_CLASS}`;
          const tooltip = totalErrorOnCheckText === 1 ? chrome.i18n.getMessage("foundAErrorOnCheckText",[totalErrorOnCheckText]) : chrome.i18n.getMessage("foundErrorsOnCheckText",[totalErrorOnCheckText]);
          btn.setAttribute("tooltip", tooltip);
          btn.innerText = totalErrorOnCheckText > 9 ? "9+" : totalErrorOnCheckText;
        } else if (totalErrorOnCheckText === 0) {
          btn.className = `${BTN_CLASS} ${CHECK_DONE_BTN_CLASS}`;
          btn.setAttribute("tooltip", chrome.i18n.getMessage("noErrorsFound"));
        } else {
          btn.className = `${BTN_CLASS} ${REMIND_BTN_CLASS}`;
          btn.setAttribute("tooltip", chrome.i18n.getMessage("reminderIconTitle"));
        }
      } else {
        assignErrorStyle(btn, cleanErrorMessage(lastCheckResult.errorMessage));
      }
     }
  } else {
    btn.className = `${BTN_CLASS} ${REMIND_BTN_CLASS}`;
    btn.setAttribute("tooltip", chrome.i18n.getMessage("reminderIconTitle"));
  }

  btn.onclick = clickHandler;
  btn.onmouseover = function() {
    if (chrome.i18n.getMessage("reminderIconTitle") === undefined) {
      // this happens after first installation and after add-on update
      assignErrorStyle(btn, "Page reload needed to make text checking work");
    }
  };
  styleRemindButton(btn, position, num);
  return btn;
}

function assignErrorStyle(btn, msg) {
  btn.className = `${BTN_CLASS} ${ERROR_BTN_CLASS}`;
  btn.setAttribute("tooltip", msg);
  btn.innerText = "E";
}

function disableLanguageToolButton(clickHandler, position, num) {
  const { top, left, offsetHeight, offsetWidth } = position;
  const btn = document.createElement(BTN_CLASS, { is: "a" });
  btn.onclick = clickHandler;
  btn.className = `${BTN_CLASS} ${DISABLE_BTN_CLASS}`;
  btn.setAttribute(
    "tooltip",
    chrome.i18n.getMessage("disableForThisDomainTitle")
  );
  styleRemindButton(btn, position, num);
  return btn;
}

function autoCheckLanguageToolButton(clickHandler, position, num) {
  const { top, left, offsetHeight, offsetWidth } = position;
  const btn = document.createElement(BTN_CLASS, { is: "a" });
  btn.onclick = clickHandler;
  if (autoCheck) {
     const { hostname } = new URL(window.location.href);
     if (ignoreCheckOnDomains.includes(hostname)) {
        btn.className = `${BTN_CLASS} ${AUTO_CHECK_BTN_CLASS}`;
        btn.setAttribute(
            "tooltip",
            chrome.i18n.getMessage("autoCheckOnDesc")
          );
     } else {
        btn.className = `${BTN_CLASS} ${AUTO_CHECK_MANUAL_BTN_CLASS}`;
        btn.setAttribute(
          "tooltip",
          chrome.i18n.getMessage("autoCheckOffDesc")
        );
     }
  } else {
    if (!autoCheckOnDomain) {
      btn.className = `${BTN_CLASS} ${AUTO_CHECK_BTN_CLASS}`;
      btn.setAttribute(
        "tooltip",
        chrome.i18n.getMessage("autoCheckForThisDomainTitle")
      );
    } else {
      btn.className = `${BTN_CLASS} ${AUTO_CHECK_OFF_BTN_CLASS}`;
      btn.setAttribute(
        "tooltip",
        chrome.i18n.getMessage("autoCheckForOffThisDomainTitle")
      );
    }
  }
  styleRemindButton(btn, position, num);
  return btn;
}

function textAreaWrapper(textElement, btnElements) {
  const wrapper = document.createElement(REMIND_WRAPPER_CLASS, { is: 'div' });
  wrapper.className = REMIND_WRAPPER_CLASS;
  wrapper.id = wrapperId;
  wrapper.style.position = "absolute";
  wrapper.style.top = "0px";
  wrapper.style.left = "0px";
  wrapper.style.zIndex = "999999";
  btnElements.forEach(btnElement => {
    wrapper.appendChild(btnElement);
  });
  document.body.appendChild(wrapper);
}

function insertLanguageToolIcon(element) {
  const { offsetHeight, offsetWidth } = element;
  const { top } = element.getBoundingClientRect();
  const offsetHeightForLongText = window.innerHeight - top - 10;
  const position = Object.assign({}, offset(element), {
    offsetHeight: offsetHeight > window.innerHeight && offsetHeightForLongText < offsetHeight ? offsetHeightForLongText : offsetHeight,
    offsetWidth
  });
  wrapperId = `textarea-wrapper-${Date.now()}`;
  const maxToolTipWidth = 200;
  injectTooltipStyle(Math.min(offsetWidth, maxToolTipWidth));

  const btns = [
    remindLanguageToolButton(checkErrorMenu, position, 1),
  ];

  if (autoCheck) {
    btns.push(autoCheckLanguageToolButton(manualAutoCheck, position, 2));
  } else {
    btns.push(autoCheckLanguageToolButton(autoCheckMenu, position, 2));
  }
  btns.push(disableLanguageToolButton(disableMenu, position, 3));

  textAreaWrapper(element, btns);
}

/**
 * show marker on element
 * @param DOMElement focusElement
 */
function showMarkerOnEditor(focusElement) {
  if (isEditorElement(focusElement)) {
    removeAllButtons();
    setActiveElement(focusElement);
    if (!isHiddenElement(focusElement) && !disableOnDomain) {
      insertLanguageToolIcon(focusElement);
    }
  }
}

// detect on window resize, scroll
let ticking = false;
let lastScrollPosition = 0;
function positionMarkerOnChangeSize() {
  lastScrollPosition = window.scrollY;
  if (!ticking) {
    window.requestAnimationFrame(() => {
      removeAllButtons();
      if (!disableOnDomain && isShowOnViewPort(document.activeElement)) {
        showMarkerOnEditor(document.activeElement);
      }
      ticking = false;
    });
    ticking = true;
  }
}

function showMatchedResultOnMarker(result) {
  if (result && result.matches && result.matches.length > 0) {
    const language = DOMPurify.sanitize(result.language.name);
    const languageCode = DOMPurify.sanitize(result.language.code);
    const shortLanguageCode = getShortCode(languageCode);
    let matchesCount = 0;
    let matches = [];
    const uniquePositionMatches = [];
    let prevErrStart = -1;
    let prevErrLen = -1;
    for (let i = result.matches.length - 1; i >= 0; i--) {
      const m = result.matches[i];
      const errStart = parseInt(m.offset);
      const errLen = parseInt(m.length);
      if (errStart !== prevErrStart || errLen !== prevErrLen) {
        uniquePositionMatches.push(m);
        prevErrStart = errStart;
        prevErrLen = errLen;
      }
    }
    uniquePositionMatches.reverse();
    matches = uniquePositionMatches;
    const ignoredRuleCounts = {};
    const ruleIdToDesc = {};
    Tools.getUserSettingsForRender(
    items => {
      const { dictionary, ignoredRules, ignoreQuotedLines } = items;
      for (let m of matches) {
        // these values come from the server, make sure they are ints:
        const errStart = parseInt(m.context.offset);
        const errLen = parseInt(m.length);
        // these string values come from the server and need to be sanitized
        // as they will be inserted with innerHTML:
        const contextSanitized = DOMPurify.sanitize(m.context.text);
        const ruleIdSanitized = DOMPurify.sanitize(m.rule.id);
        const messageSanitized = DOMPurify.sanitize(m.message);
        ruleIdToDesc[ruleIdSanitized] = DOMPurify.sanitize(m.rule.description);
        const wordSanitized = contextSanitized.substr(errStart, errLen);
        let ignoreError = false;
        if (isSpellingError(m)) {
          // Also accept uppercase versions of lowercase words in personal dict:
          const knowToDict = dictionary.indexOf(wordSanitized) !== -1;
          if (knowToDict) {
            ignoreError = true;
          } else if (!knowToDict && Tools.startWithUppercase(wordSanitized)) {
            ignoreError = dictionary.indexOf(Tools.lowerCaseFirstChar(wordSanitized)) !== -1;
          }
        } else {
          ignoreError = ignoredRules.find(k => k.id === ruleIdSanitized && k.language === shortLanguageCode);
        }
        if (!ignoreError) {
          matchesCount++;
        }
      }
      totalErrorOnCheckText = matchesCount;
      lastCheckResult = Object.assign({}, lastCheckResult, { total: matchesCount });
      positionMarkerOnChangeSize();
    });
  } else {
    totalErrorOnCheckText = 0;
    lastCheckResult = Object.assign({}, lastCheckResult, { total: 0, result: {}, markupList: [] });
    positionMarkerOnChangeSize();
  }
}

function checkTextFromMarkup({ markupList, metaData }) {
  if (isSameObject(markupList,lastCheckResult.markupList)) {
    return Promise.resolve({ result: lastCheckResult.result });
  }
  lastCheckResult = Object.assign({}, lastCheckResult, { markupList, isProcess: true, isTyping: false });
  positionMarkerOnChangeSize();
  if (!isAutoCheckEnable()) {
    return Promise.resolve({ result: {} });
  }
  port.postMessage({
      action: "checkText",
      data: { markupList, metaData }
  });
  return new Promise((resolve) => {
    port.onMessage.addListener((msg) => {
      if (msg.success) {
        if (!isSameObject(markupList,lastCheckResult.markupList)) {
          totalErrorOnCheckText = -1;
          lastCheckResult = Object.assign({}, lastCheckResult, { result: {}, total: -1, isProcess: false  });
          return resolve({ result: {}, total: -1 });
        }
        lastCheckResult = Object.assign({}, lastCheckResult, msg, { isProcess: false });
        return resolve(msg.result);
      } else {
        const { errorMessage } = msg;
        lastCheckResult = Object.assign({}, lastCheckResult, msg, { result: {}, total: -1, isProcess: false });
        Tools.track(window.location.href, `error on checkTextFromMarkup: ${errorMessage}`);
        return resolve({});
      }
    });
  });
}

function getMarkupListFromElement(element) {
  const pageUrl = window.location.href;
  if (element.tagName === "IFRAME") {
    try {
      if (element
        && element.contentWindow
        && element.contentWindow.document.getSelection()
        && element.contentWindow.document.getSelection().toString() !== "") {
        const text = element.contentWindow.document.getSelection().toString();
        return ({markupList: [{text}], isEditableText: false, metaData: getMetaData(pageUrl)});
      }
    } catch (err) {
      console.error(err);
      Tools.track(pageUrl, `error on getMarkupListFromElement for iframe: ${err.message}`);
    }
  }
  const markupList = getMarkupListOfActiveElement(element);
  return ({markupList, isEditableText: true, metaData: getMetaData(pageUrl)});
}

function elementMarkup(evt) {
  totalErrorOnCheckText = -1;
  lastCheckResult = Object.assign({}, lastCheckResult, { result: {}, markupList: [], total: -1, isProcess: false, isTyping: true });
  return getMarkupListFromElement(evt.target);
}

function observeEditorElement(element) {
  /* global most */
  const { fromEvent, fromPromise, merge } = most;
  // Logs the current value of the searchInput, only after the user stops typing
  let inputText;
  if (element.tagName === 'IFRAME') {
    inputText = fromEvent('input', element.contentWindow).map(elementMarkup).skipRepeatsWith(isSameObject).multicast();
  } else {
    inputText = fromEvent('input', element).map(elementMarkup).skipRepeatsWith(isSameObject).multicast();
  }
  // Empty results list if there is no text
  const emptyResults = inputText.filter(markup => markup.markupList && markup.markupList[0] && markup.markupList[0].text && markup.markupList[0].text.length < 1).constant([]);
  const results = inputText.filter(markup => markup.markupList && markup.markupList[0] && markup.markupList[0].text && markup.markupList[0].text.length > 1)
    .debounce(BG_CHECK_TIMEOUT_MILLIS)
    .map(checkTextFromMarkup)
    .map(fromPromise)
    .switchLatest();
  merge(results, emptyResults).observe(showMatchedResultOnMarker);
}

function bindCheckErrorEventOnElement(currentElement) {
  if (isAutoCheckEnable() && isEditorElement(currentElement)) {
    totalErrorOnCheckText = -1;
    if (!lastCheckResult.isProcess) {
      const { markupList, metaData } = getMarkupListFromElement(currentElement);
      if (!isSameObject(markupList, lastCheckResult.markupList)) {
        checkTextFromMarkup({ markupList, metaData }).then(result => {
          if (result) {
            showMatchedResultOnMarker(result);
          }
        }).catch(error => {
          console.error(error);
          Tools.track(window.location.href, "auto-check error", error.message);
        });
      } else {
        showMatchedResultOnMarker(lastCheckResult.result);
      }
    }

    if (!currentElement.getAttribute("lt-auto-check")) {
        observeEditorElement(currentElement);
        currentElement.setAttribute("lt-auto-check", true);
    }

    // edge case for mail.google.com
    if (isGmail() && document.getElementById(":4")) {
      // scroll element
      const scrollContainerOnGmail = document.getElementById(":4");
      if (!scrollContainerOnGmail.getAttribute("lt-bind-scroll")) {
        scrollContainerOnGmail.addEventListener(
          "scroll",
          positionMarkerOnChangeSize
        );
        scrollContainerOnGmail.setAttribute("lt-bind-scroll", true);
      }
    }
  }
}

function allowToShowMarker(callback) {
  const currentUrl = window.location.href;
  disableOnDomain = Tools.doNotShowMarkerOnUrl(currentUrl);
  if (!disableOnDomain) {
    Tools.getStorage().get(
      {
        disabledDomains: [],
        autoCheckOnDomains: [],
        ignoreCheckOnDomains: [],
        ignoreQuotedLines: true,
        autoCheck: autoCheck,
      },
      items => {
        const { hostname } = new URL(currentUrl);
        autoCheckOnDomain = items.autoCheckOnDomains.includes(hostname);
        disableOnDomain = items.disabledDomains.includes(hostname);
        ignoreQuotedLines = items.ignoreQuotedLines;
        autoCheck = items.autoCheck;
        ignoreCheckOnDomains = items.ignoreCheckOnDomains;
        if (disableOnDomain) {
          removeAllButtons();
        } else {
          callback();
        }
      }
    );
  } else {
    removeAllButtons();
    activeElementHandler.disengage();
  }
}

window.addEventListener("resize", positionMarkerOnChangeSize);
window.addEventListener("scroll", positionMarkerOnChangeSize);

function injectLoadingStyle() {
  const style = document.createElement('style');
  style.type = 'text/css';
  style.innerHTML = `
    /* loading */
    .lt-sk-three-bounce {
      margin: 2px auto;
      width: 100%;
      text-align: center; }
      .lt-sk-three-bounce .lt-sk-child {
        width: 5px;
        height: 5px;
        background-color: #333;
        border-radius: 100%;
        display: inline-block;
        -webkit-animation: lt-sk-three-bounce 1.4s ease-in-out 0s infinite both;
                animation: lt-sk-three-bounce 1.4s ease-in-out 0s infinite both; }
      .lt-sk-three-bounce .lt-sk-bounce1 {
        -webkit-animation-delay: -0.32s;
                animation-delay: -0.32s; }
      .lt-sk-three-bounce .lt-sk-bounce2 {
        -webkit-animation-delay: -0.16s;
                animation-delay: -0.16s; }

    @-webkit-keyframes lt-sk-three-bounce {
      0%, 80%, 100% {
        -webkit-transform: scale(0);
                transform: scale(0); }
      40% {
        -webkit-transform: scale(1);
                transform: scale(1); } }

    @keyframes lt-sk-three-bounce {
      0%, 80%, 100% {
        -webkit-transform: scale(0);
                transform: scale(0); }
      40% {
        -webkit-transform: scale(1);
                transform: scale(1); } }
  `;
  document.body.appendChild(style);
}

function injectTooltipStyle(width = 100) {
  const style = document.createElement('style');
  style.type = 'text/css';
  if (width < 100) {
    style.innerHTML = `
      #${wrapperId} .lt-buttons[tooltip]:before {
        min-width: ${width}px;
        bottom: 100%;
        left: 5%;
      }
    `;
  } else {
    style.innerHTML = `
      #${wrapperId} .lt-buttons[tooltip]:before {
        min-width: ${width}px;
      }
    `;
  }
  document.body.appendChild(style);
}

if (
  document.readyState === "complete" ||
  (document.readyState !== "loading" && !document.documentElement.doScroll)
) {
  allowToShowMarker(() => {
    injectLoadingStyle();
    setTimeout(() => {
      if (!disableOnDomain) {
        showMarkerOnEditor(document.activeElement);
        bindCheckErrorEventOnElement(document.activeElement);
      }
    }, 0);
  });
} else {
  document.addEventListener("DOMContentLoaded", () => {
    allowToShowMarker(() => {
      injectLoadingStyle();
      setTimeout(() => {
        if (!disableOnDomain) {
          showMarkerOnEditor(document.activeElement);
          bindCheckErrorEventOnElement(document.activeElement);
        }
      }, 0);
    });
  });
}

// observe the active element to show the marker
let cleanUpTimeout;
document.addEventListener(
  "active-element",
  event => {
    const { focus: focusElement, blur: blurElement } = event.detail;
    if (isHiddenElement(blurElement) && isEditorElement(blurElement)) {
      removeAllButtons();
    }
    if (!disableOnDomain) {
      // use timeout for adjust html after rendering DOM
      // try to reposition for some site which is rendering from JS (e.g: Upwork)
      setTimeout(() => {
        showMarkerOnEditor(focusElement);
        bindCheckErrorEventOnElement(focusElement);
      },0);
      //setActiveElement(focusElement);  --> when commented in, I get: SecurityError: Blocked a frame with origin "http://localhost" from accessing a cross-origin frame.

      if (!cleanUpTimeout) {
        cleanUpTimeout = setTimeout(() => {
          if (
            isHiddenElement(document.activeElement) ||
            !isEditorElement(document.activeElement)
          ) {
            removeAllButtons();
          }
          cleanUpTimeout = null;
        }, CLEAN_TIMEOUT_MILLIS);
      }

      // show the marker on UI
      setTimeout(() => {
        positionMarkerOnChangeSize();
      },200);
    }
  },
  false
);
