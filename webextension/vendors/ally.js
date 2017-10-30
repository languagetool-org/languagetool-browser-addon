(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.ally = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _interopDefault(ex) {
  return ex && (typeof ex === 'undefined' ? 'undefined' : _typeof(ex)) === 'object' && 'default' in ex ? ex['default'] : ex;
}

var _platform = _interopDefault(require('platform'));
var cssEscape = _interopDefault(require('css.escape'));

// input may be undefined, selector-tring, Node, NodeList, HTMLCollection, array of Nodes
// yes, to some extent this is a bad replica of jQuery's constructor function
var nodeArray = function nodeArray(input) {
  if (!input) {
    return [];
  }

  if (Array.isArray(input)) {
    return input;
  }

  // instanceof Node - does not work with iframes
  if (input.nodeType !== undefined) {
    return [input];
  }

  if (typeof input === 'string') {
    input = document.querySelectorAll(input);
  }

  if (input.length !== undefined) {
    return [].slice.call(input, 0);
  }

  throw new TypeError('unexpected input ' + String(input));
};

var contextToElement = function contextToElement(_ref) {
  var context = _ref.context,
      _ref$label = _ref.label,
      label = _ref$label === undefined ? 'context-to-element' : _ref$label,
      resolveDocument = _ref.resolveDocument,
      defaultToDocument = _ref.defaultToDocument;

  var element = nodeArray(context)[0];

  if (resolveDocument && element && element.nodeType === Node.DOCUMENT_NODE) {
    element = element.documentElement;
  }

  if (!element && defaultToDocument) {
    return document.documentElement;
  }

  if (!element) {
    throw new TypeError(label + ' requires valid options.context');
  }

  if (element.nodeType !== Node.ELEMENT_NODE && element.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) {
    throw new TypeError(label + ' requires options.context to be an Element');
  }

  return element;
};

var getShadowHost = function getShadowHost() {
  var _ref2 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      context = _ref2.context;

  var element = contextToElement({
    label: 'get/shadow-host',
    context: context
  });

  // walk up to the root
  var container = null;

  while (element) {
    container = element;
    element = element.parentNode;
  }

  // https://developer.mozilla.org/en-US/docs/Web/API/Node.nodeType
  // NOTE: Firefox 34 does not expose ShadowRoot.host (but 37 does)
  if (container.nodeType === container.DOCUMENT_FRAGMENT_NODE && container.host) {
    // the root is attached to a fragment node that has a host
    return container.host;
  }

  return null;
};

var getDocument = function getDocument(node) {
  if (!node) {
    return document;
  }

  if (node.nodeType === Node.DOCUMENT_NODE) {
    return node;
  }

  return node.ownerDocument || document;
};

// Determines if an element is the activeElement within its context, i.e. its document iFrame or ShadowHost

var isActiveElement = function isActiveElement(context) {
  var element = contextToElement({
    label: 'is/active-element',
    resolveDocument: true,
    context: context
  });

  var _document = getDocument(element);
  if (_document.activeElement === element) {
    return true;
  }

  var shadowHost = getShadowHost({ context: element });
  if (shadowHost && shadowHost.shadowRoot.activeElement === element) {
    return true;
  }

  return false;
};

var getWindow = function getWindow(node) {
  var _document = getDocument(node);
  return _document.defaultView || window;
};

// wrapper for HTMLElement.prototype.blur

var blur = function blur(context) {
  var element = contextToElement({
    label: 'element/blur',
    context: context
  });

  if (!isActiveElement(element)) {
    return null;
  }

  var nodeName = element.nodeName.toLowerCase();
  if (nodeName === 'body') {
    // prevent the browser window from losing focus in IE9
    // according to https://bugs.jqueryui.com/ticket/9420
    return null;
  }

  if (element.blur) {
    element.blur();
    return document.activeElement;
  }

  var _window = getWindow(element);

  try {
    // The element itself does not have a blur method.
    // This is true for SVG elements in Firefox and IE,
    // as well as MathML elements in every browser.
    // IE9 - 11 will let us abuse HTMLElement's blur method,
    // Firefox and Edge will throw an error.
    _window.HTMLElement.prototype.blur.call(element);
  } catch (e) {
    // if we're not in an HTML document, we don't have access to document.body
    var body = _window.document && _window.document.body;
    if (!body) {
      return null;
    }

    // we can't simply call document.body.focus() unless
    // we make sure the element actually is focusable
    var tabindex = body.getAttribute('tabindex');
    body.setAttribute('tabindex', '-1');
    body.focus();
    if (tabindex) {
      body.setAttribute('tabindex', tabindex);
    } else {
      body.removeAttribute('tabindex');
    }
  }

  return _window.document.activeElement;
};

// sugar for https://github.com/bestiejs/platform.js
// make sure to ALWAYS reference the layout engine,
// even if it is not necessary for the condition,
// as this makes grepping for this stuff simpler

// deep clone of original platform
var platform = JSON.parse(JSON.stringify(_platform));

// operating system
var os = platform.os.family || '';
var ANDROID = os === 'Android';
var WINDOWS = os.slice(0, 7) === 'Windows';
var OSX = os === 'OS X';
var IOS = os === 'iOS';

// layout
var BLINK = platform.layout === 'Blink';
var GECKO = platform.layout === 'Gecko';
var TRIDENT = platform.layout === 'Trident';
var EDGE = platform.layout === 'EdgeHTML';
var WEBKIT = platform.layout === 'WebKit';

// browser version (not layout engine version!)
var version = parseFloat(platform.version);
var majorVersion = Math.floor(version);
platform.majorVersion = majorVersion;

platform.is = {
  // operating system
  ANDROID: ANDROID,
  WINDOWS: WINDOWS,
  OSX: OSX,
  IOS: IOS,
  // layout
  BLINK: BLINK, // "Chrome", "Chrome Mobile", "Opera"
  GECKO: GECKO, // "Firefox"
  TRIDENT: TRIDENT, // "Internet Explorer"
  EDGE: EDGE, // "Microsoft Edge"
  WEBKIT: WEBKIT, // "Safari"
  // INTERNET EXPLORERS
  IE9: TRIDENT && majorVersion === 9,
  IE10: TRIDENT && majorVersion === 10,
  IE11: TRIDENT && majorVersion === 11
};

function before() {
  var data = {
    // remember what had focus to restore after test
    activeElement: document.activeElement,
    // remember scroll positions to restore after test
    windowScrollTop: window.scrollTop,
    windowScrollLeft: window.scrollLeft,
    bodyScrollTop: document.body.scrollTop,
    bodyScrollLeft: document.body.scrollLeft
  };

  // wrap tests in an element hidden from screen readers to prevent them
  // from announcing focus, which can be quite irritating to the user
  var iframe = document.createElement('iframe');
  iframe.setAttribute('style', 'position:absolute; position:fixed; top:0; left:-2px; width:1px; height:1px; overflow:hidden;');
  iframe.setAttribute('aria-live', 'off');
  iframe.setAttribute('aria-busy', 'true');
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  var _window = iframe.contentWindow;
  var _document = _window.document;

  _document.open();
  _document.close();
  var wrapper = _document.createElement('div');
  _document.body.appendChild(wrapper);

  data.iframe = iframe;
  data.wrapper = wrapper;
  data.window = _window;
  data.document = _document;

  return data;
}

// options.element:
//  {string} element name
//  {function} callback(wrapper, document) to generate an element
// options.mutate: (optional)
//  {function} callback(element, wrapper, document) to manipulate element prior to focus-test.
//             Can return DOMElement to define focus target (default: element)
// options.validate: (optional)
//  {function} callback(element, focusTarget, document) to manipulate test-result
function test(data, options) {
  // make sure we operate on a clean slate
  data.wrapper.innerHTML = '';
  // create dummy element to test focusability of
  var element = typeof options.element === 'string' ? data.document.createElement(options.element) : options.element(data.wrapper, data.document);
  // allow callback to further specify dummy element
  // and optionally define element to focus
  var focus = options.mutate && options.mutate(element, data.wrapper, data.document);
  if (!focus && focus !== false) {
    focus = element;
  }
  // element needs to be part of the DOM to be focusable
  !element.parentNode && data.wrapper.appendChild(element);
  // test if the element with invalid tabindex can be focused
  focus && focus.focus && focus.focus();
  // validate test's result
  return options.validate ? options.validate(element, focus, data.document) : data.document.activeElement === focus;
}

function after(data) {
  // restore focus to what it was before test and cleanup
  if (data.activeElement === document.body) {
    document.activeElement && document.activeElement.blur && document.activeElement.blur();
    if (platform.is.IE10) {
      // IE10 does not redirect focus to <body> when the activeElement is removed
      document.body.focus();
    }
  } else {
    data.activeElement && data.activeElement.focus && data.activeElement.focus();
  }

  document.body.removeChild(data.iframe);

  // restore scroll position
  window.scrollTop = data.windowScrollTop;
  window.scrollLeft = data.windowScrollLeft;
  document.body.scrollTop = data.bodyScrollTop;
  document.body.scrollLeft = data.bodyScrollLeft;
}

var detectFocus = function detectFocus(tests) {
  var data = before();

  var results = {};
  Object.keys(tests).map(function (key) {
    results[key] = test(data, tests[key]);
  });

  after(data);
  return results;
};

// this file is overwritten by `npm run build:pre`
var version$1 = '1.4.1';

/*
    Facility to cache test results in localStorage.

    USAGE:
      cache.get('key');
      cache.set('key', 'value');
 */

function readLocalStorage(key) {
  // allow reading from storage to retrieve previous support results
  // even while the document does not have focus
  var data = void 0;

  try {
    data = window.localStorage && window.localStorage.getItem(key);
    data = data ? JSON.parse(data) : {};
  } catch (e) {
    data = {};
  }

  return data;
}

function writeLocalStorage(key, value) {
  if (!document.hasFocus()) {
    // if the document does not have focus when tests are executed, focus() may
    // not be handled properly and events may not be dispatched immediately.
    // This can happen when a document is reloaded while Developer Tools have focus.
    try {
      window.localStorage && window.localStorage.removeItem(key);
    } catch (e) {
      // ignore
    }

    return;
  }

  try {
    window.localStorage && window.localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // ignore
  }
}

var userAgent = typeof window !== 'undefined' && window.navigator.userAgent || '';
var cacheKey = 'ally-supports-cache';
var cache = readLocalStorage(cacheKey);

// update the cache if ally or the user agent changed (newer version, etc)
if (cache.userAgent !== userAgent || cache.version !== version$1) {
  cache = {};
}

cache.userAgent = userAgent;
cache.version = version$1;

var cache$1 = {
  get: function get() {
    return cache;
  },
  set: function set(values) {
    Object.keys(values).forEach(function (key) {
      cache[key] = values[key];
    });

    cache.time = new Date().toISOString();
    writeLocalStorage(cacheKey, cache);
  }
};

var cssShadowPiercingDeepCombinator = function cssShadowPiercingDeepCombinator() {
  var combinator = void 0;

  // see https://dev.w3.org/csswg/css-scoping-1/#deep-combinator
  // https://bugzilla.mozilla.org/show_bug.cgi?id=1117572
  // https://code.google.com/p/chromium/issues/detail?id=446051
  try {
    document.querySelector('html >>> :first-child');
    combinator = '>>>';
  } catch (noArrowArrowArrow) {
    try {
      // old syntax supported at least up to Chrome 41
      // https://code.google.com/p/chromium/issues/detail?id=446051
      document.querySelector('html /deep/ :first-child');
      combinator = '/deep/';
    } catch (noDeep) {
      combinator = '';
    }
  }

  return combinator;
};

var gif = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

// https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img#attr-usemap
var focusAreaImgTabindex = {
  element: 'div',
  mutate: function mutate(element) {
    // dnaber: commented out to calm down Mozilla validator - doesn't seem to be needed:
    //element.innerHTML = '<map name="image-map-tabindex-test">' + '<area shape="rect" coords="63,19,144,45"></map>' + '<img usemap="#image-map-tabindex-test" tabindex="-1" alt="" src="' + gif + '">';

    return element.querySelector('area');
  }
};

// https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img#attr-usemap
var focusAreaTabindex = {
  element: 'div',
  mutate: function mutate(element) {
    // dnaber: commented out to calm down Mozilla validator - doesn't seem to be needed:
    //element.innerHTML = '<map name="image-map-tabindex-test">' + '<area href="#void" tabindex="-1" shape="rect" coords="63,19,144,45"></map>' + '<img usemap="#image-map-tabindex-test" alt="" src="' + gif + '">';

    return false;
  },
  validate: function validate(element, focusTarget, _document) {
    if (platform.is.GECKO) {
      // fixes https://github.com/medialize/ally.js/issues/35
      // Firefox loads the DataURI asynchronously, causing a false-negative
      return true;
    }

    var focus = element.querySelector('area');
    focus.focus();
    return _document.activeElement === focus;
  }
};

// https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img#attr-usemap
var focusAreaWithoutHref = {
  element: 'div',
  mutate: function mutate(element) {
    // dnaber: commented out to calm down Mozilla validator - doesn't seem to be needed:
    //element.innerHTML = '<map name="image-map-area-href-test">' + '<area shape="rect" coords="63,19,144,45"></map>' + '<img usemap="#image-map-area-href-test" alt="" src="' + gif + '">';

    return element.querySelector('area');
  },
  validate: function validate(element, focusTarget, _document) {
    if (platform.is.GECKO) {
      // fixes https://github.com/medialize/ally.js/issues/35
      // Firefox loads the DataURI asynchronously, causing a false-negative
      return true;
    }

    return _document.activeElement === focusTarget;
  }
};

// export default 'data:audio/mp3;base64,audio-focus-test';

var focusAudioWithoutControls = {
  name: 'can-focus-audio-without-controls',
  element: 'audio',
  mutate: function mutate(element) {
    try {
      // invalid media file can trigger warning in console, data-uri to prevent HTTP request
      element.setAttribute('src', gif);
    } catch (e) {
      // IE9 may throw "Error: Not implemented"
    }
  }
};

var invalidGif = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ';

// NOTE: https://github.com/medialize/ally.js/issues/35
// https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img#attr-usemap
var focusBrokenImageMap = {
  element: 'div',
  mutate: function mutate(element) {
    // dnaber: commented out to calm down Mozilla validator - doesn't seem to be needed:
    //element.innerHTML = '<map name="broken-image-map-test"><area href="#void" shape="rect" coords="63,19,144,45"></map>' + '<img usemap="#broken-image-map-test" alt="" src="' + invalidGif + '">';

    return element.querySelector('area');
  }
};

// Children of focusable elements with display:flex are focusable in IE10-11
var focusChildrenOfFocusableFlexbox = {
  element: 'div',
  mutate: function mutate(element) {
    element.setAttribute('tabindex', '-1');
    element.setAttribute('style', 'display: -webkit-flex; display: -ms-flexbox; display: flex;');
    // dnaber: commented out to calm down Mozilla validator - doesn't seem to be needed:
    //element.innerHTML = '<span style="display: block;">hello</span>';
    return element.querySelector('span');
  }
};

// fieldset[tabindex=0][disabled] should not be focusable, but Blink and WebKit disagree
// @specification https://www.w3.org/TR/html5/disabled-elements.html#concept-element-disabled
// @browser-issue Chromium https://crbug.com/453847
// @browser-issue WebKit https://bugs.webkit.org/show_bug.cgi?id=141086
var focusFieldsetDisabled = {
  element: 'fieldset',
  mutate: function mutate(element) {
    element.setAttribute('tabindex', 0);
    element.setAttribute('disabled', 'disabled');
  }
};

var focusFieldset = {
  element: 'fieldset',
  mutate: function mutate(element) {
    // dnaber: commented out to calm down Mozilla validator - doesn't seem to be needed:
    //element.innerHTML = '<legend>legend</legend><p>content</p>';
  }
};

// elements with display:flex are focusable in IE10-11
var focusFlexboxContainer = {
  element: 'span',
  mutate: function mutate(element) {
    element.setAttribute('style', 'display: -webkit-flex; display: -ms-flexbox; display: flex;');
    // dnaber: commented out to calm down Mozilla validator - doesn't seem to be needed:
    //element.innerHTML = '<span style="display: block;">hello</span>';
  }
};

// form[tabindex=0][disabled] should be focusable as the
// specification doesn't know the disabled attribute on the form element
// @specification https://www.w3.org/TR/html5/forms.html#the-form-element
var focusFormDisabled = {
  element: 'form',
  mutate: function mutate(element) {
    element.setAttribute('tabindex', 0);
    element.setAttribute('disabled', 'disabled');
  }
};

// NOTE: https://github.com/medialize/ally.js/issues/35
// fixes https://github.com/medialize/ally.js/issues/20
// https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img#attr-ismap
var focusImgIsmap = {
  element: 'a',
  mutate: function mutate(element) {
    element.href = '#void';
    // dnaber: commented out to calm down Mozilla validator - doesn't seem to be needed:
    //element.innerHTML = '<img ismap src="' + gif + '" alt="">';
    return element.querySelector('img');
  }
};

// NOTE: https://github.com/medialize/ally.js/issues/35
// https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img#attr-usemap
var focusImgUsemapTabindex = {
  element: 'div',
  mutate: function mutate(element) {
    // dnaber: commented out to calm down Mozilla validator - doesn't seem to be needed:
    //element.innerHTML = '<map name="image-map-tabindex-test"><area href="#void" shape="rect" coords="63,19,144,45"></map>' + '<img usemap="#image-map-tabindex-test" tabindex="-1" alt="" ' + 'src="' + gif + '">';

    return element.querySelector('img');
  }
};

var focusInHiddenIframe = {
  element: function element(wrapper, _document) {
    var iframe = _document.createElement('iframe');

    // iframe must be part of the DOM before accessing the contentWindow is possible
    wrapper.appendChild(iframe);

    // create the iframe's default document (<html><head></head><body></body></html>)
    var iframeDocument = iframe.contentWindow.document;
    iframeDocument.open();
    iframeDocument.close();
    return iframe;
  },
  mutate: function mutate(iframe) {
    iframe.style.visibility = 'hidden';

    var iframeDocument = iframe.contentWindow.document;
    var input = iframeDocument.createElement('input');
    iframeDocument.body.appendChild(input);
    return input;
  },
  validate: function validate(iframe) {
    var iframeDocument = iframe.contentWindow.document;
    var focus = iframeDocument.querySelector('input');
    return iframeDocument.activeElement === focus;
  }
};

var result = !platform.is.WEBKIT;

var focusInZeroDimensionObject = function focusInZeroDimensionObject() {
  return result;
};

// Firefox allows *any* value and treats invalid values like tabindex="-1"
// @browser-issue Gecko https://bugzilla.mozilla.org/show_bug.cgi?id=1128054
var focusInvalidTabindex = {
  element: 'div',
  mutate: function mutate(element) {
    element.setAttribute('tabindex', 'invalid-value');
  }
};

var focusLabelTabindex = {
  element: 'label',
  mutate: function mutate(element) {
    element.setAttribute('tabindex', '-1');
  },
  validate: function validate(element, focusTarget, _document) {
    // force layout in Chrome 49, otherwise the element won't be focusable
    /* eslint-disable no-unused-vars */
    var variableToPreventDeadCodeElimination = element.offsetHeight;
    /* eslint-enable no-unused-vars */
    element.focus();
    return _document.activeElement === element;
  }
};

var svg = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtb' + 'G5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiBpZD0ic3ZnIj48dGV4dCB4PSIxMCIgeT0iMjAiIGlkPSJ' + 'zdmctbGluay10ZXh0Ij50ZXh0PC90ZXh0Pjwvc3ZnPg==';

// Note: IE10 on BrowserStack does not like this test

var focusObjectSvgHidden = {
  element: 'object',
  mutate: function mutate(element) {
    element.setAttribute('type', 'image/svg+xml');
    element.setAttribute('data', svg);
    element.setAttribute('width', '200');
    element.setAttribute('height', '50');
    element.style.visibility = 'hidden';
  }
};

// Note: IE10 on BrowserStack does not like this test

var focusObjectSvg = {
  name: 'can-focus-object-svg',
  element: 'object',
  mutate: function mutate(element) {
    element.setAttribute('type', 'image/svg+xml');
    element.setAttribute('data', svg);
    element.setAttribute('width', '200');
    element.setAttribute('height', '50');
  },
  validate: function validate(element, focusTarget, _document) {
    if (platform.is.GECKO) {
      // Firefox seems to be handling the object creation asynchronously and thereby produces a false negative test result.
      // Because we know Firefox is able to focus object elements referencing SVGs, we simply cheat by sniffing the user agent string
      return true;
    }

    return _document.activeElement === element;
  }
};

// Every Environment except IE9 considers SWF objects focusable
var result$1 = !platform.is.IE9;

var focusObjectSwf = function focusObjectSwf() {
  return result$1;
};

var focusRedirectImgUsemap = {
  element: 'div',
  mutate: function mutate(element) {
    // dnaber: commented out to calm down Mozilla validator - doesn't seem to be needed:
    //element.innerHTML = '<map name="focus-redirect-img-usemap"><area href="#void" shape="rect" coords="63,19,144,45"></map>' + '<img usemap="#focus-redirect-img-usemap" alt="" ' + 'src="' + gif + '">';

    // focus the <img>, not the <div>
    return element.querySelector('img');
  },
  validate: function validate(element, focusTarget, _document) {
    var target = element.querySelector('area');
    return _document.activeElement === target;
  }
};

// see https://jsbin.com/nenirisage/edit?html,js,console,output

var focusRedirectLegend = {
  element: 'fieldset',
  mutate: function mutate(element) {
    // dnaber: commented out to calm down Mozilla validator - doesn't seem to be needed:
    //element.innerHTML = '<legend>legend</legend><input tabindex="-1"><input tabindex="0">';
    // take care of focus in validate();
    return false;
  },
  validate: function validate(element, focusTarget, _document) {
    var focusable = element.querySelector('input[tabindex="-1"]');
    var tabbable = element.querySelector('input[tabindex="0"]');

    // Firefox requires this test to focus the <fieldset> first, while this is not necessary in
    // https://jsbin.com/nenirisage/edit?html,js,console,output
    element.focus();

    element.querySelector('legend').focus();
    return _document.activeElement === focusable && 'focusable' || _document.activeElement === tabbable && 'tabbable' || '';
  }
};

// https://github.com/medialize/ally.js/issues/21
var focusScrollBody = {
  element: 'div',
  mutate: function mutate(element) {
    element.setAttribute('style', 'width: 100px; height: 50px; overflow: auto;');
    // dnaber: commented out to calm down Mozilla validator - doesn't seem to be needed:7
    //element.innerHTML = '<div style="width: 500px; height: 40px;">scrollable content</div>';
    return element.querySelector('div');
  }
};

// https://github.com/medialize/ally.js/issues/21
var focusScrollContainerWithoutOverflow = {
  element: 'div',
  mutate: function mutate(element) {
    element.setAttribute('style', 'width: 100px; height: 50px;');
    // dnaber: commented out to calm down Mozilla validator - doesn't seem to be needed:
    //element.innerHTML = '<div style="width: 500px; height: 40px;">scrollable content</div>';
  }
};

// https://github.com/medialize/ally.js/issues/21
var focusScrollContainer = {
  element: 'div',
  mutate: function mutate(element) {
    element.setAttribute('style', 'width: 100px; height: 50px; overflow: auto;');
    // dnaber: commented out to calm down Mozilla validator - doesn't seem to be needed:
    //element.innerHTML = '<div style="width: 500px; height: 40px;">scrollable content</div>';
  }
};

var focusSummary = {
  element: 'details',
  mutate: function mutate(element) {
    // dnaber: commented out to calm down Mozilla validator - doesn't seem to be needed:
    //element.innerHTML = '<summary>foo</summary><p>content</p>';
    return element.firstElementChild;
  }
};

function makeFocusableForeignObject() {
  var fragment = document.createElement('div');
  // dnaber: commented out to calm down Mozilla validator - doesn't seem to be needed:
  //fragment.innerHTML = '<svg><foreignObject width="30" height="30">\n      <input type="text"/>\n  </foreignObject></svg>';

  return fragment.firstChild.firstChild;
}

var focusSvgForeignObjectHack = function focusSvgForeignObjectHack(element) {
  // Edge13, Edge14: foreignObject focus hack
  // https://jsbin.com/kunehinugi/edit?html,js,output
  // https://jsbin.com/fajagi/3/edit?html,js,output
  var isSvgElement = element.ownerSVGElement || element.nodeName.toLowerCase() === 'svg';
  if (!isSvgElement) {
    return false;
  }

  // inject and focus an <input> element into the SVG element to receive focus
  var foreignObject = makeFocusableForeignObject();
  element.appendChild(foreignObject);
  var input = foreignObject.querySelector('input');
  input.focus();

  // upon disabling the activeElement, IE and Edge
  // will not shift focus to <body> like all the other
  // browsers, but instead find the first focusable
  // ancestor and shift focus to that
  input.disabled = true;

  // clean up
  element.removeChild(foreignObject);
  return true;
};

function generate(element) {
  return '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' + element + '</svg>';
}

function focus(element) {
  if (element.focus) {
    return;
  }

  try {
    HTMLElement.prototype.focus.call(element);
  } catch (e) {
    focusSvgForeignObjectHack(element);
  }
}

function validate(element, focusTarget, _document) {
  focus(focusTarget);
  return _document.activeElement === focusTarget;
}

var focusSvgFocusableAttribute = {
  element: 'div',
  mutate: function mutate(element) {
    // dnaber: commented out to calm down Mozilla validator - doesn't seem to be needed:
    //element.innerHTML = generate('<text focusable="true">a</text>');
    return element.querySelector('text');
  },
  validate: validate
};

var focusSvgTabindexAttribute = {
  element: 'div',
  mutate: function mutate(element) {
    // dnaber: commented out to calm down Mozilla validator - doesn't seem to be needed:
    //element.innerHTML = generate('<text tabindex="0">a</text>');
    return element.querySelector('text');
  },
  validate: validate
};

var focusSvgNegativeTabindexAttribute = {
  element: 'div',
  mutate: function mutate(element) {
    // dnaber: commented out to calm down Mozilla validator - doesn't seem to be needed:
    //element.innerHTML = generate('<text tabindex="-1">a</text>');
    return element.querySelector('text');
  },
  validate: validate
};

var focusSvgUseTabindex = {
  element: 'div',
  mutate: function mutate(element) {
    // dnaber: commented out to calm down Mozilla validator - doesn't seem to be needed:
    //element.innerHTML = generate(['<g id="ally-test-target"><a xlink:href="#void"><text>link</text></a></g>', '<use xlink:href="#ally-test-target" x="0" y="0" tabindex="-1" />'].join(''));

    return element.querySelector('use');
  },
  validate: validate
};

var focusSvgForeignobjectTabindex = {
  element: 'div',
  mutate: function mutate(element) {
    // dnaber: commented out to calm down Mozilla validator - doesn't seem to be needed:
    //element.innerHTML = generate('<foreignObject tabindex="-1"><input type="text" /></foreignObject>');
    // Safari 8's quersSelector() can't identify foreignObject, but getElementyByTagName() can
    return element.querySelector('foreignObject') || element.getElementsByTagName('foreignObject')[0];
  },
  validate: validate

};

// Firefox seems to be handling the SVG-document-in-iframe creation asynchronously
// and thereby produces a false negative test result. Thus the test is pointless
// and we resort to UA sniffing once again.
// see http://jsbin.com/vunadohoko/1/edit?js,console,output

var result$2 = Boolean(platform.is.GECKO && typeof SVGElement !== 'undefined' && SVGElement.prototype.focus);

var focusSvgInIframe = function focusSvgInIframe() {
  return result$2;
};

var focusSvg = {
  element: 'div',
  mutate: function mutate(element) {
    // dnaber: commented out to calm down Mozilla validator - doesn't seem to be needed:
    //element.innerHTML = generate('');
    return element.firstChild;
  },
  validate: validate
};

// Firefox allows *any* value and treats invalid values like tabindex="-1"
// @browser-issue Gecko https://bugzilla.mozilla.org/show_bug.cgi?id=1128054
var focusTabindexTrailingCharacters = {
  element: 'div',
  mutate: function mutate(element) {
    element.setAttribute('tabindex', '3x');
  }
};

var focusTable = {
  element: 'table',
  mutate: function mutate(element, wrapper, _document) {
    // IE9 has a problem replacing TBODY contents with innerHTML.
    // https://stackoverflow.com/a/8097055/515124
    // element.innerHTML = '<tr><td>cell</td></tr>';
    var fragment = _document.createDocumentFragment();
    // dnaber: commented out to calm down Mozilla validator - doesn't seem to be needed:
    //fragment.innerHTML = '<tr><td>cell</td></tr>';
    element.appendChild(fragment);
  }
};

// export default 'data:video/mp4;base64,video-focus-test';

var focusVideoWithoutControls = {
  element: 'video',
  mutate: function mutate(element) {
    try {
      // invalid media file can trigger warning in console, data-uri to prevent HTTP request
      element.setAttribute('src', gif);
    } catch (e) {
      // IE9 may throw "Error: Not implemented"
    }
  }
};

// https://jsbin.com/vafaba/3/edit?html,js,console,output
var result$3 = platform.is.GECKO || platform.is.TRIDENT || platform.is.EDGE;

var tabsequenceAreaAtImgPosition = function tabsequenceAreaAtImgPosition() {
  return result$3;
};

var testCallbacks = {
  cssShadowPiercingDeepCombinator: cssShadowPiercingDeepCombinator,
  focusInZeroDimensionObject: focusInZeroDimensionObject,
  focusObjectSwf: focusObjectSwf,
  focusSvgInIframe: focusSvgInIframe,
  tabsequenceAreaAtImgPosition: tabsequenceAreaAtImgPosition
};

var testDescriptions = {
  focusAreaImgTabindex: focusAreaImgTabindex,
  focusAreaTabindex: focusAreaTabindex,
  focusAreaWithoutHref: focusAreaWithoutHref,
  focusAudioWithoutControls: focusAudioWithoutControls,
  focusBrokenImageMap: focusBrokenImageMap,
  focusChildrenOfFocusableFlexbox: focusChildrenOfFocusableFlexbox,
  focusFieldsetDisabled: focusFieldsetDisabled,
  focusFieldset: focusFieldset,
  focusFlexboxContainer: focusFlexboxContainer,
  focusFormDisabled: focusFormDisabled,
  focusImgIsmap: focusImgIsmap,
  focusImgUsemapTabindex: focusImgUsemapTabindex,
  focusInHiddenIframe: focusInHiddenIframe,
  focusInvalidTabindex: focusInvalidTabindex,
  focusLabelTabindex: focusLabelTabindex,
  focusObjectSvg: focusObjectSvg,
  focusObjectSvgHidden: focusObjectSvgHidden,
  focusRedirectImgUsemap: focusRedirectImgUsemap,
  focusRedirectLegend: focusRedirectLegend,
  focusScrollBody: focusScrollBody,
  focusScrollContainerWithoutOverflow: focusScrollContainerWithoutOverflow,
  focusScrollContainer: focusScrollContainer,
  focusSummary: focusSummary,
  focusSvgFocusableAttribute: focusSvgFocusableAttribute,
  focusSvgTabindexAttribute: focusSvgTabindexAttribute,
  focusSvgNegativeTabindexAttribute: focusSvgNegativeTabindexAttribute,
  focusSvgUseTabindex: focusSvgUseTabindex,
  focusSvgForeignobjectTabindex: focusSvgForeignobjectTabindex,
  focusSvg: focusSvg,
  focusTabindexTrailingCharacters: focusTabindexTrailingCharacters,
  focusTable: focusTable,
  focusVideoWithoutControls: focusVideoWithoutControls
};

function executeTests() {
  var results = detectFocus(testDescriptions);
  Object.keys(testCallbacks).forEach(function (key) {
    results[key] = testCallbacks[key]();
  });

  return results;
}

var supportsCache = null;

var _supports = function _supports() {
  if (supportsCache) {
    return supportsCache;
  }

  supportsCache = cache$1.get();
  if (!supportsCache.time) {
    cache$1.set(executeTests());
    supportsCache = cache$1.get();
  }

  return supportsCache;
};

// determine if an element's tabindex attribute has a valid value

var supports$1 = void 0;

// https://www.w3.org/TR/html5/infrastructure.html#rules-for-parsing-integers
// NOTE: all browsers agree to allow trailing spaces as well
var validIntegerPatternNoTrailing = /^\s*(-|\+)?[0-9]+\s*$/;
var validIntegerPatternWithTrailing = /^\s*(-|\+)?[0-9]+.*$/;

var validTabindex = function validTabindex(context) {
  if (!supports$1) {
    supports$1 = _supports();
  }

  var validIntegerPattern = supports$1.focusTabindexTrailingCharacters ? validIntegerPatternWithTrailing : validIntegerPatternNoTrailing;

  var element = contextToElement({
    label: 'is/valid-tabindex',
    resolveDocument: true,
    context: context
  });

  // Edge 14 has a capitalization problem on SVG elements,
  // see https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/9282058/
  var hasTabindex = element.hasAttribute('tabindex');
  var hasTabIndex = element.hasAttribute('tabIndex');

  if (!hasTabindex && !hasTabIndex) {
    return false;
  }

  // older Firefox and Internet Explorer don't support tabindex on SVG elements
  var isSvgElement = element.ownerSVGElement || element.nodeName.toLowerCase() === 'svg';
  if (isSvgElement && !supports$1.focusSvgTabindexAttribute) {
    return false;
  }

  // @browser-issue Gecko https://bugzilla.mozilla.org/show_bug.cgi?id=1128054
  if (supports$1.focusInvalidTabindex) {
    return true;
  }

  // an element matches the tabindex selector even if its value is invalid
  var tabindex = element.getAttribute(hasTabindex ? 'tabindex' : 'tabIndex');
  // IE11 parses tabindex="" as the value "-32768"
  // @browser-issue Trident https://connect.microsoft.com/IE/feedback/details/1072965
  if (tabindex === '-32768') {
    return false;
  }

  return Boolean(tabindex && validIntegerPattern.test(tabindex));
};

var tabindexValue = function tabindexValue(element) {
  if (!validTabindex(element)) {
    return null;
  }

  // Edge 14 has a capitalization problem on SVG elements,
  // see https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/9282058/
  var hasTabindex = element.hasAttribute('tabindex');
  var attributeName = hasTabindex ? 'tabindex' : 'tabIndex';

  // @browser-issue Gecko https://bugzilla.mozilla.org/show_bug.cgi?id=1128054
  var tabindex = parseInt(element.getAttribute(attributeName), 10);
  return isNaN(tabindex) ? -1 : tabindex;
};

// Determine if an element supports the disabled attribute

var supports$2 = void 0;

// https://www.w3.org/TR/html5/disabled-elements.html#concept-element-disabled
var disabledElementsPattern = void 0;
var disabledElements = {
  input: true,
  select: true,
  textarea: true,
  button: true,
  fieldset: true,
  form: true
};

var isNativeDisabledSupported = function isNativeDisabledSupported(context) {
  if (!supports$2) {
    supports$2 = _supports();

    if (supports$2.focusFieldsetDisabled) {
      delete disabledElements.fieldset;
    }

    if (supports$2.focusFormDisabled) {
      delete disabledElements.form;
    }

    disabledElementsPattern = new RegExp('^(' + Object.keys(disabledElements).join('|') + ')$');
  }

  var element = contextToElement({
    label: 'is/native-disabled-supported',
    context: context
  });

  var nodeName = element.nodeName.toLowerCase();
  return Boolean(disabledElementsPattern.test(nodeName));
};

// helper to turn
//  <div some-attribute="original">
// into
//  <div data-cached-some-attribute="original">
// and back

var toggleAttribute = function toggleAttribute(_ref3) {
  var element = _ref3.element,
      attribute = _ref3.attribute;

  var temporaryAttribute = 'data-cached-' + attribute;
  var temporaryAttributeValue = element.getAttribute(temporaryAttribute);

  if (temporaryAttributeValue === null) {
    var _value = element.getAttribute(attribute);
    if (_value === null) {
      // can't remove what's not there
      return;
    }

    element.setAttribute(temporaryAttribute, _value || '');
    element.removeAttribute(attribute);
  } else {
    var _value2 = element.getAttribute(temporaryAttribute);
    element.removeAttribute(temporaryAttribute);
    element.setAttribute(attribute, _value2);
  }
};

// helper to turn
//  <div some-attribute="original">
// into
//  <div some-attribute="new" data-cached-some-attribute="original">
// and back

var toggleAttributeValue = function toggleAttributeValue(_ref4) {
  var element = _ref4.element,
      attribute = _ref4.attribute,
      temporaryValue = _ref4.temporaryValue,
      saveValue = _ref4.saveValue;

  var temporaryAttribute = 'data-cached-' + attribute;

  if (temporaryValue !== undefined) {
    var _value = saveValue || element.getAttribute(attribute);
    element.setAttribute(temporaryAttribute, _value || '');
    element.setAttribute(attribute, temporaryValue);
  } else {
    var _value3 = element.getAttribute(temporaryAttribute);
    element.removeAttribute(temporaryAttribute);
    if (_value3 === '') {
      element.removeAttribute(attribute);
    } else {
      element.setAttribute(attribute, _value3);
    }
  }
};

var noop = function noop() {};
var _console = {
  log: noop,
  debug: noop,
  info: noop,
  warn: noop,
  error: noop
};

var logger = typeof console !== 'undefined' ? console : _console;

/*
  Utility to make any element inert (disabled). Inert means the elements cannot be interacted
  with and they cannot be focused via script, pointer or keyboard - and thus not receive focus.

  Elements made inert (disabled) by this utility are given the attribute [data-ally-disabled="true"].

  ---------------

  inert attribute was [removed](https://html5.org/r/8536) [tweet by steve](https://twitter.com/stevefaulkner/status/443075900201259008)
  but definition of [inert subtrees](https://www.w3.org/html/wg/drafts/html/master/editing.html#inert-subtrees) remains.

  [implementation idea by Vasilis](https://codepen.io/vasilisvg/pen/scowI)
  [inert attribute polyfill by GoogleChrome](https://github.com/GoogleChrome/inert-polyfill)

  [Gecko Bug: Inert Attribute](https://bugzilla.mozilla.org/show_bug.cgi?id=921504)
  [Chromium Bug: Inert Attribute](https://code.google.com/p/chromium/issues/detail?id=269846)
  [Chromium Bug: Inert Subtree](https://code.google.com/p/chromium/issues/detail?id=241699)
  [WebKit Bug: Inert Subtree](https://bugs.webkit.org/show_bug.cgi?id=110952)
*/

var supports = void 0;

function disabledFocus() {
  logger.warn('trying to focus inert element', this);
}

function disableTabindex(element, disabledState) {
  if (disabledState) {
    var tabIndex = tabindexValue(element);
    toggleAttributeValue({
      element: element,
      attribute: 'tabindex',
      temporaryValue: '-1',
      saveValue: tabIndex !== null ? tabIndex : ''
    });
  } else {
    toggleAttributeValue({
      element: element,
      attribute: 'tabindex'
    });
  }
}

function disableVideoControls(element, disabledState) {
  toggleAttribute({
    element: element,
    attribute: 'controls',
    remove: disabledState
  });
}

function disableSvgFocusable(element, disabledState) {
  toggleAttributeValue({
    element: element,
    attribute: 'focusable',
    temporaryValue: disabledState ? 'false' : undefined
  });
}

function disableSvgLink(element, disabledState) {
  toggleAttribute({
    element: element,
    attribute: 'xlink:href',
    remove: disabledState
  });
}

function setAriaDisabled(element, disabledState) {
  toggleAttributeValue({
    element: element,
    attribute: 'aria-disabled',
    temporaryValue: disabledState ? 'true' : undefined
  });
}

function disableScriptFocus(element, disabledState) {
  if (disabledState) {
    // make sure no script can focus the element
    element.focus = disabledFocus;
  } else {
    // restore original focus function from prototype
    delete element.focus;
  }
}

function disablePointerEvents(element, disabledState) {
  if (disabledState) {
    // remember previous pointer events status so we can restore it
    var pointerEvents = element.style.pointerEvents || '';
    element.setAttribute('data-inert-pointer-events', pointerEvents);
    // make sure no pointer interaction can access the element
    element.style.pointerEvents = 'none';
  } else {
    // restore to previous pointer interaction status
    var _pointerEvents = element.getAttribute('data-inert-pointer-events');
    element.removeAttribute('data-inert-pointer-events');
    element.style.pointerEvents = _pointerEvents;
  }
}

function setElementDisabled(element, disabledState) {
  setAriaDisabled(element, disabledState);
  disableTabindex(element, disabledState);
  disableScriptFocus(element, disabledState);
  disablePointerEvents(element, disabledState);

  var nodeName = element.nodeName.toLowerCase();
  if (nodeName === 'video' || nodeName === 'audio') {
    // Blink and Gecko leave <video controls tabindex="-1"> in document focus navigation sequence
    // Blink leaves <audio controls tabindex="-1"> in document focus navigation sequence
    disableVideoControls(element, disabledState);
  }

  if (nodeName === 'svg' || element.ownerSVGElement) {
    if (supports.focusSvgFocusableAttribute) {
      // Internet Explorer knows focusable="false" instead of tabindex="-1"
      disableSvgFocusable(element, disabledState);
    } else if (!supports.focusSvgTabindexAttribute && nodeName === 'a') {
      // Firefox neither knows focusable="false" nor tabindex="-1"
      disableSvgLink(element, disabledState);
    }
  }

  if (disabledState) {
    element.setAttribute('data-ally-disabled', 'true');
  } else {
    element.removeAttribute('data-ally-disabled');
  }
}

var elementDisabled = function elementDisabled(context, disabledState) {
  if (!supports) {
    supports = _supports();
  }

  var element = contextToElement({
    label: 'element/disabled',
    context: context
  });

  // accept truthy/falsy values
  disabledState = Boolean(disabledState);
  var currentState = element.hasAttribute('data-ally-disabled');
  // if there's no value to set, we're running as a getter
  var runningAsGetter = arguments.length === 1;

  if (isNativeDisabledSupported(element)) {
    if (runningAsGetter) {
      return element.disabled;
    }

    // form elements know the disabled attribute, which we shall use instead of our poor man's copy of it
    element.disabled = disabledState;
    return element;
  }

  if (runningAsGetter) {
    return currentState;
  }

  if (currentState === disabledState) {
    // no update necessary
    return element;
  }

  setElementDisabled(element, disabledState);
  return element;
};

// [elem, elem.parent, elem.parent.parent, …, html]
// will not contain the shadowRoot (DOCUMENT_FRAGMENT_NODE) and shadowHost
var getParents = function getParents() {
  var _ref5 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      context = _ref5.context;

  var list = [];
  var element = contextToElement({
    label: 'get/parents',
    context: context
  });

  while (element) {
    list.push(element);
    // IE does know support parentElement on SVGElement
    element = element.parentNode;
    if (element && element.nodeType !== Node.ELEMENT_NODE) {
      element = null;
    }
  }

  return list;
};

// Element.prototype.matches may be available at a different name
// https://developer.mozilla.org/en/docs/Web/API/Element/matches

var names = ['matches', 'webkitMatchesSelector', 'mozMatchesSelector', 'msMatchesSelector'];
var name = null;

function findMethodName(element) {
  names.some(function (_name) {
    if (!element[_name]) {
      return false;
    }

    name = _name;
    return true;
  });
}

function elementMatches(element, selector) {
  if (!name) {
    findMethodName(element);
  }

  return element[name](selector);
}

// this is a shared utility file for focus-relevant.js and tabbable.js
// separate testing of this file's functions is not necessary,
// as they're implicitly tested by way of the consumers

function isUserModifyWritable(style) {
  // https://www.w3.org/TR/1999/WD-css3-userint-19990916#user-modify
  // https://github.com/medialize/ally.js/issues/17
  var userModify = style.webkitUserModify || '';
  return Boolean(userModify && userModify.indexOf('write') !== -1);
}

function hasCssOverflowScroll(style) {
  return [style.getPropertyValue('overflow'), style.getPropertyValue('overflow-x'), style.getPropertyValue('overflow-y')].some(function (overflow) {
    return overflow === 'auto' || overflow === 'scroll';
  });
}

function hasCssDisplayFlex(style) {
  return style.display.indexOf('flex') > -1;
}

function isScrollableContainer(element, nodeName, parentNodeName, parentStyle) {
  if (nodeName !== 'div' && nodeName !== 'span') {
    // Internet Explorer advances scrollable containers and bodies to focusable
    // only if the scrollable container is <div> or <span> - this does *not*
    // happen for <section>, <article>, …
    return false;
  }

  if (parentNodeName && parentNodeName !== 'div' && parentNodeName !== 'span' && !hasCssOverflowScroll(parentStyle)) {
    return false;
  }

  return element.offsetHeight < element.scrollHeight || element.offsetWidth < element.scrollWidth;
}

// determine if an element supports.can be focused by script regardless
// of the element actually being focusable at the time of execution
// i.e. <input disabled> is conisdered focus-relevant, but not focusable

var supports$5 = void 0;

function isFocusRelevantRules() {
  var _ref6 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      context = _ref6.context,
      _ref6$except = _ref6.except,
      except = _ref6$except === undefined ? {
    flexbox: false,
    scrollable: false,
    shadow: false
  } : _ref6$except;

  if (!supports$5) {
    supports$5 = _supports();
  }

  var element = contextToElement({
    label: 'is/focus-relevant',
    resolveDocument: true,
    context: context
  });

  if (!except.shadow && element.shadowRoot) {
    // a ShadowDOM host receives focus when the focus moves to its content
    return true;
  }

  var nodeName = element.nodeName.toLowerCase();

  if (nodeName === 'input' && element.type === 'hidden') {
    // input[type="hidden"] supports.cannot be focused
    return false;
  }

  if (nodeName === 'input' || nodeName === 'select' || nodeName === 'button' || nodeName === 'textarea') {
    return true;
  }

  if (nodeName === 'legend' && supports$5.focusRedirectLegend) {
    // specifics filtered in is/focusable
    return true;
  }

  if (nodeName === 'label') {
    // specifics filtered in is/focusable
    return true;
  }

  if (nodeName === 'area') {
    // specifics filtered in is/focusable
    return true;
  }

  if (nodeName === 'a' && element.hasAttribute('href')) {
    return true;
  }

  if (nodeName === 'object' && element.hasAttribute('usemap')) {
    // object[usemap] is not focusable in any browser
    return false;
  }

  if (nodeName === 'object') {
    var svgType = element.getAttribute('type');
    if (!supports$5.focusObjectSvg && svgType === 'image/svg+xml') {
      // object[type="image/svg+xml"] is not focusable in Internet Explorer
      return false;
    } else if (!supports$5.focusObjectSwf && svgType === 'application/x-shockwave-flash') {
      // object[type="application/x-shockwave-flash"] is not focusable in Internet Explorer 9
      return false;
    }
  }

  if (nodeName === 'iframe' || nodeName === 'object') {
    // browsing context containers
    return true;
  }

  if (nodeName === 'embed' || nodeName === 'keygen') {
    // embed is considered focus-relevant but not focusable
    // see https://github.com/medialize/ally.js/issues/82
    return true;
  }

  if (element.hasAttribute('contenteditable')) {
    // also see CSS property user-modify below
    return true;
  }

  if (nodeName === 'audio' && (supports$5.focusAudioWithoutControls || element.hasAttribute('controls'))) {
    return true;
  }

  if (nodeName === 'video' && (supports$5.focusVideoWithoutControls || element.hasAttribute('controls'))) {
    return true;
  }

  if (supports$5.focusSummary && nodeName === 'summary') {
    return true;
  }

  var validTabindex$$1 = validTabindex(element);

  if (nodeName === 'img' && element.hasAttribute('usemap')) {
    // Gecko, Trident and Edge do not allow an image with an image map and tabindex to be focused,
    // it appears the tabindex is overruled so focus is still forwarded to the <map>
    return validTabindex$$1 && supports$5.focusImgUsemapTabindex || supports$5.focusRedirectImgUsemap;
  }

  if (supports$5.focusTable && (nodeName === 'table' || nodeName === 'td')) {
    // IE10-11 supports.can focus <table> and <td>
    return true;
  }

  if (supports$5.focusFieldset && nodeName === 'fieldset') {
    // IE10-11 supports.can focus <fieldset>
    return true;
  }

  var isSvgElement = nodeName === 'svg';
  var isSvgContent = element.ownerSVGElement;
  var focusableAttribute = element.getAttribute('focusable');
  var tabindex = tabindexValue(element);

  if (nodeName === 'use' && tabindex !== null && !supports$5.focusSvgUseTabindex) {
    // <use> cannot be made focusable by adding a tabindex attribute anywhere but Blink and WebKit
    return false;
  }

  if (nodeName === 'foreignobject') {
    // <use> can only be made focusable in Blink and WebKit
    return tabindex !== null && supports$5.focusSvgForeignobjectTabindex;
  }

  if (elementMatches(element, 'svg a') && element.hasAttribute('xlink:href')) {
    return true;
  }

  if ((isSvgElement || isSvgContent) && element.focus && !supports$5.focusSvgNegativeTabindexAttribute && tabindex < 0) {
    // Firefox 51 and 52 treat any natively tabbable SVG element with
    // tabindex="-1" as tabbable and everything else as inert
    // see https://bugzilla.mozilla.org/show_bug.cgi?id=1302340
    return false;
  }

  if (isSvgElement) {
    return validTabindex$$1 || supports$5.focusSvg || supports$5.focusSvgInIframe
    // Internet Explorer understands the focusable attribute introduced in SVG Tiny 1.2
    || Boolean(supports$5.focusSvgFocusableAttribute && focusableAttribute && focusableAttribute === 'true');
  }

  if (isSvgContent) {
    if (supports$5.focusSvgTabindexAttribute && validTabindex$$1) {
      return true;
    }

    if (supports$5.focusSvgFocusableAttribute) {
      // Internet Explorer understands the focusable attribute introduced in SVG Tiny 1.2
      return focusableAttribute === 'true';
    }
  }

  // https://www.w3.org/TR/html5/editing.html#sequential-focus-navigation-and-the-tabindex-attribute
  if (validTabindex$$1) {
    return true;
  }

  var style = window.getComputedStyle(element, null);
  if (isUserModifyWritable(style)) {
    return true;
  }

  if (supports$5.focusImgIsmap && nodeName === 'img' && element.hasAttribute('ismap')) {
    // IE10-11 considers the <img> in <a href><img ismap> focusable
    // https://github.com/medialize/ally.js/issues/20
    var hasLinkParent = getParents({ context: element }).some(function (parent) {
      return parent.nodeName.toLowerCase() === 'a' && parent.hasAttribute('href');
    });

    if (hasLinkParent) {
      return true;
    }
  }

  // https://github.com/medialize/ally.js/issues/21
  if (!except.scrollable && supports$5.focusScrollContainer) {
    if (supports$5.focusScrollContainerWithoutOverflow) {
      // Internet Explorer does will consider the scrollable area focusable
      // if the element is a <div> or a <span> and it is in fact scrollable,
      // regardless of the CSS overflow property
      if (isScrollableContainer(element, nodeName)) {
        return true;
      }
    } else if (hasCssOverflowScroll(style)) {
      // Firefox requires proper overflow setting, IE does not necessarily
      // https://developer.mozilla.org/en-US/docs/Web/CSS/overflow
      return true;
    }
  }

  if (!except.flexbox && supports$5.focusFlexboxContainer && hasCssDisplayFlex(style)) {
    // elements with display:flex are focusable in IE10-11
    return true;
  }

  var parent = element.parentElement;
  if (!except.scrollable && parent) {
    var parentNodeName = parent.nodeName.toLowerCase();
    var parentStyle = window.getComputedStyle(parent, null);
    if (supports$5.focusScrollBody && isScrollableContainer(parent, nodeName, parentNodeName, parentStyle)) {
      // scrollable bodies are focusable Internet Explorer
      // https://github.com/medialize/ally.js/issues/21
      return true;
    }

    // Children of focusable elements with display:flex are focusable in IE10-11
    if (supports$5.focusChildrenOfFocusableFlexbox) {
      if (hasCssDisplayFlex(parentStyle)) {
        return true;
      }
    }
  }

  // NOTE: elements marked as inert are not focusable,
  // but that property is not exposed to the DOM
  // https://www.w3.org/TR/html5/editing.html#inert

  return false;
}

// bind exceptions to an iterator callback
isFocusRelevantRules.except = function () {
  var except = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  var isFocusRelevant = function isFocusRelevant(context) {
    return isFocusRelevantRules({
      context: context,
      except: except
    });
  };

  isFocusRelevant.rules = isFocusRelevantRules;
  return isFocusRelevant;
};

// provide isFocusRelevant(context) as default iterator callback
var isFocusRelevant = isFocusRelevantRules.except({});

function findIndex(array, callback) {
  // attempt to use native or polyfilled Array#findIndex first
  if (array.findIndex) {
    return array.findIndex(callback);
  }

  var length = array.length;

  // shortcut if the array is empty
  if (length === 0) {
    return -1;
  }

  // otherwise loop over array
  for (var i = 0; i < length; i++) {
    if (callback(array[i], i, array)) {
      return i;
    }
  }

  return -1;
}

var getContentDocument = function getContentDocument(node) {
  try {
    // works on <object> and <iframe>
    return node.contentDocument
    // works on <object> and <iframe>
    || node.contentWindow && node.contentWindow.document
    // works on <object> and <iframe> that contain SVG
    || node.getSVGDocument && node.getSVGDocument() || null;
  } catch (e) {
    // SecurityError: Failed to read the 'contentDocument' property from 'HTMLObjectElement'
    // also IE may throw member not found exception e.g. on <object type="image/png">
    return null;
  }
};

// convert a CSS selector so that it also pierces ShadowDOM
// takes ".a, #b" and turns it into ".a, #b, html >>> .a, html >>> #b"

var shadowPrefix = void 0;

var selectInShadows = function selectInShadows(selector) {
  if (typeof shadowPrefix !== 'string') {
    var operator = cssShadowPiercingDeepCombinator();
    if (operator) {
      shadowPrefix = ', html ' + operator + ' ';
    }
  }

  if (!shadowPrefix) {
    return selector;
  }

  return selector + shadowPrefix + selector.replace(/\s*,\s*/g, ',').split(',').join(shadowPrefix);
};

var selector = void 0;

function findDocumentHostElement(_window) {
  if (!selector) {
    selector = selectInShadows('object, iframe');
  }

  if (_window._frameElement !== undefined) {
    return _window._frameElement;
  }

  _window._frameElement = null;

  var potentialHosts = _window.parent.document.querySelectorAll(selector);
  [].some.call(potentialHosts, function (element) {
    var _document = getContentDocument(element);
    if (_document !== _window.document) {
      return false;
    }

    _window._frameElement = element;
    return true;
  });

  return _window._frameElement;
}

function getFrameElement(element) {
  var _window = getWindow(element);
  if (!_window.parent || _window.parent === _window) {
    // if there is no parent browsing context,
    // we're not going to get a frameElement either way
    return null;
  }

  try {
    // see https://developer.mozilla.org/en-US/docs/Web/API/Window/frameElement
    // does not work within <embed> anywhere, and not within in <object> in IE
    return _window.frameElement || findDocumentHostElement(_window);
  } catch (e) {
    return null;
  }
}

// determine if an element is rendered
// NOTE: that does not mean an element is visible in the viewport, see util/visible-area

// https://www.w3.org/TR/html5/rendering.html#being-rendered
// <area> is not rendered, but we *consider* it visible to simplfiy this function's usage
var notRenderedElementsPattern = /^(area)$/;

function computedStyle(element, property) {
  return window.getComputedStyle(element, null).getPropertyValue(property);
}

function notDisplayed(_path) {
  return _path.some(function (element) {
    // display:none is not visible (optimized away at layout)
    return computedStyle(element, 'display') === 'none';
  });
}

function notVisible(_path) {
  // https://github.com/jquery/jquery-ui/blob/master/ui/core.js#L109-L114
  // NOTE: a nested element can reverse visibility:hidden|collapse by explicitly setting visibility:visible
  // NOTE: visibility can be ["", "visible", "hidden", "collapse"]
  var hidden = findIndex(_path, function (element) {
    var visibility = computedStyle(element, 'visibility');
    return visibility === 'hidden' || visibility === 'collapse';
  });

  if (hidden === -1) {
    // there is no hidden element
    return false;
  }

  var visible = findIndex(_path, function (element) {
    return computedStyle(element, 'visibility') === 'visible';
  });

  if (visible === -1) {
    // there is no visible element (but a hidden element)
    return true;
  }

  if (hidden < visible) {
    // there is a hidden element and it's closer than the first visible element
    return true;
  }

  // there may be a hidden element, but the closest element is visible
  return false;
}

function collapsedParent(_path) {
  var offset = 1;
  if (_path[0].nodeName.toLowerCase() === 'summary') {
    offset = 2;
  }

  return _path.slice(offset).some(function (element) {
    // "content children" of a closed details element are not visible
    return element.nodeName.toLowerCase() === 'details' && element.open === false;
  });
}

function isVisibleRules() {
  var _ref7 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      context = _ref7.context,
      _ref7$except = _ref7.except,
      except = _ref7$except === undefined ? {
    notRendered: false,
    cssDisplay: false,
    cssVisibility: false,
    detailsElement: false,
    browsingContext: false
  } : _ref7$except;

  var element = contextToElement({
    label: 'is/visible',
    resolveDocument: true,
    context: context
  });

  var nodeName = element.nodeName.toLowerCase();
  if (!except.notRendered && notRenderedElementsPattern.test(nodeName)) {
    return true;
  }

  var _path = getParents({ context: element });

  // in Internet Explorer <audio> has a default display: none, where others have display: inline
  // but IE allows focusing <audio style="display:none">, but not <div display:none><audio>
  // this is irrelevant to other browsers, as the controls attribute is required to make <audio> focusable
  var isAudioWithoutControls = nodeName === 'audio' && !element.hasAttribute('controls');
  if (!except.cssDisplay && notDisplayed(isAudioWithoutControls ? _path.slice(1) : _path)) {
    return false;
  }

  if (!except.cssVisibility && notVisible(_path)) {
    return false;
  }

  if (!except.detailsElement && collapsedParent(_path)) {
    return false;
  }

  if (!except.browsingContext) {
    // elements within a browsing context are affected by the
    // browsing context host element's visibility and tabindex
    var frameElement = getFrameElement(element);
    var _isVisible = isVisibleRules.except(except);
    if (frameElement && !_isVisible(frameElement)) {
      return false;
    }
  }

  return true;
}

// bind exceptions to an iterator callback
isVisibleRules.except = function () {
  var except = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  var isVisible = function isVisible(context) {
    return isVisibleRules({
      context: context,
      except: except
    });
  };

  isVisible.rules = isVisibleRules;
  return isVisible;
};

// provide isVisible(context) as default iterator callback
var isVisible = isVisibleRules.except({});

function getMapByName(name, _document) {
  // apparently getElementsByName() also considers id attribute in IE & opera
  // https://developer.mozilla.org/en-US/docs/Web/API/Document/getElementsByName
  var map = _document.querySelector('map[name="' + cssEscape(name) + '"]');
  return map || null;
}

function getMapOfImage(element) {
  var usemap = element.getAttribute('usemap');
  if (!usemap) {
    return null;
  }

  var _document = getDocument(element);
  return getMapByName(usemap.slice(1), _document);
}

function getImageOfArea(element) {
  var map = element.parentElement;

  if (!map.name || map.nodeName.toLowerCase() !== 'map') {
    return null;
  }

  // NOTE: image maps can also be applied to <object> with image content,
  // but no browser supports this at the moment

  // HTML5 specifies HTMLMapElement.images to be an HTMLCollection of all
  // <img> and <object> referencing the <map> element, but no browser implements this
  //   https://www.w3.org/TR/html5/embedded-content-0.html#the-map-element
  //   https://developer.mozilla.org/en-US/docs/Web/API/HTMLMapElement
  // the image must be valid and loaded for the map to take effect
  var _document = getDocument(element);
  return _document.querySelector('img[usemap="#' + cssEscape(map.name) + '"]') || null;
}

// determine if an <area> element is being properly used by and <img> via a <map>

var supports$6 = void 0;

// https://developer.mozilla.org/en-US/docs/Web/HTML/Element/map
// https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img#attr-usemap
// https://github.com/jquery/jquery-ui/blob/master/ui/core.js#L88-L107
var validArea = function validArea(context) {
  if (!supports$6) {
    supports$6 = _supports();
  }

  var element = contextToElement({
    label: 'is/valid-area',
    context: context
  });

  var nodeName = element.nodeName.toLowerCase();
  if (nodeName !== 'area') {
    return false;
  }

  var hasTabindex = element.hasAttribute('tabindex');
  if (!supports$6.focusAreaTabindex && hasTabindex) {
    // Blink and WebKit do not consider <area tabindex="-1" href="#void"> focusable
    return false;
  }

  var img = getImageOfArea(element);
  if (!img || !isVisible(img)) {
    return false;
  }

  // Firefox only allows fully loaded images to reference image maps
  // https://stereochro.me/ideas/detecting-broken-images-js
  if (!supports$6.focusBrokenImageMap && (!img.complete || !img.naturalHeight || img.offsetWidth <= 0 || img.offsetHeight <= 0)) {
    return false;
  }

  // Firefox supports.can focus area elements even if they don't have an href attribute
  if (!supports$6.focusAreaWithoutHref && !element.href) {
    // Internet explorer supports.can focus area elements without href if either
    // the area element or the image element has a tabindex attribute
    return supports$6.focusAreaTabindex && hasTabindex || supports$6.focusAreaImgTabindex && img.hasAttribute('tabindex');
  }

  // https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img#attr-usemap
  var childOfInteractive = getParents({ context: img }).slice(1).some(function (_element) {
    var name = _element.nodeName.toLowerCase();
    return name === 'button' || name === 'a';
  });

  if (childOfInteractive) {
    return false;
  }

  return true;
};

// Determine if an element is disabled (i.e. not editable)

var supports$7 = void 0;

function isDisabledFieldset(element) {
  var nodeName = element.nodeName.toLowerCase();
  return nodeName === 'fieldset' && element.disabled;
}

function isDisabledForm(element) {
  var nodeName = element.nodeName.toLowerCase();
  return nodeName === 'form' && element.disabled;
}

var disabled = function disabled(context) {
  if (!supports$7) {
    supports$7 = _supports();
  }

  var element = contextToElement({
    label: 'is/disabled',
    context: context
  });

  if (element.hasAttribute('data-ally-disabled')) {
    // treat ally's element/disabled like the DOM native element.disabled
    return true;
  }

  if (!isNativeDisabledSupported(element)) {
    // non-form elements do not support the disabled attribute
    return false;
  }

  if (element.disabled) {
    // the element itself is disabled
    return true;
  }

  var parents = getParents({ context: element });
  if (parents.some(isDisabledFieldset)) {
    // a parental <fieldset> is disabld and inherits the state onto this element
    return true;
  }

  if (!supports$7.focusFormDisabled && parents.some(isDisabledForm)) {
    // a parental <form> is disabld and inherits the state onto this element
    return true;
  }

  return false;
};

function isOnlyTabbableRules() {
  var _ref8 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      context = _ref8.context,
      _ref8$except = _ref8.except,
      except = _ref8$except === undefined ? {
    onlyFocusableBrowsingContext: false,
    visible: false
  } : _ref8$except;

  var element = contextToElement({
    label: 'is/only-tabbable',
    resolveDocument: true,
    context: context
  });

  if (!except.visible && !isVisible(element)) {
    return false;
  }

  if (!except.onlyFocusableBrowsingContext && (platform.is.GECKO || platform.is.TRIDENT || platform.is.EDGE)) {
    var frameElement = getFrameElement(element);
    if (frameElement) {
      if (tabindexValue(frameElement) < 0) {
        // iframe[tabindex="-1"] and object[tabindex="-1"] inherit the
        // tabbable demotion onto elements of their browsing contexts
        return false;
      }
    }
  }

  var nodeName = element.nodeName.toLowerCase();
  var tabindex = tabindexValue(element);

  if (nodeName === 'label' && platform.is.GECKO) {
    // Firefox cannot focus, but tab to: label[tabindex=0]
    return tabindex !== null && tabindex >= 0;
  }

  // SVG Elements were keyboard focusable but not script focusable before Firefox 51.
  // Firefox 51 added the focus management DOM API (.focus and .blur) to SVGElement,
  // see https://bugzilla.mozilla.org/show_bug.cgi?id=778654
  if (platform.is.GECKO && element.ownerSVGElement && !element.focus) {
    if (nodeName === 'a' && element.hasAttribute('xlink:href')) {
      // any focusable child of <svg> cannot be focused, but tabbed to
      if (platform.is.GECKO) {
        return true;
      }
    }
  }

  return false;
}

// bind exceptions to an iterator callback
isOnlyTabbableRules.except = function () {
  var except = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  var isOnlyTabbable = function isOnlyTabbable(context) {
    return isOnlyTabbableRules({
      context: context,
      except: except
    });
  };

  isOnlyTabbable.rules = isOnlyTabbableRules;
  return isOnlyTabbable;
};

// provide isOnlyTabbable(context) as default iterator callback
var isOnlyTabbable = isOnlyTabbableRules.except({});

// determine if an element can be focused

// https://www.w3.org/TR/html5/editing.html#focus-management

// NOTE: The following known issues exist:
//   Gecko: `svg a[xlink|href]` is not identified as focusable (because SVGElement.prototype.focus is missing)
//   Blink, WebKit: SVGElements that have been made focusable by adding a focus event listener are not identified as focusable

var supports$4 = void 0;

function isOnlyFocusRelevant(element) {
  var nodeName = element.nodeName.toLowerCase();
  if (nodeName === 'embed' || nodeName === 'keygen') {
    // embed is considered focus-relevant but not focusable
    // see https://github.com/medialize/ally.js/issues/82
    return true;
  }

  var _tabindex = tabindexValue(element);
  if (element.shadowRoot && _tabindex === null) {
    // ShadowDOM host elements *may* receive focus
    // even though they are not considered focuable
    return true;
  }

  if (nodeName === 'label') {
    // <label tabindex="0"> is only tabbable in Firefox, not script-focusable
    // there's no way to make an element focusable other than by adding a tabindex,
    // and focus behavior of the label element seems hard-wired to ignore tabindex
    // in some browsers (like Gecko, Blink and WebKit)
    return !supports$4.focusLabelTabindex || _tabindex === null;
  }

  if (nodeName === 'legend') {
    return _tabindex === null;
  }

  if (supports$4.focusSvgFocusableAttribute && (element.ownerSVGElement || nodeName === 'svg')) {
    // Internet Explorer understands the focusable attribute introduced in SVG Tiny 1.2
    var focusableAttribute = element.getAttribute('focusable');
    return focusableAttribute && focusableAttribute === 'false';
  }

  if (nodeName === 'img' && element.hasAttribute('usemap')) {
    // Gecko, Trident and Edge do not allow an image with an image map and tabindex to be focused,
    // it appears the tabindex is overruled so focus is still forwarded to the <map>
    return _tabindex === null || !supports$4.focusImgUsemapTabindex;
  }

  if (nodeName === 'area') {
    // all <area>s are considered relevant,
    // but only the valid <area>s are focusable
    return !validArea(element);
  }

  return false;
}

function isFocusableRules() {
  var _ref9 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      context = _ref9.context,
      _ref9$except = _ref9.except,
      except = _ref9$except === undefined ? {
    disabled: false,
    visible: false,
    onlyTabbable: false
  } : _ref9$except;

  if (!supports$4) {
    supports$4 = _supports();
  }

  var _isOnlyTabbable = isOnlyTabbable.rules.except({
    onlyFocusableBrowsingContext: true,
    visible: except.visible
  });

  var element = contextToElement({
    label: 'is/focusable',
    resolveDocument: true,
    context: context
  });

  var focusRelevant = isFocusRelevant.rules({
    context: element,
    except: except
  });

  if (!focusRelevant || isOnlyFocusRelevant(element)) {
    return false;
  }

  if (!except.disabled && disabled(element)) {
    return false;
  }

  if (!except.onlyTabbable && _isOnlyTabbable(element)) {
    // some elements may be keyboard focusable, but not script focusable
    return false;
  }

  // elements that are not rendered, cannot be focused
  if (!except.visible) {
    var visibilityOptions = {
      context: element,
      except: {}
    };

    if (supports$4.focusInHiddenIframe) {
      // WebKit and Blink can focus content in hidden <iframe> and <object>
      visibilityOptions.except.browsingContext = true;
    }

    if (supports$4.focusObjectSvgHidden) {
      // Blink allows focusing the object element, even if it has visibility: hidden;
      // @browser-issue Blink https://code.google.com/p/chromium/issues/detail?id=586191
      var _nodeName2 = element.nodeName.toLowerCase();
      if (_nodeName2 === 'object') {
        visibilityOptions.except.cssVisibility = true;
      }
    }

    if (!isVisible.rules(visibilityOptions)) {
      return false;
    }
  }

  var frameElement = getFrameElement(element);
  if (frameElement) {
    var _nodeName = frameElement.nodeName.toLowerCase();
    if (_nodeName === 'object' && !supports$4.focusInZeroDimensionObject) {
      if (!frameElement.offsetWidth || !frameElement.offsetHeight) {
        // WebKit can not focus content in <object> if it doesn't have dimensions
        return false;
      }
    }
  }

  var nodeName = element.nodeName.toLowerCase();
  if (nodeName === 'svg' && supports$4.focusSvgInIframe && !frameElement && element.getAttribute('tabindex') === null) {
    return false;
  }

  return true;
}

// bind exceptions to an iterator callback
isFocusableRules.except = function () {
  var except = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  var isFocusable = function isFocusable(context) {
    return isFocusableRules({
      context: context,
      except: except
    });
  };

  isFocusable.rules = isFocusableRules;
  return isFocusable;
};

// provide isFocusRelevant(context) as default iterator callback
var isFocusable = isFocusableRules.except({});

// https://www.w3.org/TR/html5/editing.html#focusable
// https://www.w3.org/WAI/PF/aria-practices/#keyboard

function createFilter(condition) {
  // see https://developer.mozilla.org/en-US/docs/Web/API/NodeFilter
  var filter = function filter(node) {
    if (node.shadowRoot) {
      // return ShadowRoot elements regardless of them being focusable,
      // so they can be walked recursively later
      return NodeFilter.FILTER_ACCEPT;
    }

    if (condition(node)) {
      // finds elements that could have been found by document.querySelectorAll()
      return NodeFilter.FILTER_ACCEPT;
    }

    return NodeFilter.FILTER_SKIP;
  };
  // IE requires a function, Browsers require {acceptNode: function}
  // see http://www.bennadel.com/blog/2607-finding-html-comment-nodes-in-the-dom-using-treewalker.htm
  filter.acceptNode = filter;
  return filter;
}

var PossiblyFocusableFilter = createFilter(isFocusRelevant);

function queryFocusableStrict() {
  var _ref10 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      context = _ref10.context,
      includeContext = _ref10.includeContext,
      includeOnlyTabbable = _ref10.includeOnlyTabbable,
      strategy = _ref10.strategy;

  if (!context) {
    context = document.documentElement;
  }

  var _isFocusable = isFocusable.rules.except({
    onlyTabbable: includeOnlyTabbable
  });

  var _document = getDocument(context);
  // see https://developer.mozilla.org/en-US/docs/Web/API/Document/createTreeWalker
  var walker = _document.createTreeWalker(
  // root element to start search in
  context,
  // element type filter
  NodeFilter.SHOW_ELEMENT,
  // custom NodeFilter filter
  strategy === 'all' ? PossiblyFocusableFilter : createFilter(_isFocusable),
  // deprecated, but IE requires it
  false);

  var list = [];

  while (walker.nextNode()) {
    if (walker.currentNode.shadowRoot) {
      if (_isFocusable(walker.currentNode)) {
        list.push(walker.currentNode);
      }

      list = list.concat(queryFocusableStrict({
        context: walker.currentNode.shadowRoot,
        includeOnlyTabbable: includeOnlyTabbable,
        strategy: strategy
      }));
    } else {
      list.push(walker.currentNode);
    }
  }

  // add context if requested and focusable
  if (includeContext) {
    if (strategy === 'all') {
      if (isFocusRelevant(context)) {
        list.unshift(context);
      }
    } else if (_isFocusable(context)) {
      list.unshift(context);
    }
  }

  return list;
}

// NOTE: this selector MUST *never* be used directly,
// always go through query/focusable or is/focusable.js
// there are too many edge cases that they could be covered in
// a simple CSS selector…

var supports$8 = void 0;

var selector$1 = void 0;

var selector$2 = function selector$2() {
  if (!supports$8) {
    supports$8 = _supports();
  }

  if (typeof selector$1 === 'string') {
    return selector$1;
  }

  // https://www.w3.org/TR/html5/editing.html#sequential-focus-navigation-and-the-tabindex-attribute
  selector$1 = ''
  // IE11 supports.can focus <table> and <td>
  + (supports$8.focusTable ? 'table, td,' : '')
  // IE11 supports.can focus <fieldset>
  + (supports$8.focusFieldset ? 'fieldset,' : '')
  // Namespace problems of [xlink:href] explained in https://stackoverflow.com/a/23047888/515124
  // svg a[*|href] does not match in IE9, but since we're filtering
  // through is/focusable we can include all <a> from SVG
  + 'svg a,'
  // may behave as 'svg, svg *,' in chrome as *every* svg element with a focus event listener is focusable
  // navigational elements
  + 'a[href],'
  // validity determined by is/valid-area.js
  + 'area[href],'
  // validity determined by is/disabled.js
  + 'input, select, textarea, button,'
  // browsing context containers
  + 'iframe, object, embed,'
  // interactive content
  + 'keygen,' + (supports$8.focusAudioWithoutControls ? 'audio,' : 'audio[controls],') + (supports$8.focusVideoWithoutControls ? 'video,' : 'video[controls],') + (supports$8.focusSummary ? 'summary,' : '')
  // validity determined by is/valid-tabindex.js
  + '[tabindex],'
  // editing hosts
  + '[contenteditable]';

  // where ShadowDOM is supported, we also want the shadowed focusable elements (via ">>>" or "/deep/")
  selector$1 = selectInShadows(selector$1);

  return selector$1;
};

// https://www.w3.org/TR/html5/editing.html#focusable
// https://www.w3.org/WAI/PF/aria-practices/#keyboard

function queryFocusableQuick() {
  var _ref11 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      context = _ref11.context,
      includeContext = _ref11.includeContext,
      includeOnlyTabbable = _ref11.includeOnlyTabbable;

  var _selector = selector$2();
  var elements = context.querySelectorAll(_selector);
  // the selector potentially matches more than really is focusable

  var _isFocusable = isFocusable.rules.except({
    onlyTabbable: includeOnlyTabbable
  });

  var result = [].filter.call(elements, _isFocusable);

  // add context if requested and focusable
  if (includeContext && _isFocusable(context)) {
    result.unshift(context);
  }

  return result;
}

// https://www.w3.org/TR/html5/editing.html#focusable
// https://www.w3.org/WAI/PF/aria-practices/#keyboard

var focusable = function focusable() {
  var _ref12 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      context = _ref12.context,
      includeContext = _ref12.includeContext,
      includeOnlyTabbable = _ref12.includeOnlyTabbable,
      _ref12$strategy = _ref12.strategy,
      strategy = _ref12$strategy === undefined ? 'quick' : _ref12$strategy;

  var element = contextToElement({
    label: 'query/focusable',
    resolveDocument: true,
    defaultToDocument: true,
    context: context
  });

  var options = {
    context: element,
    includeContext: includeContext,
    includeOnlyTabbable: includeOnlyTabbable,
    strategy: strategy
  };

  if (strategy === 'quick') {
    return queryFocusableQuick(options);
  } else if (strategy === 'strict' || strategy === 'all') {
    return queryFocusableStrict(options);
  }

  throw new TypeError('query/focusable requires option.strategy to be one of ["quick", "strict", "all"]');
};

// determine if an element can be focused by keyboard (i.e. is part of the document's sequential focus navigation order)

var supports$9 = void 0;

// Internet Explorer 11 considers fieldset, table, td focusable, but not tabbable
// Internet Explorer 11 considers body to have [tabindex=0], but does not allow tabbing to it
var focusableElementsPattern = /^(fieldset|table|td|body)$/;

function isTabbableRules() {
  var _ref13 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      context = _ref13.context,
      _ref13$except = _ref13.except,
      except = _ref13$except === undefined ? {
    flexbox: false,
    scrollable: false,
    shadow: false,
    visible: false,
    onlyTabbable: false
  } : _ref13$except;

  if (!supports$9) {
    supports$9 = _supports();
  }

  var element = contextToElement({
    label: 'is/tabbable',
    resolveDocument: true,
    context: context
  });

  if (platform.is.BLINK && platform.is.ANDROID && platform.majorVersion > 42) {
    // External keyboard support worked fine in CHrome 42, but stopped working in Chrome 45.
    // The on-screen keyboard does not provide a way to focus the next input element (like iOS does).
    // That leaves us with no option to advance focus by keyboard, ergo nothing is tabbable (keyboard focusable).
    return false;
  }

  var frameElement = getFrameElement(element);
  if (frameElement) {
    if (platform.is.WEBKIT && platform.is.IOS) {
      // iOS only does not consider anything from another browsing context keyboard focusable
      return false;
    }

    // iframe[tabindex="-1"] and object[tabindex="-1"] inherit the
    // tabbable demotion onto elements of their browsing contexts
    if (tabindexValue(frameElement) < 0) {
      return false;
    }

    if (!except.visible && (platform.is.BLINK || platform.is.WEBKIT) && !isVisible(frameElement)) {
      // Blink and WebKit consider elements in hidden browsing contexts focusable, but not tabbable
      return false;
    }

    // Webkit and Blink don't consider anything in <object> tabbable
    // Blink fixed that fixed in Chrome 54, Opera 41
    var frameNodeName = frameElement.nodeName.toLowerCase();
    if (frameNodeName === 'object') {
      var isFixedBlink = platform.name === 'Chrome' && platform.majorVersion >= 54 || platform.name === 'Opera' && platform.majorVersion >= 41;

      if (platform.is.WEBKIT || platform.is.BLINK && !isFixedBlink) {
        return false;
      }
    }
  }

  var nodeName = element.nodeName.toLowerCase();
  var _tabindex = tabindexValue(element);
  var tabindex = _tabindex === null ? null : _tabindex >= 0;

  if (platform.is.EDGE && platform.majorVersion >= 14 && frameElement && element.ownerSVGElement && _tabindex < 0) {
    // Edge 14+ considers <a xlink:href="…" tabindex="-1"> keyboard focusable
    // if the element is in a nested browsing context
    return true;
  }

  var hasTabbableTabindexOrNone = tabindex !== false;
  var hasTabbableTabindex = _tabindex !== null && _tabindex >= 0;

  // NOTE: Firefox 31 considers [contenteditable] to have [tabindex=-1], but allows tabbing to it
  // fixed in Firefox 40 the latest - https://bugzilla.mozilla.org/show_bug.cgi?id=1185657
  if (element.hasAttribute('contenteditable')) {
    // tabbing can still be disabled by explicitly providing [tabindex="-1"]
    return hasTabbableTabindexOrNone;
  }

  if (focusableElementsPattern.test(nodeName) && tabindex !== true) {
    return false;
  }

  if (platform.is.WEBKIT && platform.is.IOS) {
    // iOS only considers a hand full of elements tabbable (keyboard focusable)
    // this holds true even with external keyboards
    var potentiallyTabbable = nodeName === 'input' && element.type === 'text' || element.type === 'password' || nodeName === 'select' || nodeName === 'textarea' || element.hasAttribute('contenteditable');

    if (!potentiallyTabbable) {
      var _style = window.getComputedStyle(element, null);
      potentiallyTabbable = isUserModifyWritable(_style);
    }

    if (!potentiallyTabbable) {
      return false;
    }
  }

  if (nodeName === 'use' && _tabindex !== null) {
    if (platform.is.BLINK || platform.is.WEBKIT && platform.majorVersion === 9) {
      // In Chrome and Safari 9 the <use> element is keyboard focusable even for tabindex="-1"
      return true;
    }
  }

  if (elementMatches(element, 'svg a') && element.hasAttribute('xlink:href')) {
    if (hasTabbableTabindexOrNone) {
      // in Trident and Gecko SVGElement does not handle the tabIndex property properly
      return true;
    }

    if (element.focus && !supports$9.focusSvgNegativeTabindexAttribute) {
      // Firefox 51 and 52 treat any natively tabbable SVG element with
      // tabindex="-1" as tabbable and everything else as inert
      // see https://bugzilla.mozilla.org/show_bug.cgi?id=1302340
      return true;
    }
  }

  if (nodeName === 'svg' && supports$9.focusSvgInIframe && hasTabbableTabindexOrNone) {
    return true;
  }

  if (platform.is.TRIDENT || platform.is.EDGE) {
    if (nodeName === 'svg') {
      if (supports$9.focusSvg) {
        // older Internet Explorers consider <svg> keyboard focusable
        // unless they have focsable="false", but then they wouldn't
        // be focusable and thus not even reach this filter
        return true;
      }

      // elements that have [focusable] are automatically keyboard focusable regardless of the attribute's value
      return element.hasAttribute('focusable') || hasTabbableTabindex;
    }

    if (element.ownerSVGElement) {
      if (supports$9.focusSvgTabindexAttribute && hasTabbableTabindex) {
        return true;
      }

      // elements that have [focusable] are automatically keyboard focusable regardless of the attribute's value
      return element.hasAttribute('focusable');
    }
  }
  if (element.tabIndex === undefined) {
    return Boolean(except.onlyTabbable);
  }

  if (nodeName === 'audio') {
    if (!element.hasAttribute('controls')) {
      // In Internet Explorer the <audio> element is focusable, but not tabbable, and tabIndex property is wrong
      return false;
    } else if (platform.is.BLINK) {
      // In Chrome <audio controls tabindex="-1"> remains keyboard focusable
      return true;
    }
  }

  if (nodeName === 'video') {
    if (!element.hasAttribute('controls')) {
      if (platform.is.TRIDENT || platform.is.EDGE) {
        // In Internet Explorer and Edge the <video> element is focusable, but not tabbable, and tabIndex property is wrong
        return false;
      }
    } else if (platform.is.BLINK || platform.is.GECKO) {
      // In Chrome and Firefox <video controls tabindex="-1"> remains keyboard focusable
      return true;
    }
  }

  if (nodeName === 'object') {
    if (platform.is.BLINK || platform.is.WEBKIT) {
      // In all Blink and WebKit based browsers <embed> and <object> are never keyboard focusable, even with tabindex="0" set
      return false;
    }
  }

  if (nodeName === 'iframe') {
    // In Internet Explorer all iframes are only focusable
    // In WebKit, Blink and Gecko iframes may be tabbable depending on content.
    // Since we can't reliably investigate iframe documents because of the
    // SameOriginPolicy, we're declaring everything only focusable.
    return false;
  }

  if (!except.scrollable && platform.is.GECKO) {
    // Firefox considers scrollable containers keyboard focusable,
    // even though their tabIndex property is -1
    var _style2 = window.getComputedStyle(element, null);
    if (hasCssOverflowScroll(_style2)) {
      return hasTabbableTabindexOrNone;
    }
  }

  if (platform.is.TRIDENT || platform.is.EDGE) {
    // IE and Edge degrade <area> to script focusable, if the image
    // using the <map> has been given tabindex="-1"
    if (nodeName === 'area') {
      var img = getImageOfArea(element);
      if (img && tabindexValue(img) < 0) {
        return false;
      }
    }

    var _style3 = window.getComputedStyle(element, null);
    if (isUserModifyWritable(_style3)) {
      // prevent being swallowed by the overzealous isScrollableContainer() below
      return element.tabIndex >= 0;
    }

    if (!except.flexbox && hasCssDisplayFlex(_style3)) {
      if (_tabindex !== null) {
        return hasTabbableTabindex;
      }

      return isFocusRelevantWithoutFlexbox(element) && isTabbableWithoutFlexbox(element);
    }

    // IE considers scrollable containers script focusable only,
    // even though their tabIndex property is 0
    if (isScrollableContainer(element, nodeName)) {
      return false;
    }

    var parent = element.parentElement;
    if (parent) {
      var parentNodeName = parent.nodeName.toLowerCase();
      var parentStyle = window.getComputedStyle(parent, null);
      // IE considers scrollable bodies script focusable only,
      if (isScrollableContainer(parent, nodeName, parentNodeName, parentStyle)) {
        return false;
      }

      // Children of focusable elements with display:flex are focusable in IE10-11,
      // even though their tabIndex property suggests otherwise
      if (hasCssDisplayFlex(parentStyle)) {
        // value of tabindex takes precedence
        return hasTabbableTabindex;
      }
    }
  }

  // https://www.w3.org/WAI/PF/aria-practices/#focus_tabindex
  return element.tabIndex >= 0;
}

// bind exceptions to an iterator callback
isTabbableRules.except = function () {
  var except = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  var isTabbable = function isTabbable(context) {
    return isTabbableRules({
      context: context,
      except: except
    });
  };

  isTabbable.rules = isTabbableRules;
  return isTabbable;
};

var isFocusRelevantWithoutFlexbox = isFocusRelevant.rules.except({ flexbox: true });
var isTabbableWithoutFlexbox = isTabbableRules.except({ flexbox: true });

// provide isTabbable(context) as default iterator callback
var isTabbable = isTabbableRules.except({});

// https://www.w3.org/TR/html5/editing.html#sequential-focus-navigation-and-the-tabindex-attribute
// https://www.w3.org/WAI/PF/aria-practices/#keyboard

var queryTabbable = function queryTabbable() {
  var _ref14 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      context = _ref14.context,
      includeContext = _ref14.includeContext,
      includeOnlyTabbable = _ref14.includeOnlyTabbable,
      strategy = _ref14.strategy;

  var _isTabbable = isTabbable.rules.except({
    onlyTabbable: includeOnlyTabbable
  });

  return focusable({
    context: context,
    includeContext: includeContext,
    includeOnlyTabbable: includeOnlyTabbable,
    strategy: strategy
  }).filter(_isTabbable);
};

// sorts a list of elements according to their order in the DOM

function compareDomPosition(a, b) {
  return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
}

var sortDomOrder = function sortDomOrder(elements) {
  return elements.sort(compareDomPosition);
};

// sort a list of elements into another list of elements in DOM order

/*
  USAGE:
    mergeDomOrder({
      // DOM ordered array of elements to use as base of merge
      list: [],
      // unordered array of elements to merge into base list
      elements: [],
      // callback function to resolve an element
      resolveElement: function(element) {
        // return null to skip
        // return element to replace insertion
        // return [element1, element2, …] to replace insertion with multiple elements
        return element;
      },
    })
*/

function getFirstSuccessorOffset(list, target) {
  // find the first element that comes AFTER the target element
  return findIndex(list, function (element) {
    return target.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING;
  });
}

function findInsertionOffsets(list, elements, resolveElement) {
  // instead of mutating the elements list directly, remember position and map
  // to inject later, when we can do this more efficiently
  var insertions = [];
  elements.forEach(function (element) {
    var replace = true;
    var offset = list.indexOf(element);

    if (offset === -1) {
      // element is not in target list
      offset = getFirstSuccessorOffset(list, element);
      replace = false;
    }

    if (offset === -1) {
      // there is no successor in the tabsequence,
      // meaning the image must be the last element
      offset = list.length;
    }

    // allow the consumer to replace the injected element
    var injections = nodeArray(resolveElement ? resolveElement(element) : element);
    if (!injections.length) {
      // we can't inject zero elements
      return;
    }

    insertions.push({
      offset: offset,
      replace: replace,
      elements: injections
    });
  });

  return insertions;
}

function insertElementsAtOffsets(list, insertions) {
  // remember the number of elements we have already injected
  // so we account for the caused index offset
  var inserted = 0;
  // make sure that we insert the elements in sequence,
  // otherwise the offset compensation won't work
  insertions.sort(function (a, b) {
    return a.offset - b.offset;
  });
  insertions.forEach(function (insertion) {
    // array.splice has an annoying function signature :(
    var remove = insertion.replace ? 1 : 0;
    var args = [insertion.offset + inserted, remove].concat(insertion.elements);
    list.splice.apply(list, args);
    inserted += insertion.elements.length - remove;
  });
}

var mergeInDomOrder = function mergeInDomOrder() {
  var _ref15 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      list = _ref15.list,
      elements = _ref15.elements,
      resolveElement = _ref15.resolveElement;

  // operate on a copy so we don't mutate the original array
  var _list = list.slice(0);
  // make sure the elements we're injecting are provided in DOM order
  var _elements = nodeArray(elements).slice(0);
  sortDomOrder(_elements);
  // find the offsets within the target array (list) at which to inject
  // each individual element (from elements)
  var insertions = findInsertionOffsets(_list, _elements, resolveElement);
  // actually inject the elements into the target array at the identified positions
  insertElementsAtOffsets(_list, insertions);
  return _list;
};

var supports$3 = void 0;

function formControlElement(element) {
  var nodeName = element.nodeName.toLowerCase();
  return nodeName === 'input' || nodeName === 'textarea' || nodeName === 'select' || nodeName === 'button';
}

function resolveLabelElement(element, _document) {
  var forId = element.getAttribute('for');
  if (forId) {
    // <label for="…"> - referenced form control
    return _document.getElementById(forId);
  }

  // <label><input - nested form control
  return element.querySelector('input, select, textarea');
}

function resolveLegendWithinFieldset(element) {
  // Chrome: first focusable input/select/textarea/button within <fieldset>
  var fieldset = element.parentNode;
  var focusable$$1 = focusable({
    context: fieldset,
    strategy: 'strict'
  });

  return focusable$$1.filter(formControlElement)[0] || null;
}

function resolveLegendWithinDocument(element, _document) {
  // Firefox: *next* tabbable (in DOM order)
  var tabbable = queryTabbable({
    // Firefox apparently needs to query from the body element,
    // not the document, looking inside a dynamically written iframe
    context: _document.body,
    strategy: 'strict'
  });

  if (!tabbable.length) {
    return null;
  }

  // sort <legend> into the list of tabbable elements
  // so that we can identify the next element
  var merged = mergeInDomOrder({
    list: tabbable,
    elements: [element]
  });

  var offset = merged.indexOf(element);
  if (offset === merged.length - 1) {
    return null;
  }

  return merged[offset + 1];
}

function resolveLegendElement(element, _document) {
  // <legend> - first <input> in <fieldset>
  if (!supports$3.focusRedirectLegend) {
    return null;
  }

  // legend must be the first child of a <fieldset>
  var fieldset = element.parentNode;
  if (fieldset.nodeName.toLowerCase() !== 'fieldset') {
    return null;
  }

  if (supports$3.focusRedirectLegend === 'tabbable') {
    // Firefox goes for *next* tabbable (in DOM order)
    return resolveLegendWithinDocument(element, _document);
  }

  // Chrome goes for first focusable input/select/textarea/button within <fieldset>
  return resolveLegendWithinFieldset(element, _document);
}

function resolveImgElement(element) {
  if (!supports$3.focusRedirectImgUsemap) {
    return null;
  }

  // IE9-11: <img usemap="#…" src="…"> - first <area>
  var map = getMapOfImage(element);
  return map && map.querySelector('area') || null;
}

var focusRedirectTarget = function focusRedirectTarget() {
  var _ref16 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      context = _ref16.context,
      skipFocusable = _ref16.skipFocusable;

  if (!supports$3) {
    supports$3 = _supports();
  }

  var element = contextToElement({
    label: 'get/focus-redirect-target',
    context: context
  });

  if (!skipFocusable && isFocusable(element)) {
    return null;
  }

  var nodeName = element.nodeName.toLowerCase();
  var _document = getDocument(element);

  if (nodeName === 'label') {
    return resolveLabelElement(element, _document);
  }

  if (nodeName === 'legend') {
    return resolveLegendElement(element, _document);
  }

  if (nodeName === 'img') {
    return resolveImgElement(element, _document);
  }

  return null;
};

/*
  Identify the first focusable element in the element's ancestry, including itself
*/

var focusTarget = function focusTarget() {
  var _ref17 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      context = _ref17.context,
      except = _ref17.except;

  var element = contextToElement({
    label: 'get/focus-target',
    context: context
  });

  var result = null;
  var getTarget = function getTarget(_element) {
    var focusable = isFocusable.rules({
      context: _element,
      except: except
    });

    if (focusable) {
      result = _element;
      return true;
    }

    result = focusRedirectTarget({
      context: _element,
      skipFocusable: true
    });

    return Boolean(result);
  };

  if (getTarget(element)) {
    return result;
  }

  getParents({ context: element }).slice(1).some(getTarget);
  return result;
};

function collectScrollPositions(element) {
  var parents = getParents({ context: element });
  var list = parents.slice(1).map(function (element) {
    return {
      element: element,
      scrollTop: element.scrollTop,
      scrollLeft: element.scrollLeft
    };
  });

  return function resetScrollPositions() {
    list.forEach(function (entry) {
      entry.element.scrollTop = entry.scrollTop;
      entry.element.scrollLeft = entry.scrollLeft;
    });
  };
}

// wrapper for HTMLElement.prototype.focus

function focus$1(element) {
  if (element.focus) {
    element.focus();
    return isActiveElement(element) ? element : null;
  }

  var _window = getWindow(element);

  try {
    // The element itself does not have a focus method.
    // This is true for SVG elements in Firefox and IE,
    // as well as MathML elements in every browser.
    // IE9 - 11 will let us abuse HTMLElement's focus method,
    // Firefox and Edge will throw an error.
    _window.HTMLElement.prototype.focus.call(element);
    return isActiveElement(element) ? element : null;
  } catch (e) {
    var actionPerformed = focusSvgForeignObjectHack(element);
    return actionPerformed && isActiveElement(element) ? element : null;
  }
}

var except = {
  // exclude elements affected by the IE flexbox bug
  flexbox: true,
  // exclude overflowing elements that are not intentionally
  // made focusable by adding a tabindex attribute
  scrollable: true,
  // include elements that don't have a focus() method
  onlyTabbable: true
};

var focus$2 = function focus$2(context) {
  var _ref18 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
      defaultToAncestor = _ref18.defaultToAncestor,
      undoScrolling = _ref18.undoScrolling;

  var element = contextToElement({
    label: 'element/focus',
    context: context
  });

  var targetIsFocusable = isFocusable.rules({
    context: element,
    except: except
  });

  if (!defaultToAncestor && !targetIsFocusable) {
    return null;
  }

  var target = focusTarget({
    context: element,
    except: except
  });

  if (!target) {
    return null;
  }

  if (isActiveElement(target)) {
    return target;
  }

  var _undoScrolling = void 0;
  if (undoScrolling) {
    _undoScrolling = collectScrollPositions(target);
  }

  var result = focus$1(target);

  _undoScrolling && _undoScrolling();

  return result;
};

// exporting modules to be included the UMD bundle

var element = {
  blur: blur,
  disabled: elementDisabled,
  focus: focus$2
};

// Polyfill requestAnimationFrame for oldIE
// adapted from https://gist.github.com/paulirish/1579671
// requestAnimationFrame polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel
// original source was published under the MIT license
// https://paulirish.com/2011/requestanimationframe-for-smart-animating/
// http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating

typeof window !== 'undefined' && function () {
  var lastTime = 0;
  var vendors = ['ms', 'moz', 'webkit', 'o'];
  var requestAnimationFrameName = '';
  var cancelAnimationFrameName = '';

  for (var x = 0, length = vendors.length; x < length; ++x) {
    requestAnimationFrameName = window[vendors[x] + 'RequestAnimationFrame'];
    cancelAnimationFrameName = window[vendors[x] + 'CancelAnimationFrame'] || window[vendors[x] + 'CancelRequestAnimationFrame'];
  }

  if (typeof window.requestAnimationFrame !== 'function') {
    window.requestAnimationFrame = window[requestAnimationFrameName] || function (callback) {
      var currTime = new Date().getTime();
      var timeToCall = Math.max(0, 16 - (currTime - lastTime));
      var id = window.setTimeout(function () {
        callback(currTime + timeToCall);
      }, timeToCall);

      lastTime = currTime + timeToCall;
      return id;
    };
  }

  if (typeof window.cancelAnimationFrame !== 'function') {
    window.cancelAnimationFrame = window[cancelAnimationFrameName] || function (id) {
      clearTimeout(id);
    };
  }
}();

// Polyfill originally copied from https://developer.mozilla.org/en/docs/Web/API/CustomEvent#Polyfill
// and rewritten to *not* pollute global space because of CustomEvent being an object Internet Explorer 11
// https://msdn.microsoft.com/en-us/library/ff974338(v=vs.85).aspx

var _CustomEvent = typeof window !== 'undefined' && window.CustomEvent || function () {};

if (typeof _CustomEvent !== 'function') {
  _CustomEvent = function CustomEventPolyfill(event, params) {
    var evt = document.createEvent('CustomEvent');

    !params && (params = {
      bubbles: false,
      cancelable: false,
      detail: undefined
    });

    evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
    return evt;
  };

  _CustomEvent.prototype = window.Event.prototype;
}

var CustomEvent$1 = _CustomEvent;

/*
  The Singleton Decorator is intended to allow modules to initialize a ("singleton") component as if
  it was the only one using it. Every module gets to initialize and destruct the component by itself.
  Via simple reference counting the component keeps track of how many modules have initialized it,
  so it destructs only when the last module is gone. This decorator hides the component's singleton
  nature from the application in order to offer a homogenous API.

  engage() can return an object (result) with methods to expose to the consumer,
  upon initialization result.disengage is added and returned to the consumer.
*/

function destruct() {
  var _ref19 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      force = _ref19.force;

  if (force) {
    this.instances = 0;
  } else {
    this.instances--;
  }

  if (!this.instances) {
    this.disengage();
    this._result = null;
  }
}

function initialize() {
  if (this.instances) {
    this.instances++;
    return this._result;
  }

  this.instances++;
  this._result = this.engage() || {};
  this._result.disengage = destruct.bind(this);

  return this._result;
}

function noop$1() {}

var decorateService = function decorateService() {
  var _ref20 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      engage = _ref20.engage,
      disengage = _ref20.disengage;

  var data = {
    engage: engage || noop$1,
    disengage: disengage || noop$1,
    instances: 0,
    _result: null
  };

  return initialize.bind(data);
};

/*
  Debugging tool that observe changes to activeElement regardless of focus/blur events.
  This utility does *not* work with ShadowDOM.

  USAGE:
    engage();
    document.body.addEventListener('active-element', function(event) {
      // event.detail.focus: element that received focus
      // event.detail.blur: element that lost focus
    }, false);

  NOTE: You *can* use event-delegation on focus events by using the capture-phase:
    document.body.addEventListener('focus', function(event) {
      // event.target: element that received focus
      // event.relatedTarget: element that lost focus
    }, true);
*/

var previousActiveElement = void 0;
var raf = void 0;

function observeActiveElement() {
  if (!document.activeElement) {
    // IE10 does not redirect focus to <body> when the activeElement is removed
    document.body.focus();
  } else if (document.activeElement !== previousActiveElement) {
    // https://developer.mozilla.org/en/docs/Web/API/CustomEvent
    var activeElementEvent = new CustomEvent$1('active-element', {
      bubbles: false,
      cancelable: false,
      detail: {
        focus: document.activeElement,
        blur: previousActiveElement
      }
    });

    document.dispatchEvent(activeElementEvent);
    previousActiveElement = document.activeElement;
  }

  if (raf === false) {
    return;
  }

  raf = requestAnimationFrame(observeActiveElement);
}

function engage() {
  raf = true;
  previousActiveElement = document.activeElement;
  observeActiveElement();
}

function disengage() {
  cancelAnimationFrame(raf);
  raf = false;
}

var activeElement = decorateService({ engage: engage, disengage: disengage });

// determine if an element is the child of a ShadowRoot

var shadowed = function shadowed(context) {
  var element = contextToElement({
    label: 'is/shadowed',
    resolveDocument: true,
    context: context
  });

  return Boolean(getShadowHost({ context: element }));
};

var shadowHostParents = function shadowHostParents() {
  var _ref21 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      context = _ref21.context;

  var list = [];
  var element = contextToElement({
    label: 'get/shadow-host-parents',
    context: context
  });

  while (element) {
    element = getShadowHost({ context: element });
    if (!element) {
      break;
    }

    list.push(element);
  }

  return list;
};

// [0] always is the actual active element (even within web-components)
// [0+n] is the hierarchy of shadow-doms with [length -1] being the top most shadow-host

function walkToShadowedElement() {
  var list = [document.activeElement];

  while (list[0] && list[0].shadowRoot) {
    list.unshift(list[0].shadowRoot.activeElement);
  }

  return list;
}

function walkFromShadowedElement() {
  var hosts = shadowHostParents({ context: document.activeElement });
  return [document.activeElement].concat(hosts);
}

var getActiveElements = function getActiveElements() {
  if (document.activeElement === null) {
    // IE10 does not redirect focus to <body> when the activeElement is removed
    document.body.focus();
  }

  // Firefox currently leaks the shadowed element
  // @browser-issue Gecko https://bugzilla.mozilla.org/show_bug.cgi?id=1117535
  if (shadowed(document.activeElement)) {
    return walkFromShadowedElement();
  }

  return walkToShadowedElement();
};

/*
  Utility to observe focus changes within ShadowDOMs.

  USAGE:
    engage();
    document.body.addEventListener('shadow-focus', function(event) {
      // event.detail.elements: complete focus ancestry (array of nodes)
      // event.detail.active: the actually focused element within the ShadowDOM
      // event.detail.hosts: the shadow host ancestry of the active element
    }, false);

  Alternate implementation: https://github.com/cdata/focus-observer
*/

var engage$1 = void 0;
var disengage$1 = void 0;

if (typeof document === 'undefined' || !document.documentElement.createShadowRoot) {
  // no need to initialize any of this if we don't have ShadowDOM available
  engage$1 = disengage$1 = function disengage$1() {};
} else {
  var _blurTimer = void 0;
  var blurElement = void 0;

  var handleElementBlurEvent = function handleElementBlurEvent() {
    stopHandleElementBlurEvent();
    // abort any handlers that come from document blur handler
    (window.clearImmediate || window.clearTimeout)(_blurTimer);
    _blurTimer = (window.setImmediate || window.setTimeout)(function () {
      handleFocusChange();
    });
  };

  var observeElementBlurEvent = function observeElementBlurEvent(element) {
    // call us when we're leaving the element
    element.addEventListener('blur', handleElementBlurEvent, true);
    blurElement = element;
  };

  var stopHandleElementBlurEvent = function stopHandleElementBlurEvent() {
    // once() - sometimes I miss jQuery's simplicity…
    blurElement && blurElement.removeEventListener('blur', handleElementBlurEvent, true);
    blurElement = null;
  };

  var handleFocusChange = function handleFocusChange() {
    var _active = getActiveElements();
    if (_active.length === 1) {
      stopHandleElementBlurEvent();
      return;
    }

    // listen for blur so we know when to re-validate
    observeElementBlurEvent(_active[0]);
    var shadowFocusEvent = new CustomEvent('shadow-focus', {
      bubbles: false,
      cancelable: false,
      detail: {
        // complete focus ancestry
        elements: _active,
        // the actually focused element
        active: _active[0],
        // shadow host ancestry
        hosts: _active.slice(1)
      }
    });

    document.dispatchEvent(shadowFocusEvent);
  };

  var _handleDocumentFocusEvent = function _handleDocumentFocusEvent() {
    (window.clearImmediate || window.clearTimeout)(_blurTimer);
    handleFocusChange();
  };

  engage$1 = function engage$1() {
    document.addEventListener('focus', _handleDocumentFocusEvent, true);
  };

  disengage$1 = function disengage$1() {
    (window.clearImmediate || window.clearTimeout)(_blurTimer);
    blurElement && blurElement.removeEventListener('blur', handleElementBlurEvent, true);
    document.removeEventListener('focus', _handleDocumentFocusEvent, true);
  };
}

var shadowFocus = decorateService({ engage: engage$1, disengage: disengage$1 });

// exporting modules to be included the UMD bundle

var event = {
  activeElement: activeElement,
  shadowFocus: shadowFocus
};

/*
  The Context Decorator is intended to allow modules to easily map dis/engage methods to the general
  dis/engage and context API format
*/

function destruct$1() /* {force: false} */{
  if (!this.context) {
    return;
  }

  this.context.forEach(this.disengage);
  this.context = null;
  this.engage = null;
  this.disengage = null;
}

function initialize$1() {
  var _ref22 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      context = _ref22.context;

  this.context = nodeArray(context || document);
  this.context.forEach(this.engage);
  return {
    disengage: destruct$1.bind(this)
  };
}

function noop$2() {}

var decorateContext = function decorateContext() {
  var _ref23 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      engage = _ref23.engage,
      disengage = _ref23.disengage;

  var data = {
    engage: engage || noop$2,
    disengage: disengage || noop$2,
    context: null
  };

  return initialize$1.bind(data);
};

/*
  Children of focusable elements with display:flex are focusable.
  Because focus can be given to focusable (not tabbable) elements
  by mouse, we have to counter this behavior, so the correct element
  becomes the activeElement (i.e. receives focus).

  Example:
    <div tabindex="-1" style="display:flex">
      <span>I would receive focus</span>
    </div>

  This (wrong) behavior was observed in Internet Explorer 10 and 11.
  It is fixed in IE12 (Win10 IE Tec Preview)
*/

var engage$2 = void 0;
var disengage$2 = void 0;
// This fix is only relevant to IE10 (Trident/6) and IE11 (Trident/7)
var relevantToCurrentBrowser = platform.is.TRIDENT && (platform.is.IE10 || platform.is.IE11);

if (!relevantToCurrentBrowser) {
  engage$2 = function engage$2() {};
} else {
  var handleBeforeFocusEvent = function handleBeforeFocusEvent(event) {
    // find the element that would receive focus
    var target = focusTarget({
      context: event.target,
      except: {
        flexbox: true,
        scrollable: true
      }
    });

    if (!target || target === event.target) {
      // there's nothing to focus, or we're focusing the element clicked on
      return;
    }

    window.setImmediate(function () {
      target.focus();
    });

    // hide all children, because hidden elements can't get focus
    // remember previous element style (not necessarily computed style)
    // to undo hiding later. Reset transitions as well, in case visibility
    // is to be transitioned. This will effectively kill all transitions
    // that are executed on mousedown / :active
    var reverse = [].map.call(target.children, function (element) {
      var visibility = element.style.visibility || '';
      var transition = element.style.transition || '';
      element.style.visibility = 'hidden';
      element.style.transition = 'none';
      return [element, visibility, transition];
    });

    // add cleanup (undo hide) to the RunLoop
    window.setImmediate(function () {
      reverse.forEach(function (item) {
        item[0].style.visibility = item[1];
        item[0].style.transition = item[2];
      });
    });
  };

  engage$2 = function engage$2(element) {
    // WebDriver does not reliably dispatch PointerEvents so we'll go with
    // mousedown, which shouldn't be a problem since we're targeting the
    // focus handling which immediately follows mousedown.
    element.addEventListener('mousedown', handleBeforeFocusEvent, true);
  };

  disengage$2 = function disengage$2(element) {
    element.removeEventListener('mousedown', handleBeforeFocusEvent, true);
  };
}

var pointerFocusChildren = decorateContext({ engage: engage$2, disengage: disengage$2 });

/*
  Clicking on form field does not necessarily assign it focus in Safari and Firefox on Mac OS X.
  While not a browser bug, it may be considered undesired behavior.

  https://bugs.webkit.org/show_bug.cgi?id=22261
  https://bugs.webkit.org/show_bug.cgi?id=118043

  Note: This behavior can be turned off in Firefox by changing the
  option `accessibility.mouse_focuses_formcontrol` in about:config
*/

var engage$3 = void 0;
var disengage$3 = void 0;
// This fix is only relevant to Safari and Firefox on OSX
var relevantToCurrentBrowser$1 = platform.is.OSX && (platform.is.GECKO || platform.is.WEBKIT);

if (!relevantToCurrentBrowser$1) {
  engage$3 = function engage$3() {};
} else {
  var handleMouseDownEvent = function handleMouseDownEvent(event) {
    if (event.defaultPrevented || !elementMatches(event.target, 'input, button, button *')) {
      // abort if the mousedown event was cancelled,
      // or we're not dealing with an affected form control
      return;
    }

    var target = focusTarget({
      context: event.target
    });

    // we need to set focus AFTER the mousedown finished, otherwise WebKit will ignore the call
    (window.setImmediate || window.setTimeout)(function () {
      target.focus();
    });
  };

  var handleMouseUpEvent = function handleMouseUpEvent(event) {
    if (event.defaultPrevented || !elementMatches(event.target, 'label, label *')) {
      // abort if the mouseup event was cancelled,
      // or we're not dealing with a <label>
      return;
    }

    var target = focusTarget({
      context: event.target
    });

    if (!target) {
      return;
    }

    target.focus();
  };

  engage$3 = function engage$3(element) {
    element.addEventListener('mousedown', handleMouseDownEvent, false);
    // <label> elements redirect focus upon mouseup, not mousedown
    element.addEventListener('mouseup', handleMouseUpEvent, false);
  };

  disengage$3 = function disengage$3(element) {
    element.removeEventListener('mousedown', handleMouseDownEvent, false);
    element.removeEventListener('mouseup', handleMouseUpEvent, false);
  };
}

var pointerFocusInput = decorateContext({ engage: engage$3, disengage: disengage$3 });

/*
  Clicking on a link that has a focusable element in its ancestry [tabindex="-1"],
  can lead to that parental element gaining focus, instead of the link.

  Example:
    <div tabindex="-1">
      <a href="#foo">click me</a>
    </div>

  This (wrong) behavior was observed in Chrome 38, iOS8, Safari 6.2, WebKit r175131
  It is not a problem in Firefox 33, Internet Explorer 11, Chrome 39.
*/

var engage$4 = void 0;
var disengage$4 = void 0;
// This fix is only relevant to WebKit
var relevantToCurrentBrowser$2 = platform.is.WEBKIT;

if (!relevantToCurrentBrowser$2) {
  engage$4 = function engage$4() {};
} else {
  // add [tabindex="0"] to the (focusable) element that is about to be clicked
  // if it does not already have an explicit tabindex (attribute).
  // By applying an explicit tabindex, WebKit will not go look for
  // the first valid tabindex in the element's parents.
  var _handleBeforeFocusEvent = function _handleBeforeFocusEvent(event) {
    // find the element that would receive focus
    var target = focusTarget({ context: event.target });
    if (!target || target.hasAttribute('tabindex') && validTabindex(target)) {
      // there's nothing to focus, or the element already has tabindex, we're good
      return;
    }

    // assign explicit tabindex, as implicit tabindex is the problem
    target.setAttribute('tabindex', 0);

    // add cleanup to the RunLoop
    (window.setImmediate || window.setTimeout)(function () {
      target.removeAttribute('tabindex');
    }, 0);
  };

  engage$4 = function engage$4(element) {
    element.addEventListener('mousedown', _handleBeforeFocusEvent, true);
    element.addEventListener('touchstart', _handleBeforeFocusEvent, true);
  };

  disengage$4 = function disengage$4(element) {
    element.removeEventListener('mousedown', _handleBeforeFocusEvent, true);
    element.removeEventListener('touchstart', _handleBeforeFocusEvent, true);
  };
}

var pointerFocusParent = decorateContext({ engage: engage$4, disengage: disengage$4 });

// exporting modules to be included the UMD bundle

var fix = {
  pointerFocusChildren: pointerFocusChildren,
  pointerFocusInput: pointerFocusInput,
  pointerFocusParent: pointerFocusParent
};

/*
  create ally.get.activeElement()
    wrapping ally.get.activeElements()

  fix ally.get.activeElements()
    https://github.com/jquery/jquery-ui/blob/ffcfb85c9818954adda69e73cf9ba76ea07b554c/ui/safe-active-element.js
*/

var activeElement$1 = function activeElement$1() {
  var _ref24 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      context = _ref24.context;

  var _document = getDocument(context);
  var activeElement = void 0;

  try {
    // IE9 throws an "Unspecified error" accessing document.activeElement from an <iframe>
    // see https://github.com/jquery/jquery-ui/blob/ffcfb85c9818954adda69e73cf9ba76ea07b554c/ui/safe-active-element.js#L15-L21
    activeElement = _document.activeElement;
  } catch (e) {}
  // ignore


  // IE11 may return null instead of an element
  // see https://github.com/jquery/jquery-ui/blob/ffcfb85c9818954adda69e73cf9ba76ea07b554c/ui/safe-active-element.js#L23-L28
  // https://github.com/jquery/jquery-ui/blob/ffcfb85c9818954adda69e73cf9ba76ea07b554c/ui/safe-active-element.js#L30-L35
  if (!activeElement || !activeElement.nodeType) {
    activeElement = _document.body || _document.documentElement;
  }

  return activeElement;
};

// Node.compareDocumentPosition is available since IE9
// see https://developer.mozilla.org/en-US/docs/Web/API/Node.compareDocumentPosition

// callback returns true when element is contained by parent or is the parent suited for use with Array.some()
/*
  USAGE:
    var isChildOf = getParentComparator({parent: someNode});
    listOfElements.some(isChildOf)
*/

function getParentComparator() {
  var _ref25 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      parent = _ref25.parent,
      element = _ref25.element,
      includeSelf = _ref25.includeSelf;

  if (parent) {
    return function isChildOf(node) {
      return Boolean(includeSelf && node === parent || parent.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_CONTAINED_BY);
    };
  } else if (element) {
    return function isParentOf(node) {
      return Boolean(includeSelf && element === node || node.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_CONTAINED_BY);
    };
  }

  throw new TypeError('util/compare-position#getParentComparator required either options.parent or options.element');
}

// find all highest elements within context that do not contain any of the filter elements.
// (basically the tree minus the parent paths of each filtered element reduced to the top most nodes)
// originally inspired by Marcy Sutton's Material Dialog Component:
// https://github.com/angular/material/blob/v0.11.1/src/components/dialog/dialog.js#L748-L783
// to avoid this behavior: https://marcysutton.com/slides/mobile-a11y-seattlejs/#/36

function queryInsignificantBranches(_ref26) {
  var context = _ref26.context,
      filter = _ref26.filter;

  var containsFilteredElement = function containsFilteredElement(node) {
    var containsNode = getParentComparator({ parent: node });
    return filter.some(containsNode);
  };

  // We'd use a Set() for this, if we could
  var insiginificantBranches = [];

  // see https://developer.mozilla.org/en-US/docs/Web/API/NodeFilter
  var CollectInsignificantBranchesFilter = function CollectInsignificantBranchesFilter(node) {
    if (filter.some(function (element) {
      return node === element;
    })) {
      // we've hit a filtered element and can ignore its children
      return NodeFilter.FILTER_REJECT;
    }

    if (containsFilteredElement(node)) {
      // we've hit a significant tree, so we'll have to keep investigating
      return NodeFilter.FILTER_ACCEPT;
    }

    // we've found an insignificant tree
    insiginificantBranches.push(node);
    return NodeFilter.FILTER_REJECT;
  };
  // IE requires a function, Browsers require {acceptNode: function}
  // see https://www.bennadel.com/blog/2607-finding-html-comment-nodes-in-the-dom-using-treewalker.htm
  CollectInsignificantBranchesFilter.acceptNode = CollectInsignificantBranchesFilter;

  var _document = getDocument(context);
  // see https://developer.mozilla.org/en-US/docs/Web/API/Document/createTreeWalker
  var walker = _document.createTreeWalker(
  // root element to start search in
  context,
  // element type filter
  NodeFilter.SHOW_ELEMENT,
  // custom NodeFilter filter
  CollectInsignificantBranchesFilter,
  // deprecated, but IE requires it
  false);

  while (walker.nextNode()) {
    // collection things is happening through the filter method
  }

  return insiginificantBranches;
}

var getInsignificantBranches = function getInsignificantBranches() {
  var _ref27 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      context = _ref27.context,
      filter = _ref27.filter;

  context = contextToElement({
    label: 'get/insignificant-branches',
    defaultToDocument: true,
    context: context
  });

  filter = nodeArray(filter);
  if (!filter.length) {
    throw new TypeError('get/insignificant-branches requires valid options.filter');
  }

  return queryInsignificantBranches({
    context: context,
    filter: filter
  });
};

// exporting modules to be included the UMD bundle

var get = {
  activeElement: activeElement$1,
  activeElements: getActiveElements,
  focusRedirectTarget: focusRedirectTarget,
  focusTarget: focusTarget,
  insignificantBranches: getInsignificantBranches,
  parents: getParents,
  shadowHostParents: shadowHostParents,
  shadowHost: getShadowHost
};

// exporting modules to be included the UMD bundle

var is = {
  activeElement: isActiveElement,
  disabled: disabled,
  focusRelevant: isFocusRelevant,
  focusable: isFocusable,
  onlyTabbable: isOnlyTabbable,
  shadowed: shadowed,
  tabbable: isTabbable,
  validArea: validArea,
  validTabindex: validTabindex,
  visible: isVisible
};

// see https://developer.mozilla.org/en-US/docs/Web/API/NodeFilter
var filter = function filter(node) {
  if (node.shadowRoot) {
    return NodeFilter.FILTER_ACCEPT;
  }

  return NodeFilter.FILTER_SKIP;
};
// IE requires a function, Browsers require {acceptNode: function}
// see http://www.bennadel.com/blog/2607-finding-html-comment-nodes-in-the-dom-using-treewalker.htm
filter.acceptNode = filter;

function queryShadowHosts() {
  var _ref28 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      context = _ref28.context;

  var element = contextToElement({
    label: 'query/shadow-hosts',
    resolveDocument: true,
    defaultToDocument: true,
    context: context
  });

  var _document = getDocument(context);
  // see https://developer.mozilla.org/en-US/docs/Web/API/Document/createTreeWalker
  var walker = _document.createTreeWalker(
  // root element to start search in
  element,
  // element type filter
  NodeFilter.SHOW_ELEMENT,
  // custom NodeFilter filter
  filter,
  // deprecated, but IE requires it
  false);

  var list = [];

  if (element.shadowRoot) {
    // TreeWalker does not run the filter on the context element
    list.push(element);
    list = list.concat(queryShadowHosts({
      context: element.shadowRoot
    }));
  }

  while (walker.nextNode()) {
    list.push(walker.currentNode);
    list = list.concat(queryShadowHosts({
      context: walker.currentNode.shadowRoot
    }));
  }

  return list;
}

var shadowObserverConfig = {
  childList: true,
  subtree: true
};

var ShadowMutationObserver = function () {
  function ShadowMutationObserver() {
    var _this = this;

    var _ref29 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
        context = _ref29.context,
        callback = _ref29.callback,
        config = _ref29.config;

    _classCallCheck(this, ShadowMutationObserver);

    this.config = config;

    this.disengage = this.disengage.bind(this);

    this.clientObserver = new MutationObserver(callback);
    this.hostObserver = new MutationObserver(function (mutations) {
      return mutations.forEach(_this.handleHostMutation, _this);
    });

    this.observeContext(context);
    this.observeShadowHosts(context);
  }

  _createClass(ShadowMutationObserver, [{
    key: 'disengage',
    value: function disengage() {
      this.clientObserver && this.clientObserver.disconnect();
      this.clientObserver = null;
      this.hostObserver && this.hostObserver.disconnect();
      this.hostObserver = null;
    }
  }, {
    key: 'observeShadowHosts',
    value: function observeShadowHosts(context) {
      var _this2 = this;

      var hosts = queryShadowHosts({
        context: context
      });

      hosts.forEach(function (element) {
        return _this2.observeContext(element.shadowRoot);
      });
    }
  }, {
    key: 'observeContext',
    value: function observeContext(context) {
      this.clientObserver.observe(context, this.config);
      this.hostObserver.observe(context, shadowObserverConfig);
    }
  }, {
    key: 'handleHostMutation',
    value: function handleHostMutation(mutation) {
      if (mutation.type !== 'childList') {
        return;
      }

      var addedElements = nodeArray(mutation.addedNodes).filter(function (element) {
        return element.nodeType === Node.ELEMENT_NODE;
      });
      addedElements.forEach(this.observeShadowHosts, this);
    }
  }]);

  return ShadowMutationObserver;
}();

var shadowMutations = function shadowMutations() {
  var _ref30 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      context = _ref30.context,
      callback = _ref30.callback,
      config = _ref30.config;

  if (typeof callback !== 'function') {
    throw new TypeError('observe/shadow-mutations requires options.callback to be a function');
  }

  if ((typeof config === 'undefined' ? 'undefined' : _typeof(config)) !== 'object') {
    throw new TypeError('observe/shadow-mutations requires options.config to be an object');
  }

  if (!window.MutationObserver) {
    // not supporting IE10 via Mutation Events, because they're too expensive
    // https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Mutation_events
    return {
      disengage: function disengage() {}
    };
  }

  var element = contextToElement({
    label: 'observe/shadow-mutations',
    resolveDocument: true,
    defaultToDocument: true,
    context: context
  });

  var service = new ShadowMutationObserver({
    context: element,
    callback: callback,
    config: config
  });

  return {
    disengage: service.disengage
  };
};

/*
  Utility to make a sub-tree of the DOM inert. Inert means the elements cannot be interacted
  with and they cannot be focused via script, pointer or keyboard.

  inert attribute was [removed](https://html5.org/r/8536) [tweet by steve](https://twitter.com/stevefaulkner/status/443075900201259008)
  but definition of [inert subtrees](https://www.w3.org/html/wg/drafts/html/master/editing.html#inert-subtrees) remains.

  [implementation idea by Vasilis](https://codepen.io/vasilisvg/pen/scowI)
  [inert attribute polyfill by GoogleChrome](https://github.com/GoogleChrome/inert-polyfill)

  [Gecko Bug: Inert Attribute](https://bugzilla.mozilla.org/show_bug.cgi?id=921504)
  [Chromium Bug: Inert Attribute](https://code.google.com/p/chromium/issues/detail?id=269846)
  [Chromium Bug: Inert Subtree](https://code.google.com/p/chromium/issues/detail?id=241699)
  [WebKit Bug: Inert Subtree](https://bugs.webkit.org/show_bug.cgi?id=110952)
*/

function makeElementInert(element) {
  return elementDisabled(element, true);
}

function undoElementInert(element) {
  return elementDisabled(element, false);
}

var observerConfig = {
  attributes: true,
  childList: true,
  subtree: true,
  attributeFilter: ['tabindex', 'disabled', 'data-ally-disabled']
};

var InertSubtree = function () {
  function InertSubtree() {
    var _this3 = this;

    var _ref31 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
        context = _ref31.context,
        filter = _ref31.filter;

    _classCallCheck(this, InertSubtree);

    this._context = nodeArray(context || document.documentElement)[0];
    this._filter = nodeArray(filter);
    this._inertElementCache = [];

    this.disengage = this.disengage.bind(this);
    this.handleMutation = this.handleMutation.bind(this);
    this.renderInert = this.renderInert.bind(this);
    this.filterElements = this.filterElements.bind(this);
    this.filterParentElements = this.filterParentElements.bind(this);

    var focusable$$1 = focusable({
      context: this._context,
      includeContext: true,
      strategy: 'all'
    });

    this.renderInert(focusable$$1);

    this.shadowObserver = shadowMutations({
      context: this._context,
      config: observerConfig,
      callback: function callback(mutations) {
        return mutations.forEach(_this3.handleMutation);
      }
    });
  }

  _createClass(InertSubtree, [{
    key: 'disengage',
    value: function disengage() {
      if (!this._context) {
        return;
      }

      undoElementInert(this._context);
      this._inertElementCache.forEach(function (element) {
        return undoElementInert(element);
      });

      this._inertElementCache = null;
      this._filter = null;
      this._context = null;
      this.shadowObserver && this.shadowObserver.disengage();
      this.shadowObserver = null;
    }
  }, {
    key: 'listQueryFocusable',
    value: function listQueryFocusable(list) {
      return list
      // find all focusable elements within the given contexts
      .map(function (element) {
        return focusable({ context: element, includeContext: true, strategy: 'all' });
      })
      // flatten nested arrays
      .reduce(function (previous, current) {
        return previous.concat(current);
      }, []);
    }
  }, {
    key: 'renderInert',
    value: function renderInert(elements) {
      var _this4 = this;

      var makeInert = function makeInert(element) {
        _this4._inertElementCache.push(element);
        makeElementInert(element);
      };

      elements.filter(this.filterElements).filter(this.filterParentElements)
      // ignore elements that already are disabled
      // so we don't enable them on disengage()
      .filter(function (element) {
        return !elementDisabled(element);
      }).forEach(makeInert);
    }
  }, {
    key: 'filterElements',
    value: function filterElements(element) {
      // ignore elements within the exempted sub-trees
      var isParentOfElement = getParentComparator({ element: element, includeSelf: true });
      return !this._filter.some(isParentOfElement);
    }
  }, {
    key: 'filterParentElements',
    value: function filterParentElements(element) {
      // ignore ancestors of the exempted sub-trees
      var isParentOfElement = getParentComparator({ parent: element });
      return !this._filter.some(isParentOfElement);
    }
  }, {
    key: 'handleMutation',
    value: function handleMutation(mutation) {
      if (mutation.type === 'childList') {
        var addedElements = nodeArray(mutation.addedNodes).filter(function (element) {
          return element.nodeType === Node.ELEMENT_NODE;
        });
        if (!addedElements.length) {
          return;
        }

        var addedFocusableElements = this.listQueryFocusable(addedElements);
        this.renderInert(addedFocusableElements);
      } else if (mutation.type === 'attributes') {
        this.renderInert([mutation.target]);
      }
    }
  }]);

  return InertSubtree;
}();

var disabled$1 = function disabled$1() {
  var _ref32 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      context = _ref32.context,
      filter = _ref32.filter;

  var service = new InertSubtree({ context: context, filter: filter });
  return { disengage: service.disengage };
};

// Utility to make the entire DOM aria-hidden="true" except for a given set of elements

function makeElementHidden(element) {
  toggleAttributeValue({
    element: element,
    attribute: 'aria-hidden',
    temporaryValue: 'true'
  });
}

function undoElementHidden(element) {
  toggleAttributeValue({
    element: element,
    attribute: 'aria-hidden'
  });
}

var observerConfig$1 = {
  attributes: false,
  childList: true,
  subtree: true
};

var HiddenSubtree = function () {
  function HiddenSubtree() {
    var _ref33 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
        context = _ref33.context,
        filter = _ref33.filter;

    _classCallCheck(this, HiddenSubtree);

    this._context = nodeArray(context || document.documentElement)[0];
    this._filter = nodeArray(filter);

    this.disengage = this.disengage.bind(this);
    this.handleMutation = this.handleMutation.bind(this);
    this.isInsignificantBranch = this.isInsignificantBranch.bind(this);

    var insignificantBranches = getInsignificantBranches({ context: this._context, filter: this._filter });
    insignificantBranches.forEach(makeElementHidden);
    this.startObserver();
  }

  _createClass(HiddenSubtree, [{
    key: 'disengage',
    value: function disengage() {
      if (!this._context) {
        return;
      }

      [].forEach.call(this._context.querySelectorAll('[data-cached-aria-hidden]'), undoElementHidden);

      this._context = null;
      this._filter = null;
      this._observer && this._observer.disconnect();
      this._observer = null;
    }
  }, {
    key: 'startObserver',
    value: function startObserver() {
      var _this5 = this;

      if (!window.MutationObserver) {
        // not supporting IE10 via Mutation Events, because they're too expensive
        // https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Mutation_events
        return;
      }
      // http://caniuse.com/#search=mutation
      // https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver
      this._observer = new MutationObserver(function (mutations) {
        return mutations.forEach(_this5.handleMutation);
      });
      this._observer.observe(this._context, observerConfig$1);
    }
  }, {
    key: 'handleMutation',
    value: function handleMutation(mutation) {
      if (mutation.type === 'childList') {
        // a new branch cannot contain a filtered element
        // (unless it is moved there, which is an edge-case we'll ignore for now),
        // so anything that is within context,
        // and not within a previously known insignificant branch and not within a filtered element,
        // must be an insignificant branch as well
        nodeArray(mutation.addedNodes).filter(function (element) {
          return element.nodeType === Node.ELEMENT_NODE;
        }).filter(this.isInsignificantBranch).forEach(makeElementHidden);
      }
    }
  }, {
    key: 'isInsignificantBranch',
    value: function isInsignificantBranch(element) {
      var parents = getParents({ context: element });
      if (parents.some(function (_element) {
        return _element.getAttribute('aria-hidden') === 'true';
      })) {
        // element is child of a hidden element
        return false;
      }

      var isParentOfElement = getParentComparator({ element: element });
      if (this._filter.some(isParentOfElement)) {
        // element is a descendant of a filtered element
        return false;
      }

      return true;
    }
  }]);

  return HiddenSubtree;
}();

var hidden = function hidden() {
  var _ref34 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      context = _ref34.context,
      filter = _ref34.filter;

  var service = new HiddenSubtree({ context: context, filter: filter });
  return { disengage: service.disengage };
};

// move <area> elements to the location of the <img> elements that reference them

var Maps = function () {
  function Maps(context) {
    _classCallCheck(this, Maps);

    this._document = getDocument(context);
    this.maps = {};
  }

  _createClass(Maps, [{
    key: 'getAreasFor',
    value: function getAreasFor(name) {
      if (!this.maps[name]) {
        // the map is not defined within the context, so we
        // have to go find it elsewhere in the document
        this.addMapByName(name);
      }

      return this.maps[name];
    }
  }, {
    key: 'addMapByName',
    value: function addMapByName(name) {
      var map = getMapByName(name, this._document);
      if (!map) {
        // if there is no map, the img[usemap] wasn't doing anything anyway
        return;
      }

      this.maps[map.name] = queryTabbable({ context: map });
    }
  }, {
    key: 'extractAreasFromList',
    value: function extractAreasFromList(elements) {
      // remove all <area> elements from the elements list,
      // but put them the map for later retrieval
      return elements.filter(function (element) {
        var nodeName = element.nodeName.toLowerCase();
        if (nodeName !== 'area') {
          return true;
        }

        var map = element.parentNode;
        if (!this.maps[map.name]) {
          this.maps[map.name] = [];
        }

        this.maps[map.name].push(element);
        return false;
      }, this);
    }
  }]);

  return Maps;
}();

var sortArea = function sortArea(elements, context) {
  // images - unless they are focusable themselves, likely not
  // part of the elements list, so we'll have to find them and
  // sort them into the elements list manually
  var usemaps = context.querySelectorAll('img[usemap]');
  var maps = new Maps(context);

  // remove all <area> elements from the elements list,
  // but put them the map for later retrieval
  var _elements = maps.extractAreasFromList(elements);

  if (!usemaps.length) {
    // the context does not contain any <area>s so no need
    // to replace anything, just remove any maps
    return _elements;
  }

  return mergeInDomOrder({
    list: _elements,
    elements: usemaps,
    resolveElement: function resolveElement(image) {
      var name = image.getAttribute('usemap').slice(1);
      return maps.getAreasFor(name);
    }
  });
};

var Shadows = function () {
  function Shadows(context, sortElements) {
    _classCallCheck(this, Shadows);

    // document context we're working with
    this.context = context;
    // callback that sorts an array of elements
    this.sortElements = sortElements;
    // reference to create unique IDs for each ShadowHost
    this.hostCounter = 1;
    // reference map for child-ShadowHosts of a ShadowHost
    this.inHost = {};
    // reference map for child-ShadowHost of the document
    this.inDocument = [];
    // reference map for ShadowHosts
    this.hosts = {};
    // reference map for tabbable elements of a ShadowHost
    this.elements = {};
  }

  // remember which hosts we have to sort within later


  _createClass(Shadows, [{
    key: '_registerHost',
    value: function _registerHost(host) {
      if (host._sortingId) {
        return;
      }

      // make the ShadowHost identifiable (see cleanup() for undo)
      host._sortingId = 'shadow-' + this.hostCounter++;
      this.hosts[host._sortingId] = host;

      // hosts may contain other hosts
      var parentHost = getShadowHost({ context: host });
      if (parentHost) {
        this._registerHost(parentHost);
        this._registerHostParent(host, parentHost);
      } else {
        this.inDocument.push(host);
      }
    }

    // remember which host is the child of which other host

  }, {
    key: '_registerHostParent',
    value: function _registerHostParent(host, parent) {
      if (!this.inHost[parent._sortingId]) {
        this.inHost[parent._sortingId] = [];
      }

      this.inHost[parent._sortingId].push(host);
    }

    // remember which elements a host contains

  }, {
    key: '_registerElement',
    value: function _registerElement(element, host) {
      if (!this.elements[host._sortingId]) {
        this.elements[host._sortingId] = [];
      }

      this.elements[host._sortingId].push(element);
    }

    // remove shadowed elements from the sequence and register
    // the ShadowHosts they belong to so we know what to sort
    // later on

  }, {
    key: 'extractElements',
    value: function extractElements(elements) {
      return elements.filter(function (element) {
        var host = getShadowHost({ context: element });
        if (!host) {
          return true;
        }

        this._registerHost(host);
        this._registerElement(element, host);
        return false;
      }, this);
    }

    // inject hosts into the sequence, sort everything,
    // and recoursively replace hosts by its descendants

  }, {
    key: 'sort',
    value: function sort(elements) {
      var _elements = this._injectHosts(elements);
      _elements = this._replaceHosts(_elements);
      this._cleanup();
      return _elements;
    }

    // merge ShadowHosts into the element lists of other ShadowHosts
    // or the document, then sort the individual lists

  }, {
    key: '_injectHosts',
    value: function _injectHosts(elements) {
      Object.keys(this.hosts).forEach(function (_sortingId) {
        var _list = this.elements[_sortingId];
        var _elements = this.inHost[_sortingId];
        var _context = this.hosts[_sortingId].shadowRoot;
        this.elements[_sortingId] = this._merge(_list, _elements, _context);
      }, this);

      return this._merge(elements, this.inDocument, this.context);
    }
  }, {
    key: '_merge',
    value: function _merge(list, elements, context) {
      var merged = mergeInDomOrder({
        list: list,
        elements: elements
      });

      return this.sortElements(merged, context);
    }
  }, {
    key: '_replaceHosts',
    value: function _replaceHosts(elements) {
      return mergeInDomOrder({
        list: elements,
        elements: this.inDocument,
        resolveElement: this._resolveHostElement.bind(this)
      });
    }
  }, {
    key: '_resolveHostElement',
    value: function _resolveHostElement(host) {
      var merged = mergeInDomOrder({
        list: this.elements[host._sortingId],
        elements: this.inHost[host._sortingId],
        resolveElement: this._resolveHostElement.bind(this)
      });

      var _tabindex = tabindexValue(host);
      if (_tabindex !== null && _tabindex > -1) {
        return [host].concat(merged);
      }

      return merged;
    }
  }, {
    key: '_cleanup',
    value: function _cleanup() {
      // remove those identifers we put on the ShadowHost to avoid using Map()
      Object.keys(this.hosts).forEach(function (key) {
        delete this.hosts[key]._sortingId;
      }, this);
    }
  }]);

  return Shadows;
}();

var sortShadowed = function sortShadowed(elements, context, sortElements) {
  var shadows = new Shadows(context, sortElements);
  var _elements = shadows.extractElements(elements);

  if (_elements.length === elements.length) {
    // no shadowed content found, no need to continue
    return sortElements(elements);
  }

  return shadows.sort(_elements);
};

var sortTabindex = function sortTabindex(elements) {
  // https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement.tabIndex
  // elements with tabIndex "0" (including tabbableElements without tabIndex) should be navigated in the order they appear.
  // elements with a positive tabIndex:
  //   Elements that have identical tabIndexes should be navigated in the order they appear.
  //   Navigation proceeds from the lowest tabIndex to the highest tabIndex.

  // NOTE: sort implementation may be unstable and thus mess up DOM order,
  // that's why we build a map that's being sorted instead. If we were able to rely
  // on a stable sorting algorithm, sortTabindex() could be as simple as
  // elements.sort(function(a, b) { return a.tabIndex - b.tabIndex; });
  // at this time Chrome does not use a stable sorting algorithm
  // see http://blog.rodneyrehm.de/archives/14-Sorting-Were-Doing-It-Wrong.html#stability

  // NOTE: compareDocumentPosition seemed like more overhead than just sorting this with buckets
  // https://developer.mozilla.org/en-US/docs/Web/API/Node.compareDocumentPosition

  var map = {};
  var indexes = [];
  var normal = elements.filter(function (element) {
    // in Trident and Gecko SVGElement does not know about the tabIndex property
    var tabIndex = element.tabIndex;
    if (tabIndex === undefined) {
      tabIndex = tabindexValue(element);
    }

    // extract elements that don't need sorting
    if (tabIndex <= 0 || tabIndex === null || tabIndex === undefined) {
      return true;
    }

    if (!map[tabIndex]) {
      // create sortable bucket for dom-order-preservation of elements with the same tabIndex
      map[tabIndex] = [];
      // maintain a list of unique tabIndexes
      indexes.push(tabIndex);
    }

    // sort element into the proper bucket
    map[tabIndex].push(element);
    // element moved to sorting map, so not "normal" anymore
    return false;
  });

  // sort the tabindex ascending,
  // then resolve them to their appropriate buckets,
  // then flatten the array of arrays to an array
  var _elements = indexes.sort().map(function (tabIndex) {
    return map[tabIndex];
  }).reduceRight(function (previous, current) {
    return current.concat(previous);
  }, normal);

  return _elements;
};

// https://www.w3.org/TR/html5/editing.html#sequential-focus-navigation-and-the-tabindex-attribute
// https://www.w3.org/WAI/PF/aria-practices/#keyboard

var supports$10 = void 0;

function moveContextToBeginning(elements, context) {
  var pos = elements.indexOf(context);
  if (pos > 0) {
    var tmp = elements.splice(pos, 1);
    return tmp.concat(elements);
  }

  return elements;
}

function sortElements(elements, _context) {
  if (supports$10.tabsequenceAreaAtImgPosition) {
    // Some browsers sort <area> in DOM order, some place the <area>s
    // where the <img> referecing them would've been in DOM order.
    // https://github.com/medialize/ally.js/issues/5
    elements = sortArea(elements, _context);
  }

  elements = sortTabindex(elements);
  return elements;
}

var tabsequence = function tabsequence() {
  var _ref35 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      context = _ref35.context,
      includeContext = _ref35.includeContext,
      includeOnlyTabbable = _ref35.includeOnlyTabbable,
      strategy = _ref35.strategy;

  if (!supports$10) {
    supports$10 = _supports();
  }

  var _context = nodeArray(context)[0] || document.documentElement;
  var elements = queryTabbable({
    context: _context,
    includeContext: includeContext,
    includeOnlyTabbable: includeOnlyTabbable,
    strategy: strategy
  });

  if (document.body.createShadowRoot && platform.is.BLINK) {
    // sort tabindex localized to shadow dom
    // see https://github.com/medialize/ally.js/issues/6
    elements = sortShadowed(elements, _context, sortElements);
  } else {
    elements = sortElements(elements, _context);
  }

  if (includeContext) {
    // if we include the context itself, it has to be the first
    // element of the sequence
    elements = moveContextToBeginning(elements, _context);
  }

  return elements;
};

// codes mostly cloned from https://github.com/keithamus/jwerty/blob/master/jwerty.js
// deliberately not exposing characters like <,.-#* because they vary *wildly*
// across keyboard layouts and may cause various problems
// (e.g. "*" is "Shift +" on a German Mac keyboard)
// (e.g. "@" is "Alt L" on a German Mac keyboard)

var keycode = {
  // Element Focus
  tab: 9,

  // Navigation
  left: 37,
  up: 38,
  right: 39,
  down: 40,
  pageUp: 33,
  'page-up': 33,
  pageDown: 34,
  'page-down': 34,
  end: 35,
  home: 36,

  // Action
  enter: 13,
  escape: 27,
  space: 32,

  // Modifier
  shift: 16,
  capsLock: 20,
  'caps-lock': 20,
  ctrl: 17,
  alt: 18,
  meta: 91,
  // in firefox: 224
  // on mac (chrome): meta-left=91, meta-right=93
  // on win (IE11): meta-left=91, meta-right=92
  pause: 19,

  // Content Manipulation
  insert: 45,
  'delete': 46,
  backspace: 8,

  // the same logical key may be identified through different keyCodes
  _alias: {
    91: [92, 93, 224]
  }
};

// Function keys (112 - 137)
// NOTE: not every keyboard knows F13+
for (var n = 1; n < 26; n++) {
  keycode['f' + n] = n + 111;
}

// Number keys (48-57, numpad 96-105)
// NOTE: not every keyboard knows num-0+
for (var _n = 0; _n < 10; _n++) {
  var code = _n + 48;
  var numCode = _n + 96;
  keycode[_n] = code;
  keycode['num-' + _n] = numCode;
  keycode._alias[code] = [numCode];
}

// Latin characters (65 - 90)
for (var _n2 = 0; _n2 < 26; _n2++) {
  var _code = _n2 + 65;
  var _name2 = String.fromCharCode(_code).toLowerCase();
  keycode[_name2] = _code;
}

/*
  decodes a key binding token to a JavaScript structure

  returns an array of objects:
    {
      // key name translated to keyCode (possibly more than one)
      keyCodes: [<number>],
      // translated modifiers
      modifiers: {
        altKey: null,   // ignore
        ctrKey: false,  // expect not pressed
        metaKey: true,  // expect pressed
        shiftKey: true, // expect pressed
      },
      // callback that returns true if event's
      // modifier keys match the expected state
      matchModifiers: function(event){},
    }
*/

var modifier = {
  alt: 'altKey',
  ctrl: 'ctrlKey',
  meta: 'metaKey',
  shift: 'shiftKey'
};

var modifierSequence = Object.keys(modifier).map(function (name) {
  return modifier[name];
});

function createExpectedModifiers(ignoreModifiers) {
  var value = ignoreModifiers ? null : false;
  return {
    altKey: value,
    ctrlKey: value,
    metaKey: value,
    shiftKey: value
  };
}

function resolveModifiers(modifiers) {
  var ignoreModifiers = modifiers.indexOf('*') !== -1;
  var expected = createExpectedModifiers(ignoreModifiers);

  modifiers.forEach(function (token) {
    if (token === '*') {
      // we've already covered the all-in operator
      return;
    }

    // we want the modifier pressed
    var value = true;
    var operator = token.slice(0, 1);
    if (operator === '?') {
      // we don't care if the modifier is pressed
      value = null;
    } else if (operator === '!') {
      // we do not want the modifier pressed
      value = false;
    }

    if (value !== true) {
      // compensate for the modifier's operator
      token = token.slice(1);
    }

    var propertyName = modifier[token];
    if (!propertyName) {
      throw new TypeError('Unknown modifier "' + token + '"');
    }

    expected[propertyName] = value;
  });

  return expected;
}

function resolveKey(key) {
  var code = keycode[key] || parseInt(key, 10);
  if (!code || typeof code !== 'number' || isNaN(code)) {
    throw new TypeError('Unknown key "' + key + '"');
  }

  return [code].concat(keycode._alias[code] || []);
}

function matchModifiers(expected, event) {
  // returns true on match
  return !modifierSequence.some(function (prop) {
    // returns true on mismatch
    return typeof expected[prop] === 'boolean' && Boolean(event[prop]) !== expected[prop];
  });
}

var keyBinding = function keyBinding(text) {
  return text.split(/\s+/).map(function (_text) {
    var tokens = _text.split('+');
    var _modifiers = resolveModifiers(tokens.slice(0, -1));
    var _keyCodes = resolveKey(tokens.slice(-1));
    return {
      keyCodes: _keyCodes,
      modifiers: _modifiers,
      matchModifiers: matchModifiers.bind(null, _modifiers)
    };
  });
};

// Bug 286933 - Key events in the autocomplete popup should be hidden from page scripts
// @browser-issue Gecko https://bugzilla.mozilla.org/show_bug.cgi?id=286933

var key = function key() {
  var map = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  var bindings = {};

  var context = nodeArray(map.context)[0] || document.documentElement;
  delete map.context;
  var filter = nodeArray(map.filter);
  delete map.filter;

  var mapKeys = Object.keys(map);
  if (!mapKeys.length) {
    throw new TypeError('when/key requires at least one option key');
  }

  var registerBinding = function registerBinding(event) {
    event.keyCodes.forEach(function (code) {
      if (!bindings[code]) {
        bindings[code] = [];
      }

      bindings[code].push(event);
    });
  };

  mapKeys.forEach(function (text) {
    if (typeof map[text] !== 'function') {
      throw new TypeError('when/key requires option["' + text + '"] to be a function');
    }

    var addCallback = function addCallback(event) {
      event.callback = map[text];
      return event;
    };

    keyBinding(text).map(addCallback).forEach(registerBinding);
  });

  var handleKeyDown = function handleKeyDown(event) {
    if (event.defaultPrevented) {
      return;
    }

    if (filter.length) {
      // ignore elements within the exempted sub-trees
      var isParentOfElement = getParentComparator({ element: event.target, includeSelf: true });
      if (filter.some(isParentOfElement)) {
        return;
      }
    }

    var key = event.keyCode || event.which;
    if (!bindings[key]) {
      return;
    }

    bindings[key].forEach(function (_event) {
      if (!_event.matchModifiers(event)) {
        return;
      }

      _event.callback.call(context, event, disengage);
    });
  };

  context.addEventListener('keydown', handleKeyDown, false);

  var disengage = function disengage() {
    context.removeEventListener('keydown', handleKeyDown, false);
  };

  return { disengage: disengage };
};

var tabFocus = function tabFocus() {
  var _ref36 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      context = _ref36.context;

  if (!context) {
    context = document.documentElement;
  }

  // Make sure the supports tests are run before intercepting the Tab key,
  // or IE10 and IE11 will fail to process the first Tab key event. Not
  // limiting this warm-up to IE because it may be a problem elsewhere, too.
  tabsequence();

  return key({
    // Safari on OSX may require ALT+TAB to reach links,
    // see https://github.com/medialize/ally.js/issues/146
    '?alt+?shift+tab': function altShiftTab(event) {
      // we're completely taking over the Tab key handling
      event.preventDefault();

      var sequence = tabsequence({
        context: context
      });

      var backward = event.shiftKey;
      var first = sequence[0];
      var last = sequence[sequence.length - 1];

      // wrap around first to last, last to first
      var source = backward ? first : last;
      var target = backward ? last : first;
      if (isActiveElement(source)) {
        target.focus();
        return;
      }

      // find current position in tabsequence
      var currentIndex = void 0;
      var found = sequence.some(function (element, index) {
        if (!isActiveElement(element)) {
          return false;
        }

        currentIndex = index;
        return true;
      });

      if (!found) {
        // redirect to first as we're not in our tabsequence
        first.focus();
        return;
      }

      // shift focus to previous/next element in the sequence
      var offset = backward ? -1 : 1;
      sequence[currentIndex + offset].focus();
    }
  });
};

// exporting modules to be included the UMD bundle

var maintain = {
  disabled: disabled$1,
  hidden: hidden,
  tabFocus: tabFocus
};

/*
  'property-name': {
    'default': default value
    values: list of possible values
    'multiple': boolean, allows multiple values (space separated)
    'other': boolean, allows other values than offered in values list
  }
*/

var attribute = {
  // aria state properties

  // https://www.w3.org/TR/wai-aria/states_and_properties#aria-busy
  'aria-busy': {
    'default': 'false',
    values: ['true', 'false']
  },
  // https://www.w3.org/TR/wai-aria/states_and_properties#aria-checked
  'aria-checked': {
    'default': undefined,
    values: ['true', 'false', 'mixed', undefined]
  },
  // https://www.w3.org/TR/wai-aria/states_and_properties#aria-disabled
  'aria-disabled': {
    'default': 'false',
    values: ['true', 'false']
  },
  // https://www.w3.org/TR/wai-aria/states_and_properties#aria-expanded
  'aria-expanded': {
    'default': undefined,
    values: ['true', 'false', undefined]
  },
  // https://www.w3.org/TR/wai-aria/states_and_properties#aria-grabbed
  'aria-grabbed': {
    'default': undefined,
    values: ['true', 'false', undefined]
  },
  // https://www.w3.org/TR/wai-aria/states_and_properties#aria-hidden
  'aria-hidden': {
    'default': 'false',
    values: ['true', 'false']
  },
  // https://www.w3.org/TR/wai-aria/states_and_properties#aria-invalid
  'aria-invalid': {
    'default': 'false',
    values: ['true', 'false', 'grammar', 'spelling']
  },
  // https://www.w3.org/TR/wai-aria/states_and_properties#aria-pressed
  'aria-pressed': {
    'default': undefined,
    values: ['true', 'false', 'mixed', undefined]
  },
  // https://www.w3.org/TR/wai-aria/states_and_properties#aria-selected
  'aria-selected': {
    'default': undefined,
    values: ['true', 'false', undefined]
  },

  // aria descriptive properties

  // https://www.w3.org/TR/wai-aria/states_and_properties#aria-atomic
  'aria-atomic': {
    'default': 'false',
    values: ['true', 'false']
  },
  // https://www.w3.org/TR/wai-aria/states_and_properties#aria-autocomplete
  'aria-autocomplete': {
    'default': 'none',
    values: ['inline', 'list', 'both', 'none']
  },
  // https://www.w3.org/TR/wai-aria/states_and_properties#aria-dropeffect
  'aria-dropeffect': {
    'default': 'none',
    multiple: true,
    values: ['copy', 'move', 'link', 'execute', 'popup', 'none']
  },
  // https://www.w3.org/TR/wai-aria/states_and_properties#aria-haspopup
  'aria-haspopup': {
    'default': 'false',
    values: ['true', 'false']
  },
  // https://www.w3.org/TR/wai-aria/states_and_properties#aria-live
  'aria-live': {
    'default': 'off',
    values: ['off', 'polite', 'assertive']
  },
  // https://www.w3.org/TR/wai-aria/states_and_properties#aria-multiline
  'aria-multiline': {
    'default': 'false',
    values: ['true', 'false']
  },
  // https://www.w3.org/TR/wai-aria/states_and_properties#aria-multiselectable
  'aria-multiselectable': {
    'default': 'false',
    values: ['true', 'false']
  },
  // https://www.w3.org/TR/wai-aria/states_and_properties#aria-orientation
  'aria-orientation': {
    'default': 'horizontal',
    values: ['vertical', 'horizontal']
  },
  // https://www.w3.org/TR/wai-aria/states_and_properties#aria-readonly
  'aria-readonly': {
    'default': 'false',
    values: ['true', 'false']
  },
  // https://www.w3.org/TR/wai-aria/states_and_properties#aria-relevant
  'aria-relevant': {
    'default': 'additions text',
    multiple: true,
    values: ['additions', 'removals', 'text', 'all']
  },
  // https://www.w3.org/TR/wai-aria/states_and_properties#aria-required
  'aria-required': {
    'default': 'false',
    values: ['true', 'false']
  },
  // https://www.w3.org/TR/wai-aria/states_and_properties#aria-sort
  'aria-sort': {
    'default': 'none',
    other: true,
    values: ['ascending', 'descending', 'none']
  }
};

// exporting modules to be included the UMD bundle

var map = {
  attribute: attribute,
  keycode: keycode
};

/*
  Observe keyboard-, pointer-, mouse- and touch-events so that a query for
  the current interaction type can be made at any time. For pointer interaction
  this observer is limited to pointer button down/up - move is not observed!

  USAGE:
    var listener = engage();
    listener.get() === {pointer: Boolean, key: Boolean}
*/

// counters to track primary input
var _activePointers = 0;
var _activeKeys = 0;

var pointerStartEvents = ['touchstart', 'pointerdown', 'MSPointerDown', 'mousedown'];
var pointerEndEvents = ['touchend', 'touchcancel', 'pointerup', 'MSPointerUp', 'pointercancel', 'MSPointerCancel', 'mouseup'];

function handleWindowBlurEvent() {
  // reset internal counters when window loses focus
  _activePointers = 0;
  _activeKeys = 0;
}

function handlePointerStartEvent(event) {
  if (event.isPrimary === false) {
    // ignore non-primary pointer events
    // https://w3c.github.io/pointerevents/#widl-PointerEvent-isPrimary
    return;
  }

  // mousedown without following mouseup
  // (likely not possible in Chrome)
  _activePointers++;
}

function handlePointerEndEvent(event) {
  if (event.isPrimary === false) {
    // ignore non-primary pointer events
    // https://w3c.github.io/pointerevents/#widl-PointerEvent-isPrimary
    return;
  } else if (event.touches) {
    _activePointers = event.touches.length;
    return;
  }

  // delay reset to when the current handlers are executed
  (window.setImmediate || window.setTimeout)(function () {
    // mouseup without prior mousedown
    // (drag something out of the window)
    _activePointers = Math.max(_activePointers - 1, 0);
  });
}

function handleKeyStartEvent(event) {
  // ignore modifier keys
  switch (event.keyCode || event.which) {
    case 16: // space
    case 17: // control
    case 18: // alt
    case 91: // command left
    case 93:
      // command right
      return;
  }

  // keydown without a following keyup
  // (may happen on CMD+TAB)
  _activeKeys++;
}

function handleKeyEndEvent(event) {
  // ignore modifier keys
  switch (event.keyCode || event.which) {
    case 16: // space
    case 17: // control
    case 18: // alt
    case 91: // command left
    case 93:
      // command right
      return;
  }

  // delay reset to when the current handlers are executed
  (window.setImmediate || window.setTimeout)(function () {
    // keyup without prior keydown
    // (may happen on CMD+R)
    _activeKeys = Math.max(_activeKeys - 1, 0);
  });
}

function getInteractionType() {
  return {
    pointer: Boolean(_activePointers),
    key: Boolean(_activeKeys)
  };
}

function disengage$5() {
  _activePointers = _activeKeys = 0;
  window.removeEventListener('blur', handleWindowBlurEvent, false);
  document.documentElement.removeEventListener('keydown', handleKeyStartEvent, true);
  document.documentElement.removeEventListener('keyup', handleKeyEndEvent, true);
  pointerStartEvents.forEach(function (event) {
    document.documentElement.removeEventListener(event, handlePointerStartEvent, true);
  });
  pointerEndEvents.forEach(function (event) {
    document.documentElement.removeEventListener(event, handlePointerEndEvent, true);
  });
}

function engage$5() {
  // window blur must be in bubble phase so it won't capture regular blurs
  window.addEventListener('blur', handleWindowBlurEvent, false);
  // handlers to identify the method of focus change
  document.documentElement.addEventListener('keydown', handleKeyStartEvent, true);
  document.documentElement.addEventListener('keyup', handleKeyEndEvent, true);
  pointerStartEvents.forEach(function (event) {
    document.documentElement.addEventListener(event, handlePointerStartEvent, true);
  });
  pointerEndEvents.forEach(function (event) {
    document.documentElement.addEventListener(event, handlePointerEndEvent, true);
  });

  return {
    get: getInteractionType
  };
}

var engageInteractionTypeObserver = decorateService({ engage: engage$5, disengage: disengage$5 });

// exporting modules to be included the UMD bundle

var observe = {
  interactionType: engageInteractionTypeObserver,
  shadowMutations: shadowMutations
};

/*
    query/firstTabbable() finds the first suitable element to receive focus in the given context.
    If an element has [autofocus] return that element, otherwise return the first element
    in document order that does *not* have a positive tabIndex (e.g. as [tabindex="1"]),
    otherwise return the context itself, if it is focusable.

    Note: Chrome's <dialog> will focus the first tabbable element, even if it has
    [tabindex="1"]. Since [tabindex="1"] is considered
    bad practice we'll ignore it until someone complains.
 */

function hasAutofocus(element) {
  // [autofocus] actually only works on form element, but who cares?
  return element.hasAttribute('autofocus');
}

function hasNoPositiveTabindex(element) {
  return element.tabIndex <= 0;
}

var firstTabbable = function firstTabbable() {
  var _ref37 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      context = _ref37.context,
      sequence = _ref37.sequence,
      strategy = _ref37.strategy,
      ignoreAutofocus = _ref37.ignoreAutofocus,
      defaultToContext = _ref37.defaultToContext,
      includeOnlyTabbable = _ref37.includeOnlyTabbable;

  var index = -1;

  if (!sequence) {
    context = nodeArray(context || document.body)[0];
    sequence = queryTabbable({
      context: context,
      includeOnlyTabbable: includeOnlyTabbable,
      strategy: strategy
    });
  }

  if (sequence.length && !ignoreAutofocus) {
    // prefer [autofocus]
    index = findIndex(sequence, hasAutofocus);
  }

  if (sequence.length && index === -1) {
    // ignore positive [tabindex]
    index = findIndex(sequence, hasNoPositiveTabindex);
  }

  var _isFocusable = isFocusable.rules.except({
    onlyTabbable: includeOnlyTabbable
  });

  if (index === -1 && defaultToContext && context && _isFocusable(context)) {
    return context;
  }

  return sequence[index] || null;
};

// exporting modules to be included the UMD bundle

var query = {
  firstTabbable: firstTabbable,
  focusable: focusable,
  shadowHosts: queryShadowHosts,
  tabbable: queryTabbable,
  tabsequence: tabsequence
};

//
// This util allows to easily add, remove or toggle classes.
//
// Using it is neccessary as IE 9 doesn't support element classList
// and IE 11 doesn't support classList for SVG elements
// see also https://developer.mozilla.org/en/docs/Web/API/Element/classList
//
// This file is a replacement for domtokenlist because of
// https://github.com/medialize/ally.js/issues/147
//
// Usage:
//
// toggleClass(div, 'demo'); // Toggles the class `demo`
// toggleClass(div, 'demo', true); // Adds the class `demo`
// toggleClass(div, 'demo', false); // removes the class `demo`
//
// removeClass(div, 'demo');
// addClass(div, 'demo');
//

/**
 * Extract an array of all classNames of the given DOM or SVG node
 */
function getClassNames(element) {
  var className = element.getAttribute && element.getAttribute('class') || '';
  return className === '' ? [] : className.split(' ');
}

function toggleClass(element, className, force) {
  var classNames = getClassNames(element);
  var idx = classNames.indexOf(className);
  var hasClass = idx !== -1;
  var shouldHaveClass = force !== undefined ? force : !hasClass;
  // Break if classes are already set/removed
  if (shouldHaveClass === hasClass) {
    return;
  }
  // Remove class
  if (!shouldHaveClass) {
    classNames.splice(idx, 1);
  }
  // Add class
  if (shouldHaveClass) {
    classNames.push(className);
  }
  element.setAttribute('class', classNames.join(' '));
}

function removeClass(element, className) {
  return toggleClass(element, className, false);
}

function addClass(element, className) {
  return toggleClass(element, className, true);
}

/*
  add data-focus-source attribute to html element containing "key", "pointer" or "script"
  depending on the input method used to change focus.

  USAGE:
    style/focus-source()

    body :focus {
      outline: 1px solid grey;
    }

    html[data-focus-source="key"] body :focus {
      outline: 5px solid red;
    }

    html[data-focus-source="key"] body :focus {
      outline: 1px solid blue;
    }

  NOTE: I don't have a GamePad to test, if you do and you want to
  implement an observer for https://w3c.github.io/gamepad/ - send a PR!

  Alternate implementation: https://github.com/alice/modality
*/

// preferring focusin/out because they are synchronous in IE10+11
var supportsFocusIn = typeof document !== 'undefined' && 'onfocusin' in document;
var focusEventName = supportsFocusIn ? 'focusin' : 'focus';
var blurEventName = supportsFocusIn ? 'focusout' : 'blur';

// interface to read interaction-type-listener state
var interactionTypeHandler = void 0;
var shadowHandle = void 0;
// keep track of last focus source
var current = null;
// overwrite focus source for use with the every upcoming focus event
var lock = null;
// keep track of ever having used a particular input method to change focus
var used = {
  pointer: false,
  key: false,
  script: false,
  initial: false
};

function handleFocusEvent(event) {
  var source = '';
  if (event.type === focusEventName || event.type === 'shadow-focus') {
    var interactionType = interactionTypeHandler.get();
    source = lock || interactionType.pointer && 'pointer' || interactionType.key && 'key' || 'script';
  } else if (event.type === 'initial') {
    source = 'initial';
  }

  document.documentElement.setAttribute('data-focus-source', source);

  if (event.type !== blurEventName) {
    if (!used[source]) {
      addClass(document.documentElement, 'focus-source-' + source);
    }

    used[source] = true;
    current = source;
  }
}

function getCurrentFocusSource() {
  return current;
}

function getUsedFocusSource(source) {
  return used[source];
}

function lockFocusSource(source) {
  lock = source;
}

function unlockFocusSource() {
  lock = false;
}

function disengage$6() {
  // clear dom state
  handleFocusEvent({ type: blurEventName });
  current = lock = null;
  Object.keys(used).forEach(function (key) {
    removeClass(document.documentElement, 'focus-source-' + key);
    used[key] = false;
  });
  // kill interaction type identification listener
  interactionTypeHandler.disengage();
  // kill shadow-focus event dispatcher
  shadowHandle && shadowHandle.disengage();
  document.removeEventListener('shadow-focus', handleFocusEvent, true);
  document.documentElement.removeEventListener(focusEventName, handleFocusEvent, true);
  document.documentElement.removeEventListener(blurEventName, handleFocusEvent, true);
  document.documentElement.removeAttribute('data-focus-source');
}

function engage$6() {
  // enable the shadow-focus event dispatcher
  shadowHandle = shadowFocus();
  // handlers to modify the focused element
  document.addEventListener('shadow-focus', handleFocusEvent, true);
  document.documentElement.addEventListener(focusEventName, handleFocusEvent, true);
  document.documentElement.addEventListener(blurEventName, handleFocusEvent, true);
  // enable the interaction type identification observer
  interactionTypeHandler = engageInteractionTypeObserver();
  // set up initial dom state
  handleFocusEvent({ type: 'initial' });

  return {
    used: getUsedFocusSource,
    current: getCurrentFocusSource,
    lock: lockFocusSource,
    unlock: unlockFocusSource
  };
}

var focusSource = decorateService({ engage: engage$6, disengage: disengage$6 });

/*
  add .ally-focus-within class to parents of document.activeElement,
  to provide the functionality of :focus-within where it's not available
  see https://dev.w3.org/csswg/selectors-4/#the-focus-within-pseudo

  USAGE:
    style/focus-within()
*/

var supports$11 = void 0;

// preferring focusin/out because they are synchronous in IE10+11
var supportsFocusIn$1 = typeof document !== 'undefined' && 'onfocusin' in document;
var focusEventName$1 = supportsFocusIn$1 ? 'focusin' : 'focus';
var blurEventName$1 = supportsFocusIn$1 ? 'focusout' : 'blur';

var className = 'ally-focus-within';
// defined in engage();
var selector$3 = void 0;
var blurTimer = void 0;
var shadowHandle$1 = void 0;

function applyFocusWithinClass(active) {
  var _active = active || getActiveElements();
  if (!supports$11.cssShadowPiercingDeepCombinator) {
    // no shadow-piercing descendant selector, no joy
    _active = _active.slice(-1);
  }

  // identify the elements that currently have :focus-within
  var _current = [].slice.call(document.querySelectorAll(selector$3), 0);
  // get the path (ancestry) of each ShadowRoot and merge them into a flat list
  var elements = _active.map(function (context) {
    return getParents({ context: context });
  }).reduce(function (previous, current) {
    return current.concat(previous);
  }, []);

  // remove the class only from elements that would not receive it again (minimize dom action)
  _current.forEach(function (element) {
    if (elements.indexOf(element) !== -1) {
      return;
    }

    removeClass(element, className);
  });

  // apply the class only to elements that do not yet have it (minimize dom action)
  elements.forEach(function (element) {
    if (_current.indexOf(element) !== -1) {
      return;
    }

    addClass(element, className);
  });
}

function handleDocumentBlurEvent() {
  // we won't get a focus for <body>, but a delayed blur handler will achieve
  // the same thing listening for focus would've done, unless we get a focus, of course
  blurTimer = (window.setImmediate || window.setTimeout)(function () {
    applyFocusWithinClass();
  });
}

function handleDocumentFocusEvent() {
  // abort any handlers that come from document or element blur handlers
  (window.clearImmediate || window.clearTimeout)(blurTimer);
  // NOTE: we could overcome Firefox 34 issue of not supporting ShadowRoot.host by
  // passing event.target (which references the first-level ShadowHost), but that
  // would require applyFocusWithinClass() to distinguish between the argument and
  // getActiveElements().
  applyFocusWithinClass();
}

function handleShadowFocusEvent(event) {
  applyFocusWithinClass(event.detail.elements);
}

function disengage$7() {
  shadowHandle$1 && shadowHandle$1.disengage();
  (window.clearImmediate || window.clearTimeout)(blurTimer);
  document.removeEventListener(blurEventName$1, handleDocumentBlurEvent, true);
  document.removeEventListener(focusEventName$1, handleDocumentFocusEvent, true);
  document.removeEventListener('shadow-focus', handleShadowFocusEvent, true);

  // remove any remaining ally-within-focus occurrences
  [].forEach.call(document.querySelectorAll(selector$3), function (element) {
    removeClass(element, className);
  });
}

function engage$7() {
  if (!supports$11) {
    supports$11 = _supports();
    selector$3 = selectInShadows('.' + className);
  }

  shadowHandle$1 = shadowFocus();
  document.addEventListener(blurEventName$1, handleDocumentBlurEvent, true);
  document.addEventListener(focusEventName$1, handleDocumentFocusEvent, true);
  document.addEventListener('shadow-focus', handleShadowFocusEvent, true);
  applyFocusWithinClass();
}

var focusWithin = decorateService({ engage: engage$7, disengage: disengage$7 });

// exporting modules to be included the UMD bundle

var style = {
  focusSource: focusSource,
  focusWithin: focusWithin
};

function getIntersectingRect(one, two) {
  // identify the rectangle that _element and _container overlap in
  var top = Math.max(one.top, two.top);
  var left = Math.max(one.left, two.left);
  // make sure bottom can't be above top, right can't be before left
  var right = Math.max(Math.min(one.right, two.right), left);
  var bottom = Math.max(Math.min(one.bottom, two.bottom), top);
  // return something resembling ClientRect
  return {
    top: top,
    right: right,
    bottom: bottom,
    left: left,
    width: right - left,
    height: bottom - top
  };
}

function getViewportRect() {
  var width = window.innerWidth || document.documentElement.clientWidth;
  var height = window.innerHeight || document.documentElement.clientHeight;
  // return something resembling ClientRect
  return {
    top: 0,
    right: width,
    bottom: height,
    left: 0,
    width: width,
    height: height
  };
}

function getInnerBoundingClientRect(element) {
  // convenience for the .reduce() in getScrollableParentRect()
  var rect = element.getBoundingClientRect();

  // remove the width of the scrollbar because that
  // area is not really considered visible
  // NOTE: assuming scrollbar is always to the right and bottom
  var scrollbarWidth = element.offsetWidth - element.clientWidth;
  var scrollbarHeight = element.offsetHeight - element.clientHeight;
  // cannot mutate rect because it has readonly properties
  var _rect = {
    top: rect.top,
    left: rect.left,
    right: rect.right - scrollbarWidth,
    bottom: rect.bottom - scrollbarHeight,
    width: rect.width - scrollbarWidth,
    height: rect.height - scrollbarHeight,
    area: 0
  };

  _rect.area = _rect.width * _rect.height;
  return _rect;
}

function isOverflowingElement(element) {
  var style = window.getComputedStyle(element, null);
  var value = 'visible';
  return style.getPropertyValue('overflow-x') !== value && style.getPropertyValue('overflow-y') !== value;
}

function isScrollableElement(element) {
  // an element not scrollable if it doesn't crop its content
  if (!isOverflowingElement(element)) {
    return false;
  }

  // an element is scrollable when it is smaller than its content
  return element.offsetHeight < element.scrollHeight || element.offsetWidth < element.scrollWidth;
}

function getScrollableParentRect(element) {
  // get largest possible space constrained by scrolling containers

  // find scrollable parents
  var scrollingContainers = getParents({ context: element }).slice(1).filter(isScrollableElement);

  if (!scrollingContainers.length) {
    // no containers, no joy
    return null;
  }

  // identify the currently visible intersection of all scrolling container parents
  return scrollingContainers.reduce(function (previous, current) {
    var rect = getInnerBoundingClientRect(current);
    var intersection = getIntersectingRect(rect, previous);
    // identify the smallest scrolling container so we know how much space
    // our element can fill at the most - note that this is NOT the area
    // of the intersection, intersection is just abused as a vehicle
    intersection.area = Math.min(rect.area, previous.area);
    return intersection;
  }, getInnerBoundingClientRect(scrollingContainers[0]));
}

var visibleArea = function visibleArea(element) {
  // dimensions of the element itself
  var _element = element.getBoundingClientRect();
  // dimensions of the viewport
  var _viewport = getViewportRect();
  // we need the area to know how much of the element can be displayed at the most
  _viewport.area = _viewport.width * _viewport.height;

  var _area = _viewport;
  // dimensions of the intersection of all scrollable parents
  var _container = getScrollableParentRect(element);
  if (_container) {
    if (!_container.width || !_container.height) {
      // scrollable containers without dimensions are invisible,
      // meaning that the element is not visible at all
      return 0;
    }

    // dimension the element can currently be rendered in
    _area = getIntersectingRect(_container, _viewport);
    _area.area = _container.area;
  }

  // dimension of the element currently rendered in identified space
  var _visible = getIntersectingRect(_element, _area);
  if (!_visible.width || !_visible.height) {
    // element is not shown within the identified area
    return 0;
  }

  // compare the element's currently visible size to the size it
  // could take up at the most, being either the element's actual
  // size, or the space theroetically made available if all
  // scrollable parents are aligned properly
  var area = _element.width * _element.height;
  var maxArea = Math.min(area, _area.area);
  // Firefox may return sub-pixel bounding client rect
  var visibleArea = Math.round(_visible.width) * Math.round(_visible.height) / maxArea;
  // Edge might not reach 0.5 exactly
  var factor = 10000;
  var roundedVisibleArea = Math.round(visibleArea * factor) / factor;
  // clamp the value at 1
  return Math.min(roundedVisibleArea, 1);
};

/*
  execute a callback once an element became fully visible in the viewport
*/

var whenVisibleArea = function whenVisibleArea() {
  var _ref38 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      context = _ref38.context,
      callback = _ref38.callback,
      area = _ref38.area;

  if (typeof callback !== 'function') {
    throw new TypeError('when/visible-area requires options.callback to be a function');
  }

  if (typeof area !== 'number') {
    area = 1;
  }

  var element = contextToElement({
    label: 'when/visible-area',
    context: context
  });

  var raf = void 0;
  var evaluate = null;
  var disengage = function disengage() {
    raf && cancelAnimationFrame(raf);
  };

  var predicate = function predicate() {
    return !isVisible(element) || visibleArea(element) < area || callback(element) === false;
  };

  var checkPredicate = function checkPredicate() {
    if (predicate()) {
      evaluate();
      return;
    }

    disengage();
  };

  evaluate = function evaluate() {
    raf = requestAnimationFrame(checkPredicate);
  };

  evaluate();
  return { disengage: disengage };
};

/*
  trigger a callback once the context element is focusable and is fully visible in the viewport
*/

var focusable$1 = function focusable$1() {
  var _ref39 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      context = _ref39.context,
      callback = _ref39.callback,
      area = _ref39.area;

  if (typeof callback !== 'function') {
    throw new TypeError('when/focusable requires options.callback to be a function');
  }

  var element = contextToElement({
    label: 'when/focusable',
    context: context
  });

  var filterCallback = function filterCallback(target) {
    if (!isFocusable(target)) {
      return false;
    }

    return callback(target);
  };

  var _document = getDocument(element);
  var handle = whenVisibleArea({ context: element, callback: filterCallback, area: area });
  var disengage = function disengage() {
    _document.removeEventListener('focus', disengage, true);
    handle && handle.disengage();
  };

  _document.addEventListener('focus', disengage, true);

  return { disengage: disengage };
};

// exporting modules to be included the UMD bundle

var when = {
  focusable: focusable$1,
  key: key,
  visibleArea: whenVisibleArea
};

// this builds up the UMD bundle

// save current window.ally for noConflict()
var conflicted = typeof window !== 'undefined' && window.ally;

var ally_js = {
  element: element,
  event: event,
  fix: fix,
  get: get,
  is: is,
  maintain: maintain,
  map: map,
  observe: observe,
  query: query,
  style: style,
  when: when,
  version: version$1,
  noConflict: function noConflict() {
    if (typeof window !== 'undefined' && window.ally === this) {
      window.ally = conflicted;
    }

    return this;
  }
};

module.exports = ally_js;

},{"css.escape":2,"platform":3}],2:[function(require,module,exports){
(function (global){
/*! https://mths.be/cssescape v1.5.1 by @mathias | MIT license */
;(function(root, factory) {
	// https://github.com/umdjs/umd/blob/master/returnExports.js
	if (typeof exports == 'object') {
		// For Node.js.
		module.exports = factory(root);
	} else if (typeof define == 'function' && define.amd) {
		// For AMD. Register as an anonymous module.
		define([], factory.bind(root, root));
	} else {
		// For browser globals (not exposing the function separately).
		factory(root);
	}
}(typeof global != 'undefined' ? global : this, function(root) {

	if (root.CSS && root.CSS.escape) {
		return root.CSS.escape;
	}

	// https://drafts.csswg.org/cssom/#serialize-an-identifier
	var cssEscape = function(value) {
		if (arguments.length == 0) {
			throw new TypeError('`CSS.escape` requires an argument.');
		}
		var string = String(value);
		var length = string.length;
		var index = -1;
		var codeUnit;
		var result = '';
		var firstCodeUnit = string.charCodeAt(0);
		while (++index < length) {
			codeUnit = string.charCodeAt(index);
			// Note: there’s no need to special-case astral symbols, surrogate
			// pairs, or lone surrogates.

			// If the character is NULL (U+0000), then the REPLACEMENT CHARACTER
			// (U+FFFD).
			if (codeUnit == 0x0000) {
				result += '\uFFFD';
				continue;
			}

			if (
				// If the character is in the range [\1-\1F] (U+0001 to U+001F) or is
				// U+007F, […]
				(codeUnit >= 0x0001 && codeUnit <= 0x001F) || codeUnit == 0x007F ||
				// If the character is the first character and is in the range [0-9]
				// (U+0030 to U+0039), […]
				(index == 0 && codeUnit >= 0x0030 && codeUnit <= 0x0039) ||
				// If the character is the second character and is in the range [0-9]
				// (U+0030 to U+0039) and the first character is a `-` (U+002D), […]
				(
					index == 1 &&
					codeUnit >= 0x0030 && codeUnit <= 0x0039 &&
					firstCodeUnit == 0x002D
				)
			) {
				// https://drafts.csswg.org/cssom/#escape-a-character-as-code-point
				result += '\\' + codeUnit.toString(16) + ' ';
				continue;
			}

			if (
				// If the character is the first character and is a `-` (U+002D), and
				// there is no second character, […]
				index == 0 &&
				length == 1 &&
				codeUnit == 0x002D
			) {
				result += '\\' + string.charAt(index);
				continue;
			}

			// If the character is not handled by one of the above rules and is
			// greater than or equal to U+0080, is `-` (U+002D) or `_` (U+005F), or
			// is in one of the ranges [0-9] (U+0030 to U+0039), [A-Z] (U+0041 to
			// U+005A), or [a-z] (U+0061 to U+007A), […]
			if (
				codeUnit >= 0x0080 ||
				codeUnit == 0x002D ||
				codeUnit == 0x005F ||
				codeUnit >= 0x0030 && codeUnit <= 0x0039 ||
				codeUnit >= 0x0041 && codeUnit <= 0x005A ||
				codeUnit >= 0x0061 && codeUnit <= 0x007A
			) {
				// the character itself
				result += string.charAt(index);
				continue;
			}

			// Otherwise, the escaped character.
			// https://drafts.csswg.org/cssom/#escape-a-character
			result += '\\' + string.charAt(index);

		}
		return result;
	};

	if (!root.CSS) {
		root.CSS = {};
	}

	root.CSS.escape = cssEscape;
	return cssEscape;

}));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],3:[function(require,module,exports){
(function (global){
/*!
 * Platform.js <https://mths.be/platform>
 * Copyright 2014-2016 Benjamin Tan <https://demoneaux.github.io/>
 * Copyright 2011-2013 John-David Dalton <http://allyoucanleet.com/>
 * Available under MIT license <https://mths.be/mit>
 */
;(function() {
  'use strict';

  /** Used to determine if values are of the language type `Object`. */
  var objectTypes = {
    'function': true,
    'object': true
  };

  /** Used as a reference to the global object. */
  var root = (objectTypes[typeof window] && window) || this;

  /** Backup possible global object. */
  var oldRoot = root;

  /** Detect free variable `exports`. */
  var freeExports = objectTypes[typeof exports] && exports;

  /** Detect free variable `module`. */
  var freeModule = objectTypes[typeof module] && module && !module.nodeType && module;

  /** Detect free variable `global` from Node.js or Browserified code and use it as `root`. */
  var freeGlobal = freeExports && freeModule && typeof global == 'object' && global;
  if (freeGlobal && (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal || freeGlobal.self === freeGlobal)) {
    root = freeGlobal;
  }

  /**
   * Used as the maximum length of an array-like object.
   * See the [ES6 spec](http://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength)
   * for more details.
   */
  var maxSafeInteger = Math.pow(2, 53) - 1;

  /** Regular expression to detect Opera. */
  var reOpera = /\bOpera/;

  /** Possible global object. */
  var thisBinding = this;

  /** Used for native method references. */
  var objectProto = Object.prototype;

  /** Used to check for own properties of an object. */
  var hasOwnProperty = objectProto.hasOwnProperty;

  /** Used to resolve the internal `[[Class]]` of values. */
  var toString = objectProto.toString;

  /*--------------------------------------------------------------------------*/

  /**
   * Capitalizes a string value.
   *
   * @private
   * @param {string} string The string to capitalize.
   * @returns {string} The capitalized string.
   */
  function capitalize(string) {
    string = String(string);
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  /**
   * A utility function to clean up the OS name.
   *
   * @private
   * @param {string} os The OS name to clean up.
   * @param {string} [pattern] A `RegExp` pattern matching the OS name.
   * @param {string} [label] A label for the OS.
   */
  function cleanupOS(os, pattern, label) {
    // Platform tokens are defined at:
    // http://msdn.microsoft.com/en-us/library/ms537503(VS.85).aspx
    // http://web.archive.org/web/20081122053950/http://msdn.microsoft.com/en-us/library/ms537503(VS.85).aspx
    var data = {
      '10.0': '10',
      '6.4':  '10 Technical Preview',
      '6.3':  '8.1',
      '6.2':  '8',
      '6.1':  'Server 2008 R2 / 7',
      '6.0':  'Server 2008 / Vista',
      '5.2':  'Server 2003 / XP 64-bit',
      '5.1':  'XP',
      '5.01': '2000 SP1',
      '5.0':  '2000',
      '4.0':  'NT',
      '4.90': 'ME'
    };
    // Detect Windows version from platform tokens.
    if (pattern && label && /^Win/i.test(os) && !/^Windows Phone /i.test(os) &&
        (data = data[/[\d.]+$/.exec(os)])) {
      os = 'Windows ' + data;
    }
    // Correct character case and cleanup string.
    os = String(os);

    if (pattern && label) {
      os = os.replace(RegExp(pattern, 'i'), label);
    }

    os = format(
      os.replace(/ ce$/i, ' CE')
        .replace(/\bhpw/i, 'web')
        .replace(/\bMacintosh\b/, 'Mac OS')
        .replace(/_PowerPC\b/i, ' OS')
        .replace(/\b(OS X) [^ \d]+/i, '$1')
        .replace(/\bMac (OS X)\b/, '$1')
        .replace(/\/(\d)/, ' $1')
        .replace(/_/g, '.')
        .replace(/(?: BePC|[ .]*fc[ \d.]+)$/i, '')
        .replace(/\bx86\.64\b/gi, 'x86_64')
        .replace(/\b(Windows Phone) OS\b/, '$1')
        .replace(/\b(Chrome OS \w+) [\d.]+\b/, '$1')
        .split(' on ')[0]
    );

    return os;
  }

  /**
   * An iteration utility for arrays and objects.
   *
   * @private
   * @param {Array|Object} object The object to iterate over.
   * @param {Function} callback The function called per iteration.
   */
  function each(object, callback) {
    var index = -1,
        length = object ? object.length : 0;

    if (typeof length == 'number' && length > -1 && length <= maxSafeInteger) {
      while (++index < length) {
        callback(object[index], index, object);
      }
    } else {
      forOwn(object, callback);
    }
  }

  /**
   * Trim and conditionally capitalize string values.
   *
   * @private
   * @param {string} string The string to format.
   * @returns {string} The formatted string.
   */
  function format(string) {
    string = trim(string);
    return /^(?:webOS|i(?:OS|P))/.test(string)
      ? string
      : capitalize(string);
  }

  /**
   * Iterates over an object's own properties, executing the `callback` for each.
   *
   * @private
   * @param {Object} object The object to iterate over.
   * @param {Function} callback The function executed per own property.
   */
  function forOwn(object, callback) {
    for (var key in object) {
      if (hasOwnProperty.call(object, key)) {
        callback(object[key], key, object);
      }
    }
  }

  /**
   * Gets the internal `[[Class]]` of a value.
   *
   * @private
   * @param {*} value The value.
   * @returns {string} The `[[Class]]`.
   */
  function getClassOf(value) {
    return value == null
      ? capitalize(value)
      : toString.call(value).slice(8, -1);
  }

  /**
   * Host objects can return type values that are different from their actual
   * data type. The objects we are concerned with usually return non-primitive
   * types of "object", "function", or "unknown".
   *
   * @private
   * @param {*} object The owner of the property.
   * @param {string} property The property to check.
   * @returns {boolean} Returns `true` if the property value is a non-primitive, else `false`.
   */
  function isHostType(object, property) {
    var type = object != null ? typeof object[property] : 'number';
    return !/^(?:boolean|number|string|undefined)$/.test(type) &&
      (type == 'object' ? !!object[property] : true);
  }

  /**
   * Prepares a string for use in a `RegExp` by making hyphens and spaces optional.
   *
   * @private
   * @param {string} string The string to qualify.
   * @returns {string} The qualified string.
   */
  function qualify(string) {
    return String(string).replace(/([ -])(?!$)/g, '$1?');
  }

  /**
   * A bare-bones `Array#reduce` like utility function.
   *
   * @private
   * @param {Array} array The array to iterate over.
   * @param {Function} callback The function called per iteration.
   * @returns {*} The accumulated result.
   */
  function reduce(array, callback) {
    var accumulator = null;
    each(array, function(value, index) {
      accumulator = callback(accumulator, value, index, array);
    });
    return accumulator;
  }

  /**
   * Removes leading and trailing whitespace from a string.
   *
   * @private
   * @param {string} string The string to trim.
   * @returns {string} The trimmed string.
   */
  function trim(string) {
    return String(string).replace(/^ +| +$/g, '');
  }

  /*--------------------------------------------------------------------------*/

  /**
   * Creates a new platform object.
   *
   * @memberOf platform
   * @param {Object|string} [ua=navigator.userAgent] The user agent string or
   *  context object.
   * @returns {Object} A platform object.
   */
  function parse(ua) {

    /** The environment context object. */
    var context = root;

    /** Used to flag when a custom context is provided. */
    var isCustomContext = ua && typeof ua == 'object' && getClassOf(ua) != 'String';

    // Juggle arguments.
    if (isCustomContext) {
      context = ua;
      ua = null;
    }

    /** Browser navigator object. */
    var nav = context.navigator || {};

    /** Browser user agent string. */
    var userAgent = nav.userAgent || '';

    ua || (ua = userAgent);

    /** Used to flag when `thisBinding` is the [ModuleScope]. */
    var isModuleScope = isCustomContext || thisBinding == oldRoot;

    /** Used to detect if browser is like Chrome. */
    var likeChrome = isCustomContext
      ? !!nav.likeChrome
      : /\bChrome\b/.test(ua) && !/internal|\n/i.test(toString.toString());

    /** Internal `[[Class]]` value shortcuts. */
    var objectClass = 'Object',
        airRuntimeClass = isCustomContext ? objectClass : 'ScriptBridgingProxyObject',
        enviroClass = isCustomContext ? objectClass : 'Environment',
        javaClass = (isCustomContext && context.java) ? 'JavaPackage' : getClassOf(context.java),
        phantomClass = isCustomContext ? objectClass : 'RuntimeObject';

    /** Detect Java environments. */
    var java = /\bJava/.test(javaClass) && context.java;

    /** Detect Rhino. */
    var rhino = java && getClassOf(context.environment) == enviroClass;

    /** A character to represent alpha. */
    var alpha = java ? 'a' : '\u03b1';

    /** A character to represent beta. */
    var beta = java ? 'b' : '\u03b2';

    /** Browser document object. */
    var doc = context.document || {};

    /**
     * Detect Opera browser (Presto-based).
     * http://www.howtocreate.co.uk/operaStuff/operaObject.html
     * http://dev.opera.com/articles/view/opera-mini-web-content-authoring-guidelines/#operamini
     */
    var opera = context.operamini || context.opera;

    /** Opera `[[Class]]`. */
    var operaClass = reOpera.test(operaClass = (isCustomContext && opera) ? opera['[[Class]]'] : getClassOf(opera))
      ? operaClass
      : (opera = null);

    /*------------------------------------------------------------------------*/

    /** Temporary variable used over the script's lifetime. */
    var data;

    /** The CPU architecture. */
    var arch = ua;

    /** Platform description array. */
    var description = [];

    /** Platform alpha/beta indicator. */
    var prerelease = null;

    /** A flag to indicate that environment features should be used to resolve the platform. */
    var useFeatures = ua == userAgent;

    /** The browser/environment version. */
    var version = useFeatures && opera && typeof opera.version == 'function' && opera.version();

    /** A flag to indicate if the OS ends with "/ Version" */
    var isSpecialCasedOS;

    /* Detectable layout engines (order is important). */
    var layout = getLayout([
      { 'label': 'EdgeHTML', 'pattern': 'Edge' },
      'Trident',
      { 'label': 'WebKit', 'pattern': 'AppleWebKit' },
      'iCab',
      'Presto',
      'NetFront',
      'Tasman',
      'KHTML',
      'Gecko'
    ]);

    /* Detectable browser names (order is important). */
    var name = getName([
      'Adobe AIR',
      'Arora',
      'Avant Browser',
      'Breach',
      'Camino',
      'Epiphany',
      'Fennec',
      'Flock',
      'Galeon',
      'GreenBrowser',
      'iCab',
      'Iceweasel',
      'K-Meleon',
      'Konqueror',
      'Lunascape',
      'Maxthon',
      { 'label': 'Microsoft Edge', 'pattern': 'Edge' },
      'Midori',
      'Nook Browser',
      'PaleMoon',
      'PhantomJS',
      'Raven',
      'Rekonq',
      'RockMelt',
      'SeaMonkey',
      { 'label': 'Silk', 'pattern': '(?:Cloud9|Silk-Accelerated)' },
      'Sleipnir',
      'SlimBrowser',
      { 'label': 'SRWare Iron', 'pattern': 'Iron' },
      'Sunrise',
      'Swiftfox',
      'WebPositive',
      'Opera Mini',
      { 'label': 'Opera Mini', 'pattern': 'OPiOS' },
      'Opera',
      { 'label': 'Opera', 'pattern': 'OPR' },
      'Chrome',
      { 'label': 'Chrome Mobile', 'pattern': '(?:CriOS|CrMo)' },
      { 'label': 'Firefox', 'pattern': '(?:Firefox|Minefield)' },
      { 'label': 'Firefox for iOS', 'pattern': 'FxiOS' },
      { 'label': 'IE', 'pattern': 'IEMobile' },
      { 'label': 'IE', 'pattern': 'MSIE' },
      'Safari'
    ]);

    /* Detectable products (order is important). */
    var product = getProduct([
      { 'label': 'BlackBerry', 'pattern': 'BB10' },
      'BlackBerry',
      { 'label': 'Galaxy S', 'pattern': 'GT-I9000' },
      { 'label': 'Galaxy S2', 'pattern': 'GT-I9100' },
      { 'label': 'Galaxy S3', 'pattern': 'GT-I9300' },
      { 'label': 'Galaxy S4', 'pattern': 'GT-I9500' },
      'Google TV',
      'Lumia',
      'iPad',
      'iPod',
      'iPhone',
      'Kindle',
      { 'label': 'Kindle Fire', 'pattern': '(?:Cloud9|Silk-Accelerated)' },
      'Nexus',
      'Nook',
      'PlayBook',
      'PlayStation 3',
      'PlayStation 4',
      'PlayStation Vita',
      'TouchPad',
      'Transformer',
      { 'label': 'Wii U', 'pattern': 'WiiU' },
      'Wii',
      'Xbox One',
      { 'label': 'Xbox 360', 'pattern': 'Xbox' },
      'Xoom'
    ]);

    /* Detectable manufacturers. */
    var manufacturer = getManufacturer({
      'Apple': { 'iPad': 1, 'iPhone': 1, 'iPod': 1 },
      'Archos': {},
      'Amazon': { 'Kindle': 1, 'Kindle Fire': 1 },
      'Asus': { 'Transformer': 1 },
      'Barnes & Noble': { 'Nook': 1 },
      'BlackBerry': { 'PlayBook': 1 },
      'Google': { 'Google TV': 1, 'Nexus': 1 },
      'HP': { 'TouchPad': 1 },
      'HTC': {},
      'LG': {},
      'Microsoft': { 'Xbox': 1, 'Xbox One': 1 },
      'Motorola': { 'Xoom': 1 },
      'Nintendo': { 'Wii U': 1,  'Wii': 1 },
      'Nokia': { 'Lumia': 1 },
      'Samsung': { 'Galaxy S': 1, 'Galaxy S2': 1, 'Galaxy S3': 1, 'Galaxy S4': 1 },
      'Sony': { 'PlayStation 4': 1, 'PlayStation 3': 1, 'PlayStation Vita': 1 }
    });

    /* Detectable operating systems (order is important). */
    var os = getOS([
      'Windows Phone',
      'Android',
      'CentOS',
      { 'label': 'Chrome OS', 'pattern': 'CrOS' },
      'Debian',
      'Fedora',
      'FreeBSD',
      'Gentoo',
      'Haiku',
      'Kubuntu',
      'Linux Mint',
      'OpenBSD',
      'Red Hat',
      'SuSE',
      'Ubuntu',
      'Xubuntu',
      'Cygwin',
      'Symbian OS',
      'hpwOS',
      'webOS ',
      'webOS',
      'Tablet OS',
      'Linux',
      'Mac OS X',
      'Macintosh',
      'Mac',
      'Windows 98;',
      'Windows '
    ]);

    /*------------------------------------------------------------------------*/

    /**
     * Picks the layout engine from an array of guesses.
     *
     * @private
     * @param {Array} guesses An array of guesses.
     * @returns {null|string} The detected layout engine.
     */
    function getLayout(guesses) {
      return reduce(guesses, function(result, guess) {
        return result || RegExp('\\b' + (
          guess.pattern || qualify(guess)
        ) + '\\b', 'i').exec(ua) && (guess.label || guess);
      });
    }

    /**
     * Picks the manufacturer from an array of guesses.
     *
     * @private
     * @param {Array} guesses An object of guesses.
     * @returns {null|string} The detected manufacturer.
     */
    function getManufacturer(guesses) {
      return reduce(guesses, function(result, value, key) {
        // Lookup the manufacturer by product or scan the UA for the manufacturer.
        return result || (
          value[product] ||
          value[/^[a-z]+(?: +[a-z]+\b)*/i.exec(product)] ||
          RegExp('\\b' + qualify(key) + '(?:\\b|\\w*\\d)', 'i').exec(ua)
        ) && key;
      });
    }

    /**
     * Picks the browser name from an array of guesses.
     *
     * @private
     * @param {Array} guesses An array of guesses.
     * @returns {null|string} The detected browser name.
     */
    function getName(guesses) {
      return reduce(guesses, function(result, guess) {
        return result || RegExp('\\b' + (
          guess.pattern || qualify(guess)
        ) + '\\b', 'i').exec(ua) && (guess.label || guess);
      });
    }

    /**
     * Picks the OS name from an array of guesses.
     *
     * @private
     * @param {Array} guesses An array of guesses.
     * @returns {null|string} The detected OS name.
     */
    function getOS(guesses) {
      return reduce(guesses, function(result, guess) {
        var pattern = guess.pattern || qualify(guess);
        if (!result && (result =
              RegExp('\\b' + pattern + '(?:/[\\d.]+|[ \\w.]*)', 'i').exec(ua)
            )) {
          result = cleanupOS(result, pattern, guess.label || guess);
        }
        return result;
      });
    }

    /**
     * Picks the product name from an array of guesses.
     *
     * @private
     * @param {Array} guesses An array of guesses.
     * @returns {null|string} The detected product name.
     */
    function getProduct(guesses) {
      return reduce(guesses, function(result, guess) {
        var pattern = guess.pattern || qualify(guess);
        if (!result && (result =
              RegExp('\\b' + pattern + ' *\\d+[.\\w_]*', 'i').exec(ua) ||
              RegExp('\\b' + pattern + '(?:; *(?:[a-z]+[_-])?[a-z]+\\d+|[^ ();-]*)', 'i').exec(ua)
            )) {
          // Split by forward slash and append product version if needed.
          if ((result = String((guess.label && !RegExp(pattern, 'i').test(guess.label)) ? guess.label : result).split('/'))[1] && !/[\d.]+/.test(result[0])) {
            result[0] += ' ' + result[1];
          }
          // Correct character case and cleanup string.
          guess = guess.label || guess;
          result = format(result[0]
            .replace(RegExp(pattern, 'i'), guess)
            .replace(RegExp('; *(?:' + guess + '[_-])?', 'i'), ' ')
            .replace(RegExp('(' + guess + ')[-_.]?(\\w)', 'i'), '$1 $2'));
        }
        return result;
      });
    }

    /**
     * Resolves the version using an array of UA patterns.
     *
     * @private
     * @param {Array} patterns An array of UA patterns.
     * @returns {null|string} The detected version.
     */
    function getVersion(patterns) {
      return reduce(patterns, function(result, pattern) {
        return result || (RegExp(pattern +
          '(?:-[\\d.]+/|(?: for [\\w-]+)?[ /-])([\\d.]+[^ ();/_-]*)', 'i').exec(ua) || 0)[1] || null;
      });
    }

    /**
     * Returns `platform.description` when the platform object is coerced to a string.
     *
     * @name toString
     * @memberOf platform
     * @returns {string} Returns `platform.description` if available, else an empty string.
     */
    function toStringPlatform() {
      return this.description || '';
    }

    /*------------------------------------------------------------------------*/

    // Convert layout to an array so we can add extra details.
    layout && (layout = [layout]);

    // Detect product names that contain their manufacturer's name.
    if (manufacturer && !product) {
      product = getProduct([manufacturer]);
    }
    // Clean up Google TV.
    if ((data = /\bGoogle TV\b/.exec(product))) {
      product = data[0];
    }
    // Detect simulators.
    if (/\bSimulator\b/i.test(ua)) {
      product = (product ? product + ' ' : '') + 'Simulator';
    }
    // Detect Opera Mini 8+ running in Turbo/Uncompressed mode on iOS.
    if (name == 'Opera Mini' && /\bOPiOS\b/.test(ua)) {
      description.push('running in Turbo/Uncompressed mode');
    }
    // Detect IE Mobile 11.
    if (name == 'IE' && /\blike iPhone OS\b/.test(ua)) {
      data = parse(ua.replace(/like iPhone OS/, ''));
      manufacturer = data.manufacturer;
      product = data.product;
    }
    // Detect iOS.
    else if (/^iP/.test(product)) {
      name || (name = 'Safari');
      os = 'iOS' + ((data = / OS ([\d_]+)/i.exec(ua))
        ? ' ' + data[1].replace(/_/g, '.')
        : '');
    }
    // Detect Kubuntu.
    else if (name == 'Konqueror' && !/buntu/i.test(os)) {
      os = 'Kubuntu';
    }
    // Detect Android browsers.
    else if ((manufacturer && manufacturer != 'Google' &&
        ((/Chrome/.test(name) && !/\bMobile Safari\b/i.test(ua)) || /\bVita\b/.test(product))) ||
        (/\bAndroid\b/.test(os) && /^Chrome/.test(name) && /\bVersion\//i.test(ua))) {
      name = 'Android Browser';
      os = /\bAndroid\b/.test(os) ? os : 'Android';
    }
    // Detect Silk desktop/accelerated modes.
    else if (name == 'Silk') {
      if (!/\bMobi/i.test(ua)) {
        os = 'Android';
        description.unshift('desktop mode');
      }
      if (/Accelerated *= *true/i.test(ua)) {
        description.unshift('accelerated');
      }
    }
    // Detect PaleMoon identifying as Firefox.
    else if (name == 'PaleMoon' && (data = /\bFirefox\/([\d.]+)\b/.exec(ua))) {
      description.push('identifying as Firefox ' + data[1]);
    }
    // Detect Firefox OS and products running Firefox.
    else if (name == 'Firefox' && (data = /\b(Mobile|Tablet|TV)\b/i.exec(ua))) {
      os || (os = 'Firefox OS');
      product || (product = data[1]);
    }
    // Detect false positives for Firefox/Safari.
    else if (!name || (data = !/\bMinefield\b/i.test(ua) && /\b(?:Firefox|Safari)\b/.exec(name))) {
      // Escape the `/` for Firefox 1.
      if (name && !product && /[\/,]|^[^(]+?\)/.test(ua.slice(ua.indexOf(data + '/') + 8))) {
        // Clear name of false positives.
        name = null;
      }
      // Reassign a generic name.
      if ((data = product || manufacturer || os) &&
          (product || manufacturer || /\b(?:Android|Symbian OS|Tablet OS|webOS)\b/.test(os))) {
        name = /[a-z]+(?: Hat)?/i.exec(/\bAndroid\b/.test(os) ? os : data) + ' Browser';
      }
    }
    // Detect non-Opera (Presto-based) versions (order is important).
    if (!version) {
      version = getVersion([
        '(?:Cloud9|CriOS|CrMo|Edge|FxiOS|IEMobile|Iron|Opera ?Mini|OPiOS|OPR|Raven|Silk(?!/[\\d.]+$))',
        'Version',
        qualify(name),
        '(?:Firefox|Minefield|NetFront)'
      ]);
    }
    // Detect stubborn layout engines.
    if ((data =
          layout == 'iCab' && parseFloat(version) > 3 && 'WebKit' ||
          /\bOpera\b/.test(name) && (/\bOPR\b/.test(ua) ? 'Blink' : 'Presto') ||
          /\b(?:Midori|Nook|Safari)\b/i.test(ua) && !/^(?:Trident|EdgeHTML)$/.test(layout) && 'WebKit' ||
          !layout && /\bMSIE\b/i.test(ua) && (os == 'Mac OS' ? 'Tasman' : 'Trident') ||
          layout == 'WebKit' && /\bPlayStation\b(?! Vita\b)/i.test(name) && 'NetFront'
        )) {
      layout = [data];
    }
    // Detect Windows Phone 7 desktop mode.
    if (name == 'IE' && (data = (/; *(?:XBLWP|ZuneWP)(\d+)/i.exec(ua) || 0)[1])) {
      name += ' Mobile';
      os = 'Windows Phone ' + (/\+$/.test(data) ? data : data + '.x');
      description.unshift('desktop mode');
    }
    // Detect Windows Phone 8.x desktop mode.
    else if (/\bWPDesktop\b/i.test(ua)) {
      name = 'IE Mobile';
      os = 'Windows Phone 8.x';
      description.unshift('desktop mode');
      version || (version = (/\brv:([\d.]+)/.exec(ua) || 0)[1]);
    }
    // Detect IE 11.
    else if (name != 'IE' && layout == 'Trident' && (data = /\brv:([\d.]+)/.exec(ua))) {
      if (name) {
        description.push('identifying as ' + name + (version ? ' ' + version : ''));
      }
      name = 'IE';
      version = data[1];
    }
    // Leverage environment features.
    if (useFeatures) {
      // Detect server-side environments.
      // Rhino has a global function while others have a global object.
      if (isHostType(context, 'global')) {
        if (java) {
          data = java.lang.System;
          arch = data.getProperty('os.arch');
          os = os || data.getProperty('os.name') + ' ' + data.getProperty('os.version');
        }
        if (isModuleScope && isHostType(context, 'system') && (data = [context.system])[0]) {
          os || (os = data[0].os || null);
          try {
            data[1] = context.require('ringo/engine').version;
            version = data[1].join('.');
            name = 'RingoJS';
          } catch(e) {
            if (data[0].global.system == context.system) {
              name = 'Narwhal';
            }
          }
        }
        else if (
          typeof context.process == 'object' && !context.process.browser &&
          (data = context.process)
        ) {
          name = 'Node.js';
          arch = data.arch;
          os = data.platform;
          version = /[\d.]+/.exec(data.version)[0];
        }
        else if (rhino) {
          name = 'Rhino';
        }
      }
      // Detect Adobe AIR.
      else if (getClassOf((data = context.runtime)) == airRuntimeClass) {
        name = 'Adobe AIR';
        os = data.flash.system.Capabilities.os;
      }
      // Detect PhantomJS.
      else if (getClassOf((data = context.phantom)) == phantomClass) {
        name = 'PhantomJS';
        version = (data = data.version || null) && (data.major + '.' + data.minor + '.' + data.patch);
      }
      // Detect IE compatibility modes.
      else if (typeof doc.documentMode == 'number' && (data = /\bTrident\/(\d+)/i.exec(ua))) {
        // We're in compatibility mode when the Trident version + 4 doesn't
        // equal the document mode.
        version = [version, doc.documentMode];
        if ((data = +data[1] + 4) != version[1]) {
          description.push('IE ' + version[1] + ' mode');
          layout && (layout[1] = '');
          version[1] = data;
        }
        version = name == 'IE' ? String(version[1].toFixed(1)) : version[0];
      }
      os = os && format(os);
    }
    // Detect prerelease phases.
    if (version && (data =
          /(?:[ab]|dp|pre|[ab]\d+pre)(?:\d+\+?)?$/i.exec(version) ||
          /(?:alpha|beta)(?: ?\d)?/i.exec(ua + ';' + (useFeatures && nav.appMinorVersion)) ||
          /\bMinefield\b/i.test(ua) && 'a'
        )) {
      prerelease = /b/i.test(data) ? 'beta' : 'alpha';
      version = version.replace(RegExp(data + '\\+?$'), '') +
        (prerelease == 'beta' ? beta : alpha) + (/\d+\+?/.exec(data) || '');
    }
    // Detect Firefox Mobile.
    if (name == 'Fennec' || name == 'Firefox' && /\b(?:Android|Firefox OS)\b/.test(os)) {
      name = 'Firefox Mobile';
    }
    // Obscure Maxthon's unreliable version.
    else if (name == 'Maxthon' && version) {
      version = version.replace(/\.[\d.]+/, '.x');
    }
    // Detect Xbox 360 and Xbox One.
    else if (/\bXbox\b/i.test(product)) {
      os = null;
      if (product == 'Xbox 360' && /\bIEMobile\b/.test(ua)) {
        description.unshift('mobile mode');
      }
    }
    // Add mobile postfix.
    else if ((/^(?:Chrome|IE|Opera)$/.test(name) || name && !product && !/Browser|Mobi/.test(name)) &&
        (os == 'Windows CE' || /Mobi/i.test(ua))) {
      name += ' Mobile';
    }
    // Detect IE platform preview.
    else if (name == 'IE' && useFeatures && context.external === null) {
      description.unshift('platform preview');
    }
    // Detect BlackBerry OS version.
    // http://docs.blackberry.com/en/developers/deliverables/18169/HTTP_headers_sent_by_BB_Browser_1234911_11.jsp
    else if ((/\bBlackBerry\b/.test(product) || /\bBB10\b/.test(ua)) && (data =
          (RegExp(product.replace(/ +/g, ' *') + '/([.\\d]+)', 'i').exec(ua) || 0)[1] ||
          version
        )) {
      data = [data, /BB10/.test(ua)];
      os = (data[1] ? (product = null, manufacturer = 'BlackBerry') : 'Device Software') + ' ' + data[0];
      version = null;
    }
    // Detect Opera identifying/masking itself as another browser.
    // http://www.opera.com/support/kb/view/843/
    else if (this != forOwn && product != 'Wii' && (
          (useFeatures && opera) ||
          (/Opera/.test(name) && /\b(?:MSIE|Firefox)\b/i.test(ua)) ||
          (name == 'Firefox' && /\bOS X (?:\d+\.){2,}/.test(os)) ||
          (name == 'IE' && (
            (os && !/^Win/.test(os) && version > 5.5) ||
            /\bWindows XP\b/.test(os) && version > 8 ||
            version == 8 && !/\bTrident\b/.test(ua)
          ))
        ) && !reOpera.test((data = parse.call(forOwn, ua.replace(reOpera, '') + ';'))) && data.name) {
      // When "identifying", the UA contains both Opera and the other browser's name.
      data = 'ing as ' + data.name + ((data = data.version) ? ' ' + data : '');
      if (reOpera.test(name)) {
        if (/\bIE\b/.test(data) && os == 'Mac OS') {
          os = null;
        }
        data = 'identify' + data;
      }
      // When "masking", the UA contains only the other browser's name.
      else {
        data = 'mask' + data;
        if (operaClass) {
          name = format(operaClass.replace(/([a-z])([A-Z])/g, '$1 $2'));
        } else {
          name = 'Opera';
        }
        if (/\bIE\b/.test(data)) {
          os = null;
        }
        if (!useFeatures) {
          version = null;
        }
      }
      layout = ['Presto'];
      description.push(data);
    }
    // Detect WebKit Nightly and approximate Chrome/Safari versions.
    if ((data = (/\bAppleWebKit\/([\d.]+\+?)/i.exec(ua) || 0)[1])) {
      // Correct build number for numeric comparison.
      // (e.g. "532.5" becomes "532.05")
      data = [parseFloat(data.replace(/\.(\d)$/, '.0$1')), data];
      // Nightly builds are postfixed with a "+".
      if (name == 'Safari' && data[1].slice(-1) == '+') {
        name = 'WebKit Nightly';
        prerelease = 'alpha';
        version = data[1].slice(0, -1);
      }
      // Clear incorrect browser versions.
      else if (version == data[1] ||
          version == (data[2] = (/\bSafari\/([\d.]+\+?)/i.exec(ua) || 0)[1])) {
        version = null;
      }
      // Use the full Chrome version when available.
      data[1] = (/\bChrome\/([\d.]+)/i.exec(ua) || 0)[1];
      // Detect Blink layout engine.
      if (data[0] == 537.36 && data[2] == 537.36 && parseFloat(data[1]) >= 28 && layout == 'WebKit') {
        layout = ['Blink'];
      }
      // Detect JavaScriptCore.
      // http://stackoverflow.com/questions/6768474/how-can-i-detect-which-javascript-engine-v8-or-jsc-is-used-at-runtime-in-androi
      if (!useFeatures || (!likeChrome && !data[1])) {
        layout && (layout[1] = 'like Safari');
        data = (data = data[0], data < 400 ? 1 : data < 500 ? 2 : data < 526 ? 3 : data < 533 ? 4 : data < 534 ? '4+' : data < 535 ? 5 : data < 537 ? 6 : data < 538 ? 7 : data < 601 ? 8 : '8');
      } else {
        layout && (layout[1] = 'like Chrome');
        data = data[1] || (data = data[0], data < 530 ? 1 : data < 532 ? 2 : data < 532.05 ? 3 : data < 533 ? 4 : data < 534.03 ? 5 : data < 534.07 ? 6 : data < 534.10 ? 7 : data < 534.13 ? 8 : data < 534.16 ? 9 : data < 534.24 ? 10 : data < 534.30 ? 11 : data < 535.01 ? 12 : data < 535.02 ? '13+' : data < 535.07 ? 15 : data < 535.11 ? 16 : data < 535.19 ? 17 : data < 536.05 ? 18 : data < 536.10 ? 19 : data < 537.01 ? 20 : data < 537.11 ? '21+' : data < 537.13 ? 23 : data < 537.18 ? 24 : data < 537.24 ? 25 : data < 537.36 ? 26 : layout != 'Blink' ? '27' : '28');
      }
      // Add the postfix of ".x" or "+" for approximate versions.
      layout && (layout[1] += ' ' + (data += typeof data == 'number' ? '.x' : /[.+]/.test(data) ? '' : '+'));
      // Obscure version for some Safari 1-2 releases.
      if (name == 'Safari' && (!version || parseInt(version) > 45)) {
        version = data;
      }
    }
    // Detect Opera desktop modes.
    if (name == 'Opera' &&  (data = /\bzbov|zvav$/.exec(os))) {
      name += ' ';
      description.unshift('desktop mode');
      if (data == 'zvav') {
        name += 'Mini';
        version = null;
      } else {
        name += 'Mobile';
      }
      os = os.replace(RegExp(' *' + data + '$'), '');
    }
    // Detect Chrome desktop mode.
    else if (name == 'Safari' && /\bChrome\b/.exec(layout && layout[1])) {
      description.unshift('desktop mode');
      name = 'Chrome Mobile';
      version = null;

      if (/\bOS X\b/.test(os)) {
        manufacturer = 'Apple';
        os = 'iOS 4.3+';
      } else {
        os = null;
      }
    }
    // Strip incorrect OS versions.
    if (version && version.indexOf((data = /[\d.]+$/.exec(os))) == 0 &&
        ua.indexOf('/' + data + '-') > -1) {
      os = trim(os.replace(data, ''));
    }
    // Add layout engine.
    if (layout && !/\b(?:Avant|Nook)\b/.test(name) && (
        /Browser|Lunascape|Maxthon/.test(name) ||
        name != 'Safari' && /^iOS/.test(os) && /\bSafari\b/.test(layout[1]) ||
        /^(?:Adobe|Arora|Breach|Midori|Opera|Phantom|Rekonq|Rock|Sleipnir|Web)/.test(name) && layout[1])) {
      // Don't add layout details to description if they are falsey.
      (data = layout[layout.length - 1]) && description.push(data);
    }
    // Combine contextual information.
    if (description.length) {
      description = ['(' + description.join('; ') + ')'];
    }
    // Append manufacturer to description.
    if (manufacturer && product && product.indexOf(manufacturer) < 0) {
      description.push('on ' + manufacturer);
    }
    // Append product to description.
    if (product) {
      description.push((/^on /.test(description[description.length - 1]) ? '' : 'on ') + product);
    }
    // Parse the OS into an object.
    if (os) {
      data = / ([\d.+]+)$/.exec(os);
      isSpecialCasedOS = data && os.charAt(os.length - data[0].length - 1) == '/';
      os = {
        'architecture': 32,
        'family': (data && !isSpecialCasedOS) ? os.replace(data[0], '') : os,
        'version': data ? data[1] : null,
        'toString': function() {
          var version = this.version;
          return this.family + ((version && !isSpecialCasedOS) ? ' ' + version : '') + (this.architecture == 64 ? ' 64-bit' : '');
        }
      };
    }
    // Add browser/OS architecture.
    if ((data = /\b(?:AMD|IA|Win|WOW|x86_|x)64\b/i.exec(arch)) && !/\bi686\b/i.test(arch)) {
      if (os) {
        os.architecture = 64;
        os.family = os.family.replace(RegExp(' *' + data), '');
      }
      if (
          name && (/\bWOW64\b/i.test(ua) ||
          (useFeatures && /\w(?:86|32)$/.test(nav.cpuClass || nav.platform) && !/\bWin64; x64\b/i.test(ua)))
      ) {
        description.unshift('32-bit');
      }
    }
    // Chrome 39 and above on OS X is always 64-bit.
    else if (
        os && /^OS X/.test(os.family) &&
        name == 'Chrome' && parseFloat(version) >= 39
    ) {
      os.architecture = 64;
    }

    ua || (ua = null);

    /*------------------------------------------------------------------------*/

    /**
     * The platform object.
     *
     * @name platform
     * @type Object
     */
    var platform = {};

    /**
     * The platform description.
     *
     * @memberOf platform
     * @type string|null
     */
    platform.description = ua;

    /**
     * The name of the browser's layout engine.
     *
     * @memberOf platform
     * @type string|null
     */
    platform.layout = layout && layout[0];

    /**
     * The name of the product's manufacturer.
     *
     * @memberOf platform
     * @type string|null
     */
    platform.manufacturer = manufacturer;

    /**
     * The name of the browser/environment.
     *
     * @memberOf platform
     * @type string|null
     */
    platform.name = name;

    /**
     * The alpha/beta release indicator.
     *
     * @memberOf platform
     * @type string|null
     */
    platform.prerelease = prerelease;

    /**
     * The name of the product hosting the browser.
     *
     * @memberOf platform
     * @type string|null
     */
    platform.product = product;

    /**
     * The browser's user agent string.
     *
     * @memberOf platform
     * @type string|null
     */
    platform.ua = ua;

    /**
     * The browser/environment version.
     *
     * @memberOf platform
     * @type string|null
     */
    platform.version = name && version;

    /**
     * The name of the operating system.
     *
     * @memberOf platform
     * @type Object
     */
    platform.os = os || {

      /**
       * The CPU architecture the OS is built for.
       *
       * @memberOf platform.os
       * @type number|null
       */
      'architecture': null,

      /**
       * The family of the OS.
       *
       * Common values include:
       * "Windows", "Windows Server 2008 R2 / 7", "Windows Server 2008 / Vista",
       * "Windows XP", "OS X", "Ubuntu", "Debian", "Fedora", "Red Hat", "SuSE",
       * "Android", "iOS" and "Windows Phone"
       *
       * @memberOf platform.os
       * @type string|null
       */
      'family': null,

      /**
       * The version of the OS.
       *
       * @memberOf platform.os
       * @type string|null
       */
      'version': null,

      /**
       * Returns the OS string.
       *
       * @memberOf platform.os
       * @returns {string} The OS string.
       */
      'toString': function() { return 'null'; }
    };

    platform.parse = parse;
    platform.toString = toStringPlatform;

    if (platform.version) {
      description.unshift(version);
    }
    if (platform.name) {
      description.unshift(name);
    }
    if (os && name && !(os == String(os).split(' ')[0] && (os == name.split(' ')[0] || product))) {
      description.push(product ? '(' + os + ')' : 'on ' + os);
    }
    if (description.length) {
      platform.description = description.join(' ');
    }
    return platform;
  }

  /*--------------------------------------------------------------------------*/

  // Export platform.
  var platform = parse();

  // Some AMD build optimizers, like r.js, check for condition patterns like the following:
  if (typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
    // Expose platform on the global object to prevent errors when platform is
    // loaded by a script tag in the presence of an AMD loader.
    // See http://requirejs.org/docs/errors.html#mismatch for more details.
    root.platform = platform;

    // Define as an anonymous module so platform can be aliased through path mapping.
    define(function() {
      return platform;
    });
  }
  // Check for `exports` after `define` in case a build optimizer adds an `exports` object.
  else if (freeExports && freeModule) {
    // Export for CommonJS support.
    forOwn(platform, function(value, key) {
      freeExports[key] = value;
    });
  }
  else {
    // Export to the global object.
    root.platform = platform;
  }
}.call(this));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}]},{},[1])(1)
});
//# sourceMappingURL=ally.js.map
