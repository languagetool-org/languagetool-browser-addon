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

function runTest1(tabs, textareaId, expectedErrorCount) {
    chrome.tabs.sendMessage(tabs[0].id, {action: 'checkText'}, function(response) {
        handleCheckResult(response, tabs, function(checkedText, errorMessage) {
            if (errorMessage) {
                alert("Got unexpected error message:\n" + errorMessage);
            }
            const links = getCorrectionLinks(document.getElementsByTagName("a"));
            if (links.length !== expectedErrorCount) {
                alert("Unexpected number of corrections: got " + links.length + ", expected " + expectedErrorCount + ",\nText:\n" + checkedText);
            }
            if (links.length >= 1) {
                links[0].click(); // apply the first correction of the first error
            }
            chrome.tabs.sendMessage(tabs[0].id, {action: 'getCurrentText'}, function(newText) {
                if (checkedText === newText) {
                    alert("No change in text after applying suggestion:\n" + newText);
                }
            });
        });
    });
}

function getCorrectionLinks(links) {
    const result = [];
    for (let i = 0; i < links.length; i++) {
        if (links[i].getAttribute('data-contextleft')) {
            result.push(links[i]);
        }
    }
    return result;
}
