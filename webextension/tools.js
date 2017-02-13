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

class Tools {

    constructor() {
    }

    static getStorage() {
        // special case for Firefox as long as chrome.storage.sync is defined, but
        // not yet activated by default: https://github.com/languagetool-org/languagetool-browser-addon/issues/97
        return chrome.storage.sync && !Tools.isFirefox() ? chrome.storage.sync : chrome.storage.local;
    }

    static logOnServer(message, serverUrl) {
        if (serverUrl.indexOf("https://languagetool.org") == -1) {
            // these logging messages are only useful for the LT dev team
            // to improve the add-on, so don't send anywhere else:
            return;
        }
        let req = new XMLHttpRequest();
        req.timeout = 60 * 1000; // milliseconds
        let url = serverUrl + (serverUrl.endsWith("/") ? "log" : "/log");
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
        let firstCh = str.charAt(0);
        return firstCh == firstCh.toLowerCase() && firstCh != firstCh.toUpperCase();
    }

    static startWithUppercase(str) {
        let firstCh = str.charAt(0);
        return firstCh == firstCh.toUpperCase() && firstCh != firstCh.toLowerCase();
    }

    static lowerCaseFirstChar(str) {
        let firstCh = str.charAt(0);
        return firstCh.toLowerCase() + str.substr(1);
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
