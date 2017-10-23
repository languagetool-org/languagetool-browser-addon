/* LanguageTool WebExtension
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

const defaultServerUrl = 'https://languagetool.org/api/v2';   // keep in sync with defaultServerUrl in popup.js
const urlRegExp = new RegExp(
  /^(https?:\/\/)?[a-z0-9]+([-.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/
);

// regex idea from sindresorhus/ip-regex
const ipv4 = '(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])(?:\\.(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])){3}';
const ipv4Reg = new RegExp(`^${ipv4}$`) ;

// suport for localhost and ipv4
function validURL(str) {
  return urlRegExp.test(str) || str === 'localhost' || ipv4Reg.test(str);
}

function domainName(url) {
  try {
    const { hostname } = new URL(url);
    return hostname;
  } catch (err) {
    return url;
  }
}

function saveOptions() {
    const url = document.getElementById('apiServerUrl').value;
    const status = document.getElementById('status');
    if (!validURL(url)) {
        status.textContent = 'This URL is not valid.';
    } else {
        status.textContent = '';
        Tools.getStorage().set({
            apiServerUrl: url,
            ignoreQuotedLines: document.getElementById('ignoreQuotedLines').checked,
            havePremiumAccount: document.getElementById('havePremiumAccount').checked,
            autoCheck: document.getElementById('autoCheck').checked,
            username: document.getElementById('username').value,
            password: document.getElementById('password').value,
            motherTongue: document.getElementById('motherTongue').value,
            enVariant: document.getElementById('variant-en').value,
            deVariant: document.getElementById('variant-de').value,
            ptVariant: document.getElementById('variant-pt').value,
            caVariant: document.getElementById('variant-ca').value,
            dictionary: document.getElementById('dictionary').value.split("\n").filter(a => a.length > 0),
            disabledDomains: [... new Set(  document.getElementById("domains").value.split("\n").filter(a => a.length > 0 && validURL(a)).map(item => domainName(item) || item))],
            autoCheckOnDomains: [... new Set(  document.getElementById("autoCheckOnDomains").value.split("\n").filter(a => a.length > 0 && validURL(a)).map(item => domainName(item) || item))]
        }, function() {
            window.close();
        });
    }
}

function restoreOptions() {
    Tools.track("internal", "options-opened");
    document.getElementById('serverText').textContent = chrome.i18n.getMessage("serverText");
    document.getElementById('defaultServerLink').textContent = chrome.i18n.getMessage("defaultServerLink");
    document.getElementById('save').textContent = chrome.i18n.getMessage("save");
    document.getElementById('ignoreQuotedLinesDesc').textContent = chrome.i18n.getMessage("ignoreQuotedLines");
    document.getElementById('havePremiumAccountDesc').innerHTML = chrome.i18n.getMessage("havePremiumAccountDesc", "https://languagetoolplus.com");
    document.getElementById('usernameDesc').textContent = chrome.i18n.getMessage("username");
    document.getElementById('passwordDesc').textContent = chrome.i18n.getMessage("password");
    document.getElementById('motherTongueDesc').textContent = chrome.i18n.getMessage("motherTongueDesc");
    document.getElementById('motherTongueExpl').textContent = chrome.i18n.getMessage("motherTongueExpl");
    document.getElementById('variant-en-desc').textContent = chrome.i18n.getMessage("variantEnDesc");
    document.getElementById('variant-de-desc').textContent = chrome.i18n.getMessage("variantDeDesc");
    document.getElementById('variant-pt-desc').textContent = chrome.i18n.getMessage("variantPtDesc");
    document.getElementById('variant-ca-desc').textContent = chrome.i18n.getMessage("variantCaDesc");
    document.getElementById('dictionaryDesc').textContent = chrome.i18n.getMessage("dictionaryDesc");
    document.getElementById('autoCheckDesc').textContent = chrome.i18n.getMessage("autoCheckDesc");
    document.getElementById('domainsDesc').textContent = chrome.i18n.getMessage("domainsDesc");
    document.getElementById('autoCheckOnDomainsDesc').textContent = chrome.i18n.getMessage("autoCheckOnDomainsDesc");
    Tools.getStorage().get({
        apiServerUrl: defaultServerUrl,
        autoCheck: false,
        ignoreQuotedLines: true,
        havePremiumAccount: false,
        username: "",
        password: "",
        motherTongue: "",
        enVariant: "en-US",
        deVariant: "de-DE",
        ptVariant: "pt-PT",
        caVariant: "ca-ES",
        dictionary: [],
        disabledDomains: [],
        autoCheckOnDomains: []
    }, function(items) {
        document.getElementById('apiServerUrl').value = items.apiServerUrl;
        document.getElementById('ignoreQuotedLines').checked = items.ignoreQuotedLines;
        document.getElementById('havePremiumAccount').checked = items.havePremiumAccount;
        document.getElementById('username').value = items.username;
        document.getElementById('password').value = items.password;
        setPremium(items.havePremiumAccount);
        document.getElementById('motherTongue').value = items.motherTongue;
        document.getElementById('variant-en').value = items.enVariant;
        document.getElementById('variant-de').value = items.deVariant;
        document.getElementById('variant-pt').value = items.ptVariant;
        document.getElementById('variant-ca').value = items.caVariant;
        //document.getElementById('variant-ca-desc').value = items.caVariant;
        const dict = items.dictionary.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
        const domains = items.disabledDomains.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
        const autoCheckOnDomains = items.autoCheckOnDomains.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
        document.getElementById('autoCheck').checked = items.autoCheck;
        setAutoCheck(items.autoCheck);
        document.getElementById('dictionary').value = dict.join("\n") + "\n";
        document.getElementById('domains').value = domains.join("\n") + "\n";
        document.getElementById('autoCheckOnDomains').value = autoCheckOnDomains.join("\n") + "\n";
        showPrivacyLink();
    });
    setTimeout(function() { window.scrollTo(0, 0); }, 50);  // otherwise Chrome will show the bottom if the options page
}

function useDefaultServer() {
    document.getElementById('apiServerUrl').value = defaultServerUrl;
    document.getElementById('status').textContent = "";
    showPrivacyLink();
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
document.getElementById('defaultServerLink').addEventListener('click', useDefaultServer);
document.getElementById('havePremiumAccount').addEventListener('click', toggleHavePremiumCheckbox);
document.getElementById('autoCheck').addEventListener('click', toggleAutoCheckCheckbox);
document.getElementById('apiServerUrl').addEventListener('change', showPrivacyLink);
document.getElementById('apiServerUrl').addEventListener('keyup', showPrivacyLink);

function toggleHavePremiumCheckbox() {
    setPremium(this.checked);
}

function toggleAutoCheckCheckbox() {
    setAutoCheck(this.checked);
}

function setPremium(enabled) {
    if (enabled) {
        document.getElementById('ltPlusAccess').style.display = "block";
        document.getElementById('ltServer').style.display = "none";
        document.getElementById('username').focus();
    } else {
        document.getElementById('ltPlusAccess').style.display = "none";
        document.getElementById('ltServer').style.display = "block";
    }
}

function setAutoCheck(enabled) {
    if (!enabled) {
        document.getElementById('autoCheckOnDomainsContainer').style.display = "table-row";
    } else {
        document.getElementById('autoCheckOnDomainsContainer').style.display = "none";
    }
}

function showPrivacyLink() {
    if (document.getElementById('apiServerUrl').value === defaultServerUrl) {
        document.getElementById('privacyPolicy').innerHTML = "<a href='https://languagetool.org/privacy/'>" + chrome.i18n.getMessage("privacyPolicy") + "</a>";
        document.getElementById('defaultServerLink').style.display = "none";
    } else {
        document.getElementById('privacyPolicy').innerHTML = "";
        document.getElementById('defaultServerLink').style.display = "block";
    }
}
