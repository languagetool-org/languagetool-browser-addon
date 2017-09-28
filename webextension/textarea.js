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
const ERROR_BTN_CLASS = "lt-error-btn";
const DISABLE_BTN_CLASS = "lt-disable-btn";
const MARGIN_TO_CORNER = 8;
const REMIND_BTN_SIZE = 16;
const CLEAN_TIME_OUT = 200; // 0.2 second
const BG_CHECK_TIME_OUT = 500; // 0.5 seconds

let disableOnDomain = false;
let autoCheckOnDomain = false;
let totalErrorOnCheckText = 0;
// TODO: should move to tools.js for reused code
let apiCheckTextOptions = '';
const activeElementHandler = ally.event.activeElement();

function isGmail() {
  const currentUrl = window.location.href;
  const { hostname } = new URL(currentUrl);
  return hostname === "mail.google.com";
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
    element.getAttribute("spellcheck") === true
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

/** event handlers */

function isShowErrorDetail() {
  return !autoCheckOnDomain || (autoCheckOnDomain && totalErrorOnCheckText);
}

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
  if (isShowErrorDetail()) {
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
    const gmaiComposeToolbarHeight = 155;
    for (let counter = allTables.length - 1; counter > 0; counter -= 1) {
      const parentTable = allTables[counter];
      if (isDescendant(parentTable, activeTable)) {
        let topPostion = offset(parentTable).top;
        if (topPostion < gmaiComposeToolbarHeight) {
          topPostion = gmaiComposeToolbarHeight;
        }
        btn.style.top = `${topPostion}px`;
        break;
      }
    }
  } else {
    btn.style.top = `${top + offsetHeight - REMIND_BTN_SIZE - MARGIN_TO_CORNER}px`;
  }
  btn.style.left = `${left + offsetWidth - (REMIND_BTN_SIZE + MARGIN_TO_CORNER)*num}px`;
}

function remindLanguageToolButton(clickHandler, position) {
  const btn = document.createElement("A");
  if (autoCheckOnDomain) {
     if (totalErrorOnCheckText > 0) {
      btn.className = `${BTN_CLASS} ${ERROR_BTN_CLASS}`;
      btn.setAttribute("tooltip", `Found ${totalErrorOnCheckText} errors, view detail`);
    } else {
      btn.className = `${BTN_CLASS} ${REMIND_BTN_CLASS}`;
      btn.setAttribute("tooltip", 'No error');
    }
  } else {
    btn.className = `${BTN_CLASS} ${REMIND_BTN_CLASS}`;
    btn.setAttribute("tooltip", chrome.i18n.getMessage("reminderIconTitle"));
  }
  btn.onclick = clickHandler;
  // style
  styleRemindButton(btn, position, 1);
  return btn;
}

function disableLanguageToolButton(clickHandler, position) {
  const { top, left, offsetHeight, offsetWidth } = position;
  const btn = document.createElement("A");
  btn.onclick = clickHandler;
  btn.className = `${BTN_CLASS} ${DISABLE_BTN_CLASS}`;
  btn.setAttribute(
    "tooltip",
    chrome.i18n.getMessage("disableForThisDomainTitle")
  );
  // style
  styleRemindButton(btn, position, 2);
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
    remindLanguageToolButton(checkErrorMenu, position),
    disableLanguageToolButton(disableMenu, position)
  ];
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
function positionMarkerOnChangeSize() {
  if (!ticking) {
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

function showResultOnConsole(result) {
  console.warn('showResultOnConsole', result);
  totalErrorOnCheckText = result.length;
  positionMarkerOnChangeSize();
}

function checkTextApi(text) {
  console.warn('checkTextApi',text);
  const url = "https://languagetoolplus.com/api/v2/check";
  const data = `${apiCheckTextOptions}&text=${encodeURIComponent(text)}`;
  const request = new Request(url, {
    method: "POST",
    headers: new Headers({
      "Content-Type": "application/x-www-form-urlencoded",
    }),
    body: data
  });
  return fetch(request).then(response => {
    if (response.status >= 400) {
      throw new Error("Bad response from server");
    }
    return response.json();
  });
}

function observeEditorElement(element) {
  console.warn('observeEditorElement', element, most);
  /* global most,mostDomEvent */
  const { fromEvent, fromPromise, merge } = most;
  // Logs the current value of the searchInput, only after the user stops typing
  const inputText = fromEvent('input', element).map(evt => evt.target.value).skipRepeats().multicast();
  // Empty results list if there is no text
  const emptyResults = inputText.filter(text => text.length === 0).constant([]);
  const results = inputText.filter(text => text.length > 0)
    .debounce(BG_CHECK_TIME_OUT)
    .map(checkTextApi)
    .map(fromPromise)
    .switch()
    .map(result => result.matches);
  merge(results, emptyResults).observe(showResultOnConsole);
}

function bindClickEventOnElement(currentElement) {
  if (isEditorElement(currentElement)) {
    if (!currentElement.getAttribute("lt-bind-click")) {
      if (autoCheckOnDomain) {
        observeEditorElement(currentElement);
        if(currentElement.value) {
          checkTextApi(currentElement.value).then(result => {
            showResultOnConsole(result.matches);
          })
        }
      }
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
  if (!disableOnDomain) {
    Tools.getStorage().get(
      {
        disabledDomains: [],
        autoCheckOnDomains: [],
        motherTongue: ''
      },
      items => {
        const { hostname } = new URL(currentUrl);
        autoCheckOnDomain = items.autoCheckOnDomains.includes(hostname);
        disableOnDomain = items.disabledDomains.includes(hostname);
        apiCheckTextOptions = `disabledRules=WHITESPACE_RULE&language=auto`;
        if(items.motherTongue) {
          apiCheckTextOptions += `&motherTongue=${items.motherTongue}`;
        }
        let userAgent = "webextension";
        if (Tools.isFirefox()) {
            userAgent += "-firefox";
        } else if (Tools.isChrome()) {
            userAgent += "-chrome";
        } else {
            userAgent += "-unknown";
        }
        apiCheckTextOptions += `&userAgent=${userAgent}`;
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
