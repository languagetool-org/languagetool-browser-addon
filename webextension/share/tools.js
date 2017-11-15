/* LanguageTool WebExtension
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

const trackingBaseUrl = "https://openthesaurus.stats.mysnip-hosting.de/piwik.php";
const trackingSiteId = "12";
const THROTTLE_REQUESTS = 5;
const MAX_TIME = 1 * 60 * 1000; // 1 minute
// chrome.google.com: see http://stackoverflow.com/questions/11613371/
// docs.google.com: Google Docs has a too complicated DOM (but its own add-on framework)
// addons.mozilla.org: see http://stackoverflow.com/questions/42147966/
const unsupportedSitesRegex = /^https?:\/\/(docs.google.com|chrome.google.com|addons.mozilla.org).*/;
const notSupportMarkerSitesRegex = /^https?:\/\/(www.facebook.com|facebook.com|docs.google.com|chrome.google.com|addons.mozilla.org|.*wikipedia.org.*&veaction=edit).*/;

// turn off some rules by default because they are not that useful in a typical web context:
const ruleIdsIgnoredByDefault = [
    // English:
    {id: 'EN_QUOTES', language: 'en'},
    {id: 'DASH_RULE', language: 'en'},
    // German:
    {id: 'TYPOGRAFISCHE_ANFUEHRUNGSZEICHEN', language: 'de'},
    {id: 'FALSCHE_VERWENDUNG_DES_BINDESTRICHS', language: 'de'},
    {id: 'BISSTRICH', language: 'de'},
    {id: 'AUSLASSUNGSPUNKTE', language: 'de'},
];

const errorsText = ['error', 'exception', 'problem'];
const lastTrackingError = {};

class Tools {

    constructor() {
    }

    static getApiServerUrl(callback) {
        const storage = Tools.getStorage();
        storage.get({
            apiServerUrl: 'https://languagetool.org/api/v2',
            havePremiumAccount: false
        }, function(items) {
            let serverUrl = items.apiServerUrl;
            if (items.havePremiumAccount) {
                serverUrl = 'https://languagetoolplus.com/api/v2';
            }
            callback(serverUrl);
        });
    }

    static track(pageUrl, actionName, optionalTrackDetails) {
        if (!Tools.isChrome()) {
            // version with tracking not deployed yet for Firefox, so make it explicit that tracking on FF won't work:
            return;
        }
        try {
            // throttle request for error tracking
            const foundErrorTracking = errorsText.find(item => actionName.toLowerCase().indexOf(item) !== -1);
            if (foundErrorTracking) {
                if(!lastTrackingError[actionName]) {
                    lastTrackingError[actionName] = [Date.now()];
                } else {
                    if (lastTrackingError[actionName].length < THROTTLE_REQUESTS) {
                        lastTrackingError[actionName].push(Date.now());
                    } else {
                        // compare the first item, make sure only max THROTTLE_REQUESTS per min
                        const now = Date.now();
                        const distanceRunTime = now - lastTrackingError[actionName][0];
                        if (distanceRunTime >= MAX_TIME) {
                            lastTrackingError[actionName].push(now);
                            lastTrackingError[actionName].splice(0,1);
                        } else {
                            // console.warn(`LT add-on ignore tracking for ${actionName} - ${new Date(now)}`, lastTrackingError);
                            return null; // break, ignore this action name
                        }
                    }
                }
            }
            const storage = Tools.getStorage();
            storage.get({
                uid: null
            }, function(items) {
                // needed to tell visits from  unique visitors:
                let uid;
                if (items.uid) {
                    uid = items.uid;
                } else {
                    uid = Tools.getRandomToken();
                    storage.set({uid: uid}, function() {});
                }
                let shortenedUrl = pageUrl ? pageUrl.replace(/^(.*?:\/\/.+?)[?\/].*/, "$1") : '';  // for privacy reasons, only log host
                if (shortenedUrl.indexOf("http:") !== 0 && shortenedUrl.indexOf("https:") !== 0) {
                    shortenedUrl = "http://"  + shortenedUrl;  // Piwik needs URL, it will not log otherwise
                }
                const url = encodeURIComponent(shortenedUrl);
                const manifest = chrome.runtime.getManifest();
                const version = manifest && manifest.version ? manifest.version : "unknown";
                const trackingUrl = trackingBaseUrl +
                    "?idsite=" + trackingSiteId +
                    "&_cvar={\"1\":[\"version\",\"" + encodeURIComponent(version) + "\"]}" +
                    "&rec=1" +
                    "&url=" + url +
                    "&action_name=" + encodeURIComponent(actionName) +
                    "&rand=" + Date.now() +
                    "&apiv=1" +
                    "&_id=" + uid +
                    "&e_c=Action" +
                    "&e_a=" + encodeURIComponent(actionName) +
                    (optionalTrackDetails ? "&e_n=" + encodeURIComponent(optionalTrackDetails) : "");
                //console.log("trackingUrl: " + trackingUrl);
                const trackReq = new XMLHttpRequest();
                trackReq.open('POST', trackingUrl);
                trackReq.onerror = function() {
                    console.log("LT add-on tracking failed");
                };
                trackReq.ontimeout = function() {
                    console.log("LT add-on tracking failed with timeout");
                };
                trackReq.send();
                console.log(`LanguageTool tracking: ${shortenedUrl}, ${actionName}, ${optionalTrackDetails}`);
            });
        } catch(e) {
            console.log(`LanguageTool add-on tracking failed: ${e.message}`);
        }
    }

    static getStorage() {
        // special case for Firefox as long as chrome.storage.sync is defined, but
        // not yet activated by default: https://github.com/languagetool-org/languagetool-browser-addon/issues/97
        return chrome.storage.sync && !Tools.isFirefox() ? chrome.storage.sync : chrome.storage.local;
    }

    static doNotSupportOnUrl(url) {
        return url.match(unsupportedSitesRegex);
    }

    static doNotShowMarkerOnUrl(url) {
        return url.match(notSupportMarkerSitesRegex);
    }

    static getRandomToken() {
        const randomPool = new Uint8Array(8);
        crypto.getRandomValues(randomPool);
        let hex = '';
        for (let i = 0; i < randomPool.length; ++i) {
            hex += randomPool[i].toString(16);
        }
        return hex;
    }

    // NOTE: the number of logs that can be sent is limited by the same limit
    // that limits the check requests per minute, so prefer Tools.track()
    static logOnServer(message, serverUrl = 'https://languagetool.org/api/v2') {
        if (serverUrl.indexOf("https://languagetool.org") === -1) {
            // these logging messages are only useful for the LT dev team
            // to improve the add-on, so don't send anywhere else:
            return;
        }
        const req = new XMLHttpRequest();
        req.timeout = 60 * 1000; // milliseconds
        const url = serverUrl + (serverUrl.endsWith("/") ? "log" : "/log");
        req.open('POST', url);
        req.onload = function() {
            // do nothing (also ignore timeout and errors)
        };
        //console.log("Posting to " + url + ": " + message);
        req.send("message=" + encodeURIComponent(message));
    }

    static isFirefox() {
        return navigator.userAgent.indexOf("Firefox/") !== -1;
    }

    static isChrome() {
        return navigator.userAgent.indexOf("Chrome/") !== -1 || navigator.userAgent.indexOf("Chromium/") !== -1;
    }

    static escapeHtml(s) {
        return s.replace(/&/g, '&amp;')
                .replace(/>/g, '&gt;')
                .replace(/</g, '&lt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&apos;');
    }

    static startWithLowercase(str) {
        const firstCh = str.charAt(0);
        return firstCh == firstCh.toLowerCase() && firstCh != firstCh.toUpperCase();
    }

    static startWithUppercase(str) {
        const firstCh = str.charAt(0);
        return firstCh == firstCh.toUpperCase() && firstCh != firstCh.toLowerCase();
    }

    static lowerCaseFirstChar(str) {
        const firstCh = str.charAt(0);
        return firstCh.toLowerCase() + str.substr(1);
    }

    static setIgnoreRules(callback) {
        const storage = Tools.getStorage();
        storage.get({ ignoredRules: ruleIdsIgnoredByDefault }, callback);
    }

    static getUserSettingsForRender(callback) {
        const storage = Tools.getStorage();
        storage.get({
            dictionary: [],
            disabledDomains: [],
            autoCheckOnDomains: [],
            ignoreCheckOnDomains: [],
            ignoredRules: ruleIdsIgnoredByDefault,
            havePremiumAccount: false,
            autoCheck: false
        }, callback);
    }

    // Due to Transifex limited support for Android i18n files, we already have
    // a very complicated i18n setup (see injectTranslations.py) and it seems
    // we're better off just hard-coding the English language names here instead of
    // making the process even more complicated:
    static getLangName(langCode) {
        switch (langCode) {
            case "ast-ES": return "Asturian";
            case "be-BY": return "Belarusian";
            case "br-FR": return "Breton";
            case "ca-ES": return "Catalan";
            case "ca-ES-valencia": return "Catalan (Valencian)";
            case "zh-CN": return "Chinese";
            case "da-DK": return "Danish";
            case "nl": return "Dutch";
            case "en-US": return "English (American)";
            case "en-GB": return "English (British)";
            case "en-AU": return "English (Australia)";
            case "en-CA": return "English (Canada)";
            case "en-NZ": return "English (New Zealand)";
            case "en-ZA": return "English (South Africa)";
            case "eo": return "Esperanto";
            case "fr": return "French";
            case "gl-ES": return "Galician";
            case "de-DE": return "German (German)";
            case "de-AT": return "German (Austria)";
            case "de-CH": return "German (Switzerland)";
            case "el-GR": return "Greek";
            case "is-IS": return "Icelandic";
            case "it": return "Italian";
            case "ja-JP": return "Japanese";
            case "km-KH": return "Khmer";
            case "lt-LT": return "Lithuanian";
            case "ml-IN": return "Malayalam";
            case "fa": return "Persian";
            case "pl-PL": return "Polish";
            case "pt-PT": return "Portuguese (Portugal)";
            case "pt-BR": return "Portuguese (Brazil)";
            case "ro-RO": return "Romanian";
            case "ru-RU": return "Russian";
            case "sk-SK": return "Slovak";
            case "sl-SI": return "Slovenian";
            case "es": return "Spanish";
            case "sv": return "Swedish";
            case "tl-PH": return "Tagalog";
            case "ta-IN": return "Tamil";
            case "uk-UA": return "Ukrainian";
            default: return langCode;
        }
    }

}

if (typeof module !== 'undefined') {
    module.exports = Tools;
}
