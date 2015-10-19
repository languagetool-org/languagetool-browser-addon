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

function getCheckResult(text, callback, errorCallback) {
    let url = 'https://languagetool.org:8081/';
    let params = 'autodetect=1&text=' + encodeURIComponent(text);
    let req = new XMLHttpRequest();
    req.open('POST', url);
    req.onload = function() {
        let response = req.response;
        if (!response) {
            errorCallback('No response!');
            return;
        }
        callback(response);
    };
    req.onerror = function() {
        errorCallback('Network error.');
    };
    req.send(params);
}

function renderStatus(statusHtml) {
    document.getElementById('status').innerHTML = statusHtml;
}

function renderMatchesToHtml(resultXml) {
    let dom = (new window.DOMParser()).parseFromString(resultXml, "text/xml");
    let matches = dom.getElementsByTagName("error");
    var html = "";
    if (matches.length === 0) {
        return "No errors found";
    }
    html += "<ul>";
    for (var match in matches) {
        var m = matches[match];
        if (m.getAttribute) {
            html += "<li>";
            html += renderContext(m);
            html += renderReplacements(m.getAttribute("replacements"));
            html += m.getAttribute("msg");
            html += "</li>";
        }
    }
    html += "</ul>";
    return html;
}

function renderContext(m) {
    var context = m.getAttribute("context");
    var errStart = parseInt(m.getAttribute("contextoffset"));
    var errLen = parseInt(m.getAttribute("errorlength"));
    return "<div class='errorArea'>"
        + context.substr(0, errStart)
        + "<span class='error'>"
        + context.substr(errStart, errLen)
        + "</span>" + context.substr(errStart + errLen)
        + "</div>";
}

function renderReplacements(replacementsStr) {
    var html = "";
    if (replacementsStr) {
        let replacements = replacementsStr.split("|");
        var i = 0;
        for (var idx in replacements) {
            if (i++ > 0) {
                html += " | ";
            }
            html += "<a href='#'>" + replacements[idx] + "</a>";
        }
        html += "<br/>";
    }
    return html;
}

document.addEventListener('DOMContentLoaded', function() {
    renderStatus('Checking...');
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {}, function(response) {
            if (response.message) {
                renderStatus(response.message);
                return;
            }
            getCheckResult(response.text, function(resultText) {
                let resultHtml = renderMatchesToHtml(resultText);
                renderStatus(resultHtml);
            }, function(errorMessage) {
                renderStatus('Could not check text: ' + errorMessage);
            });
        });
    });
});
