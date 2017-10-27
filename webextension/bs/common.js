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
"use strict";

let quotedLinesIgnored = false;
let ignoreQuotedLines = true;

Tools.getStorage().get({
    ignoreQuotedLines: ignoreQuotedLines,
}, function(items) {
  ignoreQuotedLines = items.ignoreQuotedLines;
});

function getCheckResult(markupList, metaData, callback, errorCallback) {
    Tools.getApiServerUrl(serverUrl => {
      let text = Markup.markupList2text(markupList);
      if (ignoreQuotedLines) {
          const textOrig = text;
          // A hack so the following replacements don't happen on messed up character positions.
          // See https://github.com/languagetool-org/languagetool-browser-addon/issues/25:
          text = text.replace(/^>.*?\n/gm, function(match) {
              return " ".repeat(match.length - 1) + "\n";
          });
          quotedLinesIgnored = text != textOrig;
      }
      if (text.trim().length === 0) {
        return callback('{}');
      }
      const req = new XMLHttpRequest();
      req.timeout = 60 * 1000; // milliseconds
      const url = serverUrl + (serverUrl.endsWith("/") ? "check" : "/check");
      req.open('POST', url);
      req.onload = function() {
          let response = req.response;
          if (!response) {
              errorCallback(chrome.i18n.getMessage("noResponseFromServer", serverUrl), "noResponseFromServer");
              return;
          }
          if (req.status !== 200) {
              errorCallback(chrome.i18n.getMessage("noValidResponseFromServer", [serverUrl, req.response, req.status]), "noValidResponseFromServer");
              return;
          }
          callback(response);
      };
      req.onerror = function() {
          errorCallback(chrome.i18n.getMessage("networkError", serverUrl), "networkError");
      };
      req.ontimeout = function() {
          errorCallback(chrome.i18n.getMessage("timeoutError", serverUrl), "timeoutError");
      };
      let userAgent = "webextension";
      if (Tools.isFirefox()) {
          userAgent += "-firefox";
      } else if (Tools.isChrome()) {
          userAgent += "-chrome";
      } else {
          userAgent += "-unknown";
      }
      let params = 'disabledRules=WHITESPACE_RULE' +   // needed because we might replace quoted text by spaces (see issue #25) 
          '&useragent=' + userAgent;
      Tools.getStorage().get({
          havePremiumAccount: false,
          username: "",
          password: "",
          motherTongue: false,
          enVariant: "en-US",
          deVariant: "de-DE",
          ptVariant: "pt-PT",
          caVariant: "ca-ES",
      }, function(items) {
          const { motherTongue, havePremiumAccount, username, password, enVariant, deVariant, ptVariant, caVariant } = items;
          //console.log("metaData", metaData);
          //console.log("havePremiumAccount", items.havePremiumAccount);
          if (havePremiumAccount) {  // requires LT 3.9 or later
              const json = {text: text.trim(), metaData: metaData};
              params += '&data=' + encodeURIComponent(JSON.stringify(json));
          } else {
              params += '&text=' + encodeURIComponent(text.trim());
          }
          if (motherTongue) {
              params += "&motherTongue=" + motherTongue;
          }
          if (typeof manuallySelectedLanguage !== 'undefined' && manuallySelectedLanguage) {
              params += "&language=" + manuallySelectedLanguage;
              manuallySelectedLanguage = "";
          } else {
              params += "&language=auto";
              let preferredVariants = [];
              if (enVariant) {
                  preferredVariants.push(enVariant);
              }
              if (deVariant) {
                  preferredVariants.push(deVariant);
              }
              if (ptVariant) {
                  preferredVariants.push(ptVariant);
              }
              if (caVariant) {
                  preferredVariants.push(caVariant);
              }
              if (preferredVariants.length > 0) {
                  params += "&preferredVariants=" + preferredVariants;
              }
          }
          if (havePremiumAccount) {
              params += "&username=" + encodeURIComponent(username) +
                      "&password=" + encodeURIComponent(password);
            req.send(params);
        } else {
            req.send(params);
        }
    });
  });
}