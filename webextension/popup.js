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

let defaultServerUrl = 'https://languagetool.org/api/v2';   // keep in sync with defaultServerUrl in options.js
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
    let url = serverUrl + (serverUrl.endsWith("/") ? "check" : "/check");
    req.open('POST', url);
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
        let textOrig = text;
        // A hack so the following replacements don't happen on messed up character positions.
        // See https://github.com/languagetool-org/languagetool-browser-addon/issues/25:
        text = text.replace(/^>.*?\n/gm, function(match) {
            return " ".repeat(match.length - 1) + "\n";
        });
        quotedLinesIgnored = text != textOrig;
    }
    var params = 'disabledRules=WHITESPACE_RULE' +   // needed because we might replace quoted text by spaces (see issue #25) 
                 '&useragent=chrome-extension&text=' + encodeURIComponent(text);
    if (motherTongue) {
        params += "&motherTongue=" + motherTongue;
    }
    if (manuallySelectedLanguage) {
        params += "&language=" + manuallySelectedLanguage;
        manuallySelectedLanguage = "";
    } else {
        params += "&language=auto";
        if (preferredVariants.length > 0) {
            params += "&preferredVariants=" + preferredVariants;
        }
    }
    req.send(params);
}

function renderStatus(statusHtml) {
    document.getElementById('status').innerHTML = statusHtml;
}

function getShortCode(languageCode) {
    return languageCode.replace(/-.*/, "");
}

function renderMatchesToHtml(resultJson, response, tabs, callback) {
    let createLinks = response.isEditableText;
    let data = JSON.parse(resultJson);
    let language = data.language.name;
    let languageCode = data.language.code;
    let shortLanguageCode = getShortCode(languageCode);
    var translatedLanguage = chrome.i18n.getMessage(languageCode.replace(/-/, "_"));
    if (!translatedLanguage) {
        translatedLanguage = chrome.i18n.getMessage(shortLanguageCode);  // needed for e.g. "ru-RU"
    }
    if (!translatedLanguage) {
        translatedLanguage = language;
    }
    var html = '<a id="closeLink" href="#"></a>';
    html += getLanguageSelector(languageCode);
    html += "<hr>";
    let matches = data.matches;
    getStorage().get({
        dictionary: [],
        ignoredRules: []
    }, function(items) {
        var matchesCount = 0;
        // remove overlapping rules in reverse order so we match the results like they are shown on web-pages
        if (matches) {
            let uniquePositionMatches = [];
            let prevErrStart = -1;
            let prevErrLen = -1;
            for (let i = matches.length-1; i >= 0; i--) {
                let m = matches[i];
                let errStart = m.offset;
                let errLen = m.length;
                if (errStart != prevErrStart || errLen != prevErrLen) {
                    uniquePositionMatches.push(m);
                    prevErrStart = errStart;
                    prevErrLen = errLen;
                }
            }
            uniquePositionMatches.reverse();
            matches = uniquePositionMatches;
        }

        var ignoredRuleCounts = {};
        for (let match in matches) {
            let m = matches[match];
            let context = m.context.text;
            let errStart = m.context.offset;
            let errLen = m.length;
            let word = context.substr(errStart, errLen);
            let ruleId = m.rule.id;
            let isSpellingError = ruleId.indexOf("MORFOLOGIK") != -1 || ruleId.indexOf("HUNSPELL") != -1 || ruleId.indexOf("SPELLER_RULE") != -1;
            var ignoreError = false;
            if (isSpellingError) {
                // Also accept uppercase versions of lowercase words in personal dict:
                let knowToDict = items.dictionary.indexOf(word) != -1;
                if (knowToDict) {
                    ignoreError = true;
                } else if (!knowToDict && Tools.startWithUppercase(word)) {
                    ignoreError = items.dictionary.indexOf(Tools.lowerCaseFirstChar(word)) != -1;
                }
            } else {
                ignoreError = items.ignoredRules.find(k => k.id === ruleId && k.language === shortLanguageCode);
            }
            if (ignoreError) {
                if (ignoredRuleCounts[ruleId]) {
                    ignoredRuleCounts[ruleId]++;
                } else {
                    ignoredRuleCounts[ruleId] = 1;
                }
            } else {
                if (isSpellingError) {
                    let escapedWord = Tools.escapeHtml(word);
                    html += "<div class='addToDict'><a data-addtodict='" + escapedWord + "' " +
                        "title='" + chrome.i18n.getMessage("addToDictionaryTitle", escapedWord).replace(/'/, "&apos;") + "'" +
                        "href='' class='addToDictLink'>" +
                        "<img class='plusImage' src='images/plus.png'></a></div>";
                } else {
                    // Not turned on yet, see https://github.com/languagetool-org/languagetool-browser-addon/issues/9
                    html += "<div class='turnOffRule'><a class='turnOffRuleLink' data-ruleIdOff='" + Tools.escapeHtml(ruleId) +
                        "' data-ruleDescription='" + Tools.escapeHtml(m.rule.description) + "'" +
                        " href='#' title='" + chrome.i18n.getMessage("turnOffRule").replace(/'/, "&apos;") + "'><img class='bellImage' src='images/bell.png'></a></div>";
                }
                html += Tools.escapeHtml(m.message);
                html += renderContext(m.context.text, errStart, errLen);
                html += renderReplacements(context, m, createLinks);
                html += "<hr>";
                matchesCount++;
            }
        }
        if (matchesCount == 0) {
            html += "<p>" + chrome.i18n.getMessage("noErrorsFound") + "</p>";
        }
        if (quotedLinesIgnored) {
            html += "<p class='quotedLinesIgnored'>" + chrome.i18n.getMessage("quotedLinesIgnored") + "</p>";
        }
        if (items.ignoredRules && items.ignoredRules.length > 0) {
            let ruleItems = [];
            let currentLang = getShortCode(languageCode);
            for (let key in items.ignoredRules) {
                let ignoredRule = items.ignoredRules[key];
                if (currentLang === ignoredRule.language) {
                    let ruleId = Tools.escapeHtml(ignoredRule.id);
                    let ruleDescription = Tools.escapeHtml(ignoredRule.description);
                    let matchCount = ignoredRuleCounts[ruleId];
                    if (matchCount) {
                        ruleItems.push("<span class='ignoredRule'><a class='turnOnRuleLink' data-ruleIdOn='"
                            + ruleId + "' href='#'>" + ruleDescription + " (" + matchCount + ")</a></span>");
                    }
                }
            }
            if (ruleItems.length > 0) {
                html += "<span class='ignoredRulesIntro'>" + chrome.i18n.getMessage("ignoredRules") + "</span> ";
                html += ruleItems.join(" &middot; ");
            }
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
        setImageListener("plusImage", "mouseover", "images/plus_highlight.png");
        setImageListener("plusImage", "mouseout", "images/plus.png");
        setImageListener("bellImage", "mouseover", "images/bell_highlight.png");
        setImageListener("bellImage", "mouseout", "images/bell.png");
        if (callback) {
            callback(response.markupList);
        }
    });
}

function setImageListener(className, eventName, newImage) {
    let images = document.getElementsByClassName(className);
    for (var i = 0; i < images.length; i++) {
        images[i].addEventListener(eventName, function(event) {
            event.target.src = newImage;
        });
    }
}

function getLanguageSelector(languageCode) {
    // It might be better to get the languages from the API (but not for every check call):
    let languages = [
        "ast-ES", "be-BY", "br-FR", "ca-ES", "ca-ES-valencia", "zh-CN", "da-DK", "nl",
        "en-US", "en-GB", "en-AU", "en-CA", "en-NZ", "en-ZA", "eo", "fr", "gl-ES",
        "de-DE", "de-AT", "de-CH", "el-GR", "is-IS", "it", "ja-JP", "km-KH", "lt-LT", "ml-IN",
        "fa", "pl-PL", "pt-PT", "pt-BR", "ro-RO", "ru-RU", "sk-SK",
        "sl-SI", "es", "sv", "tl-PH", "ta-IN", "uk-UA"
    ];
    var html = "<div id='top'>";
    html += chrome.i18n.getMessage("language");
    html += "&nbsp;<select id='language'>";
    for (var l in languages) {
        let langCode = languages[l];
        let langCodeForTrans = languages[l].replace(/-/g, "_");
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
    html += "</div>";
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
    let ruleId = m.rule.id;
    let replacements = m.replacements.map(k => k.value);
    let contextOffset = m.context.offset;
    let errLen = m.length;
    let errOffset = m.offset;
    let contextLeft = context.substr(0, contextOffset).replace(/^\.\.\./, "");
    let contextRight = context.substr(contextOffset + errLen).replace(/\.\.\.$/, "");
    let errorText = context.substr(contextOffset, errLen);
    var html = "<div class='replacements'>";
    var i = 0;
    for (let idx in replacements) {
        let replacement = replacements[idx];
        if (i >= 7) {
            // showing more suggestions usually doesn't make sense
            break;
        }
        if (i++ > 0) {
            html += "&nbsp; ";
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
            let storage = getStorage();
            if (link.getAttribute('data-ruleIdOn')) {
                storage.get({
                    ignoredRules: []
                }, function(items) {
                    let idx = 0;
                    for (var rule of items.ignoredRules) {
                        if (rule.id == link.getAttribute('data-ruleIdOn')) {
                            items.ignoredRules.splice(idx, 1);
                            storage.set({'ignoredRules': items.ignoredRules}, function() { reCheck(tabs) });
                            break;
                        }
                        idx++;
                    }
                });
                
            } else if (link.getAttribute('data-ruleIdOff')) {
                storage.get({
                    ignoredRules: []
                }, function(items) {
                    let ignoredRules = items.ignoredRules;
                    ignoredRules.push({
                        id: link.getAttribute('data-ruleIdOff'),
                        description: link.getAttribute('data-ruleDescription'),
                        language: getShortCode(document.getElementById("language").value)
                    });
                    storage.set({'ignoredRules': ignoredRules}, function() { reCheck(tabs) });
                });

            } else if (link.getAttribute('data-addtodict')) {
                storage.get({
                    dictionary: []
                }, function(items) {
                    let dictionary = items.dictionary;
                    dictionary.push(link.getAttribute('data-addtodict'));
                    storage.set({'dictionary': dictionary}, function() { reCheck(tabs) });
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

function reCheck(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {action: 'checkText'}, function (response) {
        doCheck(tabs);
    });
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
    getStorage().get({
            apiServerUrl: serverUrl,
            ignoreQuotedLines: ignoreQuotedLines,
            motherTongue: motherTongue,
            enVariant: "en-US",
            deVariant: "de-DE",
            ptVariant: "pt-PT",
            caVariant: "ca-ES",
            allowRemoteCheck: false
        }, function(items) {
            serverUrl = items.apiServerUrl;
            if (serverUrl === 'https://languagetool.org:8081/') {
                // This is migration code - users of the old version might have
                // the old URL of the v1 API in their settings, force them to use
                // the v2 JSON API, as this is what this extension supports now:
                //console.log("Replacing old serverUrl " + serverUrl + " with " + defaultServerUrl);
                // -> http://stackoverflow.com/questions/12229544/what-can-cause-a-chrome-browser-extension-to-crash
                serverUrl = defaultServerUrl;
            }
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
            if (items.caVariant) {
                preferredVariants.push(items.caVariant);
            }
            if (items.allowRemoteCheck === true) {
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
                    getStorage().set({
                        allowRemoteCheck: true
                    }, function () {
                        doCheck(tabs);
                    });
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
        getStorage().set({
            lastCheck: new Date().getTime()
        }, function() {});
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

function getStorage() {
    return chrome.storage.sync ? chrome.storage.sync : chrome.storage.local;
}
