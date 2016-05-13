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

let defaultServerUrl = 'https://languagetool.org:8081/';   // keep in sync with defaultServerUrl in options.js
let unsupportedSitesRegex = /^(https?:\/\/(docs|chrome).google.com.*)|(file:.*)/;

var testMode = false;
var serverUrl = defaultServerUrl;
var ignoreQuotedLines = true;
var quotedLinesIgnored = false;
var motherTongue = "";
var preferredVariants = [];
var manuallySelectedLanguage = "";

function getCheckResult(markupList, callback, errorCallback) {
    let req = new XMLHttpRequest();
    req.timeout = 60 * 1000; // milliseconds
    req.open('POST', serverUrl);
    req.onload = function() {
        let response = req.response;
        if (!response) {
            errorCallback(chrome.i18n.getMessage("noResponseFromServer", serverUrl));
            return;
        }
        if (req.status !== 200) {
            errorCallback(chrome.i18n.getMessage("noValidResponseFromServer", [serverUrl, req.response, req.status]));
            return;
        }
        callback(response);
    };
    req.onerror = function() {
        errorCallback(chrome.i18n.getMessage("networkError", serverUrl));
    };
    req.ontimeout = function() {
        errorCallback(chrome.i18n.getMessage("timeoutError", serverUrl));
    };
    let text = Markup.markupList2text(markupList);
    if (ignoreQuotedLines) {
        var textOrig = text;
        // A hack so the following replacements don't happen on messed up character positions.
        // See https://github.com/languagetool-org/languagetool-browser-addon/issues/25:
        text = text.replace(/^>.*?\n/gm, function(match) {
            return " ".repeat(match.length - 1) + "\n";
        });
        quotedLinesIgnored = text != textOrig;
    }
    var params = 'disabled=WHITESPACE_RULE' +   // needed because we might replace quoted text by spaces (see issue #25) 
                 '&useragent=chrome-extension&text=' + encodeURIComponent(text);
    if (motherTongue) {
        params += "&motherTongue=" + motherTongue;
    }
    if (manuallySelectedLanguage) {
        params += "&language=" + manuallySelectedLanguage;
        manuallySelectedLanguage = "";
    } else {
        params += "&autodetect=1";
        if (preferredVariants.length > 0) {
            params += "&preferredvariants=" + preferredVariants;
        }
    }
    req.send(params);
}

function renderStatus(statusHtml) {
    document.getElementById('status').innerHTML = statusHtml;
}

function renderMatchesToHtml(resultXml, response, tabs, callback) {
    let createLinks = response.isEditableText;
    let dom = (new window.DOMParser()).parseFromString(resultXml, "text/xml");
    let language = dom.getElementsByTagName("language")[0].getAttribute("name");
    let languageCode = dom.getElementsByTagName("language")[0].getAttribute("shortname");
    var translatedLanguage = chrome.i18n.getMessage(languageCode.replace(/-/, "_"));
    if (!translatedLanguage) {
        let shortCode = languageCode.replace(/-.*/, "");
        translatedLanguage = chrome.i18n.getMessage(shortCode);  // needed for e.g. "ru-RU"
    }
    if (!translatedLanguage) {
        translatedLanguage = language;
    }
    var html = '<a id="closeLink" href="#"></a>';
    html += getLanguageSelector(languageCode);
    let matches = dom.getElementsByTagName("error");
    var prevErrStart = -1;
    var prevErrLen = -1;
    html += "<br><br>";
    let storage = chrome.storage.sync ? chrome.storage.sync : chrome.storage.local;
    storage.get({
        dictionary: []
    }, function(items) {
        var matchesCount = 0;
        for (let match in matches) {
            let m = matches[match];
            if (m.getAttribute) {
                let context = m.getAttribute("context");
                let errStart = parseInt(m.getAttribute("contextoffset"));
                let errLen = parseInt(m.getAttribute("errorlength"));
                let word = context.substr(errStart, errLen);
                let ruleId = m.getAttribute("ruleId");
                let isSpellingError = ruleId.indexOf("MORFOLOGIK") != -1 || ruleId.indexOf("HUNSPELL") != -1 || ruleId.indexOf("SPELLER_RULE") != -1;
                // Also accept uppercase versions of lowercase words in personal dict:
                var ignoreSpellingError = false;
                if (isSpellingError) {
                    let knowToDict = items.dictionary.indexOf(word) != -1;
                    if (knowToDict) {
                        ignoreSpellingError = true;
                    }  else if (!knowToDict && Tools.startWithUppercase(word)) {
                        ignoreSpellingError = items.dictionary.indexOf(Tools.lowerCaseFirstChar(word)) != -1;
                    }
                }
                if (!ignoreSpellingError && (errStart != prevErrStart || errLen != prevErrLen)) {
                    html += Tools.escapeHtml(m.getAttribute("msg"));
                    html += renderContext(m.getAttribute("context"), errStart, errLen);
                    html += renderReplacements(context, m, createLinks);
                    if (isSpellingError) {
                        let escapedWord = Tools.escapeHtml(word);
                        html += "<div class='addToDict'><a data-addtodict='" + escapedWord + "' " +
                                "title='" + chrome.i18n.getMessage("addToDictionaryTitle", escapedWord) + "'" +
                                "href='' class='addToDictLink'>" + chrome.i18n.getMessage("addToDictionary") + "</a></div>";
                    }
                    html += "<hr>";
                    matchesCount++;
                }
                prevErrStart = errStart;
                prevErrLen = errLen;
            }
        }
        if (matchesCount == 0) {
            html += chrome.i18n.getMessage("noErrorsFound");
        }
        if (quotedLinesIgnored) {
            html += "<p class='quotedLinesIgnored'>" + chrome.i18n.getMessage("quotedLinesIgnored") + "</p>";
        }
        if (serverUrl === defaultServerUrl) {
            html += "<p class='poweredBy'>" + chrome.i18n.getMessage("textCheckedRemotely", "https://languagetool.org") + "</p>";
        } else {
            html += "<p class='poweredBy'>" + chrome.i18n.getMessage("textCheckedBy", serverUrl) + "</p>";
        }
        if (testMode) {
            html += "*** running in test mode ***";
        }
        renderStatus(html);
        addLinkListeners(response, tabs);
        if (callback) {
            callback(response.markupList);
        }
    });
}

function getLanguageSelector(languageCode) {
    // It might be better to get the languages from the API (but not for every check call):
    let languages = [
        "ast-ES", "be-BY", "br-FR", "ca-ES", /* translation missing: "ca-ES-valencia"*/ "zh-CN", "da-DK", "nl",
        "en-US", "en-GB", "en-AU", "en-CA", "en-NZ", "en-ZA", "eo", "fr", "gl-ES",
        "de-DE", "de-AT", "de-CH", "el-GR", "is-IS", "it", "ja-JP", "km-KH", "lt-LT", "ml-IN",
        "fa", "pl-PL", "pt-PT", "pt-BR", "ro-RO", "ru-RU", "sk-SK",
        "sl-SI", "es", "sv", "tl-PH", "ta-IN", "uk-UA"
    ];
    var html = chrome.i18n.getMessage("language");
    html += "&nbsp;<select id='language'>";
    for (var l in languages) {
        let langCode = languages[l];
        let langCodeForTrans = languages[l].replace("-", "_");
        let selected = languageCode == langCode ? "selected" : "";
        var translatedLang = chrome.i18n.getMessage(langCodeForTrans);
        if (!translatedLang) {
            translatedLang = chrome.i18n.getMessage(langCodeForTrans.replace(/_.*/, ""));
        }
        if (!translatedLang) {
            translatedLang = Tools.getLangName(langCode);
        }
        html += "<option " + selected + " value='" + langCode + "'>" + translatedLang + "</option>";
    }
    html += "</select>";
    return html;
}

function renderContext(context, errStart, errLen) {
    return "<div class='errorArea'>"
          + Tools.escapeHtml(context.substr(0, errStart))
          + "<span class='error'>" + Tools.escapeHtml(context.substr(errStart, errLen)) + "</span>" 
          + Tools.escapeHtml(context.substr(errStart + errLen))
          + "</div>";
}

function renderReplacements(context, m, createLinks) {
    let ruleId = m.getAttribute("ruleId");
    let replacementsStr = m.getAttribute("replacements");
    let contextOffset = parseInt(m.getAttribute('contextoffset'));
    let errLen = parseInt(m.getAttribute("errorlength"));
    let errOffset = parseInt(m.getAttribute("offset"));
    let contextLeft = context.substr(0, contextOffset).replace(/^\.\.\./, "");
    let contextRight = context.substr(contextOffset + errLen).replace(/\.\.\.$/, "");
    let errorText = context.substr(contextOffset, errLen);
    var html = "<div class='replacements'>";
    if (replacementsStr) {
        let replacements = replacementsStr.split("#");
        var i = 0;
        for (let idx in replacements) {
            let replacement = replacements[idx];
            if (i >= 7) {
                // showing more suggestions usually doesn't make sense
                break;
            }
            if (i++ > 0) {
                html += " | ";
            }
            if (createLinks) {
                html += "<a class='replacement' href='#' " +
                    "data-ruleid='" + ruleId + "'" +
                    "data-erroroffset='" + errOffset + "'" +
                    "data-contextleft='" + Tools.escapeHtml(contextLeft) + "'" +
                    "data-contextright='" + Tools.escapeHtml(contextRight) + "'" +
                    "data-errortext='" + Tools.escapeHtml(errorText) + "'" +
                    "data-replacement='" + Tools.escapeHtml(replacement) + "'" +
                    "'>&nbsp;" + Tools.escapeHtml(replacement) + "&nbsp;</a>";  // add &nbsp; to make small links better clickable by making them wider
            } else {
                html += "<b>" + Tools.escapeHtml(replacement) + "</b>";
            }
        }
        html += "</div>";
    }
    return html;
}

function addLinkListeners(response, tabs) {
    document.getElementById("language").addEventListener("change", function() {
        manuallySelectedLanguage = document.getElementById("language").value;
        doCheck(tabs);
    });
    let closeLink = document.getElementById("closeLink");
    closeLink.addEventListener("click", function() {
        self.close();
    });
    let links = document.getElementsByTagName("a");
    for (var i = 0; i < links.length; i++) {
        let link = links[i];
        link.addEventListener("click", function() {
            if (link.getAttribute('data-addtodict')) {
                var storage = chrome.storage.sync ? chrome.storage.sync : chrome.storage.local;
                storage.get({
                    dictionary: []
                }, function(items) {
                    var dictionary = items.dictionary;
                    dictionary.push(link.getAttribute('data-addtodict'));
                    storage.set({'dictionary': dictionary}, function() {
                        chrome.tabs.sendMessage(tabs[0].id, {action: 'checkText'}, function(response) {
                            doCheck(tabs);   // re-check
                        });
                    });
                });

            } else if (link.getAttribute('data-errortext')) {
                let data = {
                    action: 'applyCorrection',
                    errorOffset: parseInt(link.getAttribute('data-erroroffset')),
                    contextLeft: link.getAttribute('data-contextleft'),
                    contextRight: link.getAttribute('data-contextright'),
                    errorText: link.getAttribute('data-errortext'),
                    replacement: link.getAttribute('data-replacement'),
                    markupList: response.markupList
                };
                chrome.tabs.sendMessage(tabs[0].id, data, function(response) {
                    doCheck(tabs);   // re-check, as applying changes might change context also for other errors
                });
            }
        });
    }
}

function handleCheckResult(response, tabs, callback) {
    if (!response) {
        // not sure *why* this happens...
        renderStatus(chrome.i18n.getMessage("freshInstallReload"));
        return;
    }
    if (response.message) {
        renderStatus(Tools.escapeHtml(response.message));
        return;
    }
    getCheckResult(response.markupList, function(resultText) {
        renderMatchesToHtml(resultText, response, tabs, callback);
    }, function(errorMessage) {
        renderStatus(chrome.i18n.getMessage("couldNotCheckText", Tools.escapeHtml(errorMessage)));
        if (callback) {
            callback(response.markupList, errorMessage);
        }
    });
}

function startCheckMaybeWithWarning(tabs) {
    var storage = chrome.storage.sync ? chrome.storage.sync : chrome.storage.local;
    storage.get({
            apiServerUrl: serverUrl,
            ignoreQuotedLines: ignoreQuotedLines,
            motherTongue: motherTongue,
            enVariant: "en-US",
            deVariant: "de-DE",
            ptVariant: "pt-PT"
        }, function(items) {
        serverUrl = items.apiServerUrl;
        ignoreQuotedLines = items.ignoreQuotedLines;
        motherTongue = items.motherTongue;
        if (items.enVariant) {
            preferredVariants.push(items.enVariant);
        }
        if (items.deVariant) {
            preferredVariants.push(items.deVariant);
        }
        if (items.ptVariant) {
            preferredVariants.push(items.ptVariant);
        }
        if (localStorage.allowRemoteCheck === "true") {
            doCheck(tabs);
        } else {
            var message = "<p>";
            if (serverUrl === defaultServerUrl) {
                message += chrome.i18n.getMessage("privacyNoteForDefaultServer", ["https://languagetool.org", "https://languagetool.org/privacy/"]);
            } else {
                message += chrome.i18n.getMessage("privacyNoteForOtherServer", serverUrl);
            }
            message += '</p>';
            message += '<ul>' +
                       '  <li><a class="privacyLink" id="confirmCheck" href="#">' + chrome.i18n.getMessage("continue") + '</a></li>' +
                       '  <li><a class="privacyLink" id="cancelCheck" href="#">' + chrome.i18n.getMessage("cancel") + '</a></li>' +
                       '</ul>';
            renderStatus(message);
            document.getElementById("confirmCheck").addEventListener("click", function() {
                localStorage.allowRemoteCheck = "true";
                doCheck(tabs);
            });
            document.getElementById("cancelCheck").addEventListener("click", function() { self.close(); });
        }
    });
}

function doCheck(tabs) {
    renderStatus('<img src="images/throbber_28.gif"> ' + chrome.i18n.getMessage("checkingProgress"));
    chrome.tabs.sendMessage(tabs[0].id, {action: 'checkText'}, function(response) {
        if (tabs[0].url.match(unsupportedSitesRegex)) {
            renderStatus(chrome.i18n.getMessage("siteNotSupported"));
        } else {
            handleCheckResult(response, tabs);
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0].url === "http://localhost/languagetool-for-chrome-tests.html") {
            testMode = true;
            runTest1(tabs, "textarea1", 1);
            // TODO: more tests here
        } else {
            testMode = false;
            startCheckMaybeWithWarning(tabs);
        }
    });
});
