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

/* global activeElement, setActiveElement */

const REMIND_WRAPPER_CLASS = "lt-marker-container";
const POPUP_CONTENT_CLASS = "ltaddon-popup-content";
const BTN_CLASS = "lt-buttons";
const REMIND_BTN_CLASS = "lt-remind-btn";
const CHECK_DONE_BTN_CLASS = "lt-check-done-btn";
const ERROR_BTN_CLASS = "lt-error-btn";
const DISABLE_BTN_CLASS = "lt-disable-btn";
const AUTO_CHECK_BTN_CLASS = "lt-auto-check-btn";
const MARGIN_TO_CORNER = 8;
const REMIND_BTN_SIZE = 16;
const CLEAN_TIME_OUT = 200; // 0.2 second
const BG_CHECK_TIME_OUT = 500; // 0.5 second

let disableOnDomain = false;
let autoCheckOnDomain = false;
let totalErrorOnCheckText = -1; // -1 = not checking yet
let apiCheckTextOptions = '';
let ignoreQuotedLines = true;
let lastCheckResult = { text: '', result: {}, total: -1, isProcess: false };
const activeElementHandler = ally.event.activeElement();

function isGmail() {
  const currentUrl = window.location.href;
  const { hostname } = new URL(currentUrl);
  return hostname === "mail.google.com";
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
  $.featherlight({
    iframe: `${chrome.runtime.getURL("popup.html")}?pageUrl=${currentUrl}`,
    iframeWidth: popupWidth,
    iframeHeight: popupHeight,
    namespace: "ltaddon-popup",
    beforeOpen: () => {
      const popupContainers = document.getElementsByClassName(
        POPUP_CONTENT_CLASS
      );
      for (let counter = 0; counter < popupContainers.length; counter += 1) {
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
  for (let counter = 0; counter < btns.length; counter += 1) {
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
        disabledDomains: [...new Set(items.disabledDomains)]
      });
    }
  );
}

function autoCheckMenu(evt) {
  evt.preventDefault();
  autoCheckOnDomain = true;
  document.querySelector('a.lt-auto-check-btn').style.display = "none";
  Tools.getStorage().get(
    {
      autoCheckOnDomains: []
    },
    items => {
      const currentUrl = window.location.href;
      const { hostname } = new URL(currentUrl);
      items.autoCheckOnDomains.push(hostname);
      Tools.getStorage().set({
        autoCheckOnDomains: [...new Set(items.autoCheckOnDomains)]
      });
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
    for (let counter = allTables.length - 1; counter > 0; counter -= 1) {
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
  btn.style.left = `${left + offsetWidth - (REMIND_BTN_SIZE + MARGIN_TO_CORNER)*num}px`;
}

function remindLanguageToolButton(clickHandler, position, num) {
  const btn = document.createElement("A");
  if (autoCheckOnDomain && totalErrorOnCheckText >= 0) {
     if (totalErrorOnCheckText > 0) {
      btn.className = `${BTN_CLASS} ${ERROR_BTN_CLASS}`;
      const tooltip = totalErrorOnCheckText === 1 ? chrome.i18n.getMessage("foundAErrorOnCheckText",[totalErrorOnCheckText]) : chrome.i18n.getMessage("foundErrorsOnCheckText",[totalErrorOnCheckText]);
      btn.setAttribute("tooltip", tooltip);
    } else {
      btn.className = `${BTN_CLASS} ${CHECK_DONE_BTN_CLASS}`;
      btn.setAttribute("tooltip", chrome.i18n.getMessage("noErrorOnCheckText"));
    }
  } else {
    btn.className = `${BTN_CLASS} ${REMIND_BTN_CLASS}`;
    btn.setAttribute("tooltip", chrome.i18n.getMessage("reminderIconTitle"));
  }

  btn.onclick = clickHandler;
  // style
  styleRemindButton(btn, position, num);
  return btn;
}

function disableLanguageToolButton(clickHandler, position, num) {
  const { top, left, offsetHeight, offsetWidth } = position;
  const btn = document.createElement("A");
  btn.onclick = clickHandler;
  btn.className = `${BTN_CLASS} ${DISABLE_BTN_CLASS}`;
  btn.setAttribute(
    "tooltip",
    chrome.i18n.getMessage("disableForThisDomainTitle")
  );
  // style
  styleRemindButton(btn, position, num);
  return btn;
}

function autoCheckLanguageToolButton(clickHandler, position, num) {
  const { top, left, offsetHeight, offsetWidth } = position;
  const btn = document.createElement("A");
  btn.onclick = clickHandler;
  btn.className = `${BTN_CLASS} ${AUTO_CHECK_BTN_CLASS}`;
  btn.setAttribute(
    "tooltip",
    chrome.i18n.getMessage("autoCheckForThisDomainTitle")
  );
  // style
  styleRemindButton(btn, position, num);
  return btn;
}

function textAreaWrapper(textElement, btnElements) {
  const wrapper = document.createElement("div");
  wrapper.className = REMIND_WRAPPER_CLASS;
  wrapper.id = `textarea-wrapper-${textElement.name ||
    textElement.id}-${Date.now()}`;
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
  const position = Object.assign({}, offset(element), {
    offsetHeight,
    offsetWidth
  });
  const btns = [
    remindLanguageToolButton(checkErrorMenu, position, 1),
  ];

  if(!autoCheckOnDomain) {
    btns.push(autoCheckLanguageToolButton(autoCheckMenu, position, 2));
    btns.push(disableLanguageToolButton(disableMenu, position, 3));
  } else {
    btns.push(disableLanguageToolButton(disableMenu, position, 2));
  }

  textAreaWrapper(element, btns);
}

/**
 * show marker on element
 * @param DOMELement focusElement
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
function positionMarkerOnChangeSize(forceRender = false) {
  if (!ticking || forceRender) {
    window.requestAnimationFrame(() => {
      removeAllButtons();
      if (!disableOnDomain && isShowOnViewPort(document.activeElement)) {
        showMarkerOnEditor(document.activeElement);
      }
      ticking = false;
    });
  }
  ticking = true;
}

function showMatchedResultOnMarker(result) {
  console.warn('showMatchedResultOnMarker', result, lastCheckResult);
  if (result && result.matches && result.matches.length > 0) {
    const language = DOMPurify.sanitize(result.language.name);
    const languageCode = DOMPurify.sanitize(result.language.code);
    const shortLanguageCode = getShortCode(languageCode);
    lastCheckResult = Object.assign({}, lastCheckResult, { result });
    let matchesCount = 0;
    let matches = [];
    const uniquePositionMatches = [];
    let prevErrStart = -1;
    let prevErrLen = -1;
    for (let i = result.matches.length-1; i >= 0; i--) {
        const m = result.matches[i];
        const errStart = parseInt(m.offset);
        const errLen = parseInt(m.length);
        if (errStart != prevErrStart || errLen != prevErrLen) {
            uniquePositionMatches.push(m);
            prevErrStart = errStart;
            prevErrLen = errLen;
        }
    }
    uniquePositionMatches.reverse();
    matches = uniquePositionMatches;
    const ignoredRuleCounts = {};
    const ruleIdToDesc = {};
    Tools.getStorage().get(
    {
      ignoredRules: [],
      dictionary: []
    },
    items => {
      const { dictionary, ignoredRules } = items;
      for (let m of matches) {
          // these values come from the server, make sure they are ints:
          const errStart = parseInt(m.context.offset);
          const errLen = parseInt(m.length);
          // these string values come from the server and need to be sanitized
          // as they will be inserted with innerHTML:
          const contextSanitized = DOMPurify.sanitize(m.context.text);
          const ruleIdSanitized = DOMPurify.sanitize(m.rule.id);
          const messageSanitized = DOMPurify.sanitize(m.message);
          const descriptionSanitized = DOMPurify.sanitize(m.rule.description);
          ruleIdToDesc[ruleIdSanitized] = descriptionSanitized;
          const wordSanitized = contextSanitized.substr(errStart, errLen);
          let ignoreError = false;
          if (isSpellingError(m)) {
              // Also accept uppercase versions of lowercase words in personal dict:
              const knowToDict = dictionary.indexOf(wordSanitized) != -1;
              if (knowToDict) {
                  ignoreError = true;
              } else if (!knowToDict && Tools.startWithUppercase(wordSanitized)) {
                  ignoreError = dictionary.indexOf(Tools.lowerCaseFirstChar(wordSanitized)) != -1;
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
      console.warn('found total errors', totalErrorOnCheckText, lastCheckResult);
      positionMarkerOnChangeSize(true);
    });
  } else {
    totalErrorOnCheckText = 0;
    lastCheckResult = Object.assign({}, lastCheckResult, { total: totalErrorOnCheckText, result: {}, text: '' });
    positionMarkerOnChangeSize(true);
  }
}

function markup2text({ markupList }) {
  console.warn('markup2text', markupList);
  positionMarkerOnChangeSize();
  let text = Markup.markupList2text(markupList);
  if (ignoreQuotedLines) {
      text = text.replace(/^>.*?\n/gm, function(match) {
          return " ".repeat(match.length - 1) + "\n";
      });
  }
  return text;
}

function checkTextApi(text) {
  console.warn('checkTextApi',text);
  if( text === lastCheckResult.text) {
    return Promise.resolve({ result: lastCheckResult.result });
  }
  lastCheckResult = Object.assign({}, lastCheckResult, { text, isProcess: true });
  if(!autoCheckOnDomain || text.trim().length === 0) {
    return Promise.resolve({ result: {} });
  }
  const url = "https://languagetoolplus.com/api/v2/check";
  const data = `${apiCheckTextOptions}&text=${encodeURIComponent(text.trim())}`;
  const request = new Request(url, {
    method: "POST",
    headers: new Headers({
      "Content-Type": "application/x-www-form-urlencoded",
    }),
    body: data
  });
  let animation;
  if (Tools.isFirefox()) {
    setTimeout(() => {
      // Refer to https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Content_scripts
      // In Firefox: if you call window.eval(), it runs code in the context of the page.
      window.eval(`console.warn('animate for FF');document.querySelector('.${BTN_CLASS}').animate([
        { transform: 'scale(1.25)' },
        { transform: 'scale(0.75)' }
      ], {
        duration: 1000,
        iterations: 10
      });`);
    },0);
  } else {
    setTimeout(() => {
      console.warn('animate from timeout');
      if (document.querySelector(`.${BTN_CLASS}`)) {
         animation = document.querySelector(`.${BTN_CLASS}`).animate([
          { transform: 'scale(1.25)' },
          { transform: 'scale(0.75)' }
        ], {
          duration: 1000,
          iterations: 10
        });
      }
    },0);
  }

  return fetch(request).then(response => {
    if (animation) {
      animation.cancel();
    }
    if (response.status >= 400) {
      lastCheckResult = Object.assign({}, lastCheckResult, { isProcess: false, text: '', result: {}, total: -1 });
      throw new Error("Bad response from server");
    }
    // ignore this reques if the text is change
    lastCheckResult = Object.assign({}, lastCheckResult, { isProcess: false });
    console.warn('text is changed?', lastCheckResult.text !== text);
    if (lastCheckResult.text !== text) {
      return Promise.resolve({ result: {} });
    }
    return response.json();
  }).catch(error => {
    animation.cancel();
    const pageUrl = window.location.href;
    lastCheckResult = Object.assign({}, lastCheckResult, { isProcess: false });
    Tools.track(pageUrl, `error on checkTextApi: ${error.message}`);
  })
}


function getTextFromElement(element) {
    const pageUrl = window.location.href;
    if (element.tagName === "IFRAME") {
        try {
            if (element
                && element.contentWindow
                && element.contentWindow.document.getSelection()
                && element.contentWindow.document.getSelection().toString() !== "") {
                const text = element.contentWindow.document.getSelection().toString();
                return ({ markupList: [{ text }], isEditableText: false });
            }
        } catch (err) {
            Tools.track(pageUrl, `error on getTextFromElement for iframe: ${err.message}`);
        }
    }

    const markupList = getMarkupListOfActiveElement(element);
    return ({ markupList, isEditableText: true });
}

function elementMarkup(evt) {
  totalErrorOnCheckText = -1;
  lastCheckResult = Object.assign({}, lastCheckResult, { result: {}, text: '', total: -1 });
  positionMarkerOnChangeSize();
  return getTextFromElement(evt.target);
}

function isSameText(prevObject, nextObject) {
  return JSON.stringify(nextObject) === JSON.stringify(prevObject);
}

function observeEditorElement(element) {
  /* global most */
  const { fromEvent, fromPromise, merge } = most;
  // Logs the current value of the searchInput, only after the user stops typing
  let inputText;
  if(element.tagName === 'IFRAME') {
    inputText = fromEvent('input', element.contentWindow).map(elementMarkup).skipRepeatsWith(isSameText).multicast();
  } else {
    inputText = fromEvent('input', element).map(elementMarkup).skipRepeatsWith(isSameText).multicast();
  }
  // Empty results list if there is no text
  const emptyResults = inputText.filter(markup => markup.markupList && markup.markupList[0] && markup.markupList[0].text && markup.markupList[0].text.length < 1).constant([]);
  const results = inputText.filter(markup => markup.markupList && markup.markupList[0] && markup.markupList[0].text && markup.markupList[0].text.length > 1)
    .debounce(BG_CHECK_TIME_OUT)
    .map(markup2text)
    .map(checkTextApi)
    .map(fromPromise)
    .switchLatest();
  merge(results, emptyResults).observe(showMatchedResultOnMarker);
}

function bindClickEventOnElement(currentElement) {
  if (isEditorElement(currentElement)) {
    totalErrorOnCheckText = -1;
    if (autoCheckOnDomain) {
      const text = markup2text(getTextFromElement(currentElement));
      console.warn('lastCheckResult', lastCheckResult, text);
      if (text !== lastCheckResult.text) {
        if (text.length > 0) {
          checkTextApi(text).then(result => {
            if(result) {
              showMatchedResultOnMarker(result);
            }
          });
        }
      } else {
        showMatchedResultOnMarker(lastCheckResult.result);
      }
    }

    if (!currentElement.getAttribute("lt-auto-check") && autoCheckOnDomain) {
        observeEditorElement(currentElement);
        currentElement.setAttribute("lt-auto-check", true);
    }

    if (!currentElement.getAttribute("lt-bind-click")) {
      currentElement.addEventListener(
        "mouseup",
        () => {
          showMarkerOnEditor(currentElement);
        },
        false
      );
      currentElement.setAttribute("lt-bind-click", true);
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
}

function allowToShowMarker(callback) {
  const currentUrl = window.location.href;
  disableOnDomain = Tools.doNotShowMarkerOnUrl(currentUrl);
  Tools.prepareApiCheckTextParam(options => {
      apiCheckTextOptions = options;
  });
  if (!disableOnDomain) {
    Tools.getStorage().get(
      {
        disabledDomains: [],
        autoCheckOnDomains: [],
        ignoreQuotedLines: true,
      },
      items => {
        const { hostname } = new URL(currentUrl);
        autoCheckOnDomain = items.autoCheckOnDomains.includes(hostname);
        disableOnDomain = items.disabledDomains.includes(hostname);
        ignoreQuotedLines = items.ignoreQuotedLines;
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

if (
  document.readyState === "complete" ||
  (document.readyState !== "loading" && !document.documentElement.doScroll)
) {
  allowToShowMarker(() => {
    const currentElement = document.activeElement;
    showMarkerOnEditor(currentElement);
    bindClickEventOnElement(currentElement);
  });
} else {
  document.addEventListener("DOMContentLoaded", () => {
    allowToShowMarker(() => {
      const currentElement = document.activeElement;
      showMarkerOnEditor(currentElement);
      bindClickEventOnElement(currentElement);
    });
  });
}

// observe the active element to show the marker
let cleanUpTimeout;
let renderTimeout;
document.addEventListener(
  "active-element",
  event => {
    const { focus: focusElement, blur: blurElement } = event.detail;
    if (isHiddenElement(blurElement) && isEditorElement(blurElement)) {
      removeAllButtons();
    }
    if (!disableOnDomain) {
      // use timeout for adjust html after redering DOM
      // try to reposition for some site which is rendering from JS (e.g: Upwork)
      if (!renderTimeout) {
        renderTimeout = setTimeout(() => {
          showMarkerOnEditor(focusElement);
          bindClickEventOnElement(focusElement);
          renderTimeout = null;
        }, 0);
      }

      if (!cleanUpTimeout) {
        cleanUpTimeout = setTimeout(() => {
          if (
            isHiddenElement(document.activeElement) ||
            !isEditorElement(document.activeElement)
          ) {
            removeAllButtons();
          }
          cleanUpTimeout = null;
        }, CLEAN_TIME_OUT);
      }
    }
  },
  false
);
