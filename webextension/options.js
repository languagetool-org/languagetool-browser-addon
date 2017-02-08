/* LanguageTool for Chrome 
 * Copyright (C) 2016-2017 Daniel Naber (http://www.danielnaber.de)
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

let defaultServerUrl = 'https://languagetool.org/api/v2';   // keep in sync with defaultServerUrl in popup.js

function saveOptions() {
    let url = document.getElementById('apiServerUrl').value;
    let status = document.getElementById('status');
    if (url.indexOf('http://') !== 0 && url.indexOf('https://') !== 0) {
        status.textContent = 'This URL is not valid.';
    } else {
        status.textContent = '';
        Tools.getStorage().set({
            apiServerUrl: url,
            ignoreQuotedLines: document.getElementById('ignoreQuotedLines').checked,
            motherTongue: document.getElementById('motherTongue').value,
            enVariant: document.getElementById('variant-en').value,
            deVariant: document.getElementById('variant-de').value,
            ptVariant: document.getElementById('variant-pt').value,
            caVariant: document.getElementById('variant-ca').value,
            dictionary: document.getElementById('dictionary').value.split("\n").filter(a => a.length > 0)
        }, function() {
            close();
        });
    }
}

function restoreOptions() {
    document.getElementById('serverText').textContent = chrome.i18n.getMessage("serverText");
    document.getElementById('defaultServerLink').textContent = chrome.i18n.getMessage("defaultServerLink");
    document.getElementById('save').textContent = chrome.i18n.getMessage("save");
    document.getElementById('ignoreQuotedLinesDesc').innerHTML = chrome.i18n.getMessage("ignoreQuotedLines");
    document.getElementById('motherTongueDesc').textContent = chrome.i18n.getMessage("motherTongueDesc");
    document.getElementById('motherTongueExpl').textContent = chrome.i18n.getMessage("motherTongueExpl");
    document.getElementById('variant-en-desc').textContent = chrome.i18n.getMessage("variantEnDesc");
    document.getElementById('variant-de-desc').textContent = chrome.i18n.getMessage("variantDeDesc");
    document.getElementById('variant-pt-desc').textContent = chrome.i18n.getMessage("variantPtDesc");
    document.getElementById('variant-ca-desc').textContent = chrome.i18n.getMessage("variantCaDesc");
    document.getElementById('dictionaryDesc').textContent = chrome.i18n.getMessage("dictionaryDesc");
    Tools.getStorage().get({
        apiServerUrl: defaultServerUrl,
        ignoreQuotedLines: true,
        motherTongue: "",
        enVariant: "en-US",
        deVariant: "de-DE",
        ptVariant: "pt-PT",
        caVariant: "ca-ES",
        dictionary: []
    }, function(items) {
        document.getElementById('apiServerUrl').value = items.apiServerUrl;
        document.getElementById('ignoreQuotedLines').checked = items.ignoreQuotedLines;
        document.getElementById('motherTongue').value = items.motherTongue;
        document.getElementById('variant-en').value = items.enVariant;
        document.getElementById('variant-de').value = items.deVariant;
        document.getElementById('variant-pt').value = items.ptVariant;
        document.getElementById('variant-ca').value = items.caVariant;
        //document.getElementById('variant-ca-desc').value = items.caVariant;
        let dict = items.dictionary.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
        document.getElementById('dictionary').value = dict.join("\n") + "\n";
        showPrivacyLink();
    });
}

function useDefaultServer() {
    document.getElementById('apiServerUrl').value = defaultServerUrl;
    document.getElementById('status').textContent = "";
    showPrivacyLink();
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
document.getElementById('defaultServerLink').addEventListener('click', useDefaultServer);
document.getElementById('apiServerUrl').addEventListener('change', showPrivacyLink);
document.getElementById('apiServerUrl').addEventListener('keyup', showPrivacyLink);

function showPrivacyLink() {
    if (document.getElementById('apiServerUrl').value == defaultServerUrl) {
        document.getElementById('privacyPolicy').innerHTML = "<a href='https://languagetool.org/privacy/'>Privacy Policy</a>";
    } else {
        document.getElementById('privacyPolicy').innerHTML = "";
    }
}
