/* LanguageTool for Chrome 
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

class Markup {

    static html2markupList(html, doc) {
        var result = [];
        var inMarkup = false;
        var attributeStartChar = null;
        var buffer = "";
        for (var i = 0; i < html.length; i++) {
            let ch = html[i];
            var skip = false;
            if (ch === '<' && !attributeStartChar) {  // innerHTML seems to give us an unescaped result, so we need to deal with '<'
                if (buffer) {
                    result.push({text: Markup._resolveEntities(buffer, doc)});
                    buffer = "";
                }
                inMarkup = true;
            } else if (inMarkup && !attributeStartChar && (ch == '"' || ch == "'")) {
                attributeStartChar = ch;
            } else if (inMarkup && attributeStartChar && ch == attributeStartChar) {
                attributeStartChar = null;
            } else if (inMarkup && ch === '>' && !attributeStartChar) {
                if (buffer) {
                    Markup._handleMarkupItem(buffer, result);
                    skip = true;
                    buffer = "";
                }
                inMarkup = false;
            }
            if (!skip) {
                buffer += ch;
            }
        }
        if (inMarkup && buffer) {
            Markup._handleMarkupItem(buffer, result);
        } else if (buffer) {
            result.push({text: Markup._resolveEntities(buffer, doc)});
        }
        return result;
    }

    // LT would be confused if it gets e.g. "&nbsp;" as input, so we resolve entities.
    // We change the text we work on, so when we replace errors with suggestions we
    // also set a text that has entities resolved, but I hope that never makes a difference.
    static _resolveEntities(str, doc) {
        // Source: http://stackoverflow.com/questions/3700326/decode-amp-back-to-in-javascript/3700369#3700369
        let elem = doc.createElement('textarea');
        elem.innerHTML = DOMPurify.sanitize(str);
        return elem.value;
    }
    
    static _handleMarkupItem(buffer, result) {
        if (buffer === '<div' || buffer === '<div/' || buffer.indexOf('<div ') === 0 || buffer === '<p' || buffer === '<p/' || buffer.indexOf('<p ') === 0) {
            // we need to interpret the HTML a bit so LanguageTool knows at least
            // where the paragraphs are...
            result.push({markup: buffer + '>', text: '\n\n'});
        } else if (buffer === '<br' || buffer === '<br/') {
            result.push({markup: buffer + '>', text: '\n'});
        } else {
            result.push({markup: buffer + '>'});
        }
    }

    static markupList2html(markupList) {
        var result = "";
        for (let idx in markupList) {
            let elem = markupList[idx];
            if (elem.markup) {
                result += elem.markup;
            } else if (elem.text) {
                result += elem.text;
            } else {
                throw "Neither text nor markup at position " + idx + " in list: " + markupList;
            }
        }
        return result;
    }

    static markupList2text(markupList) {
        var result = "";
        for (let idx in markupList) {
            let elem = markupList[idx];
            if (elem.text) {
                result += elem.text;
            }
        }
        return result;
    }

    static replace(markupList, plainTextErrorOffset, errorLen, errorReplacement) {
        var result = [];
        var plainTextPos = 0;
        var found = false;
        for (let idx in markupList) {
            let elem = markupList[idx];
            if (elem.text && elem.markup) {
                result.push({text: elem.text, markup: elem.markup});
                plainTextPos += elem.text.length;
            } else if (elem.text) {
                let fromPos = plainTextPos;
                let toPos = plainTextPos + elem.text.length;
                if (plainTextErrorOffset >= fromPos && plainTextErrorOffset <= toPos) {
                    let relErrorOffset = plainTextErrorOffset - fromPos;
                    if (relErrorOffset !== elem.text.length) {
                        // this is an ambiguous case, e.g. insert the error at position 3 here:
                        // <div>foo</div>bar
                        // -> but is position 3 after the "foo" or in front of "bar"? We assume it's in front of 'bar',
                        // that seems to be the better choice for our use case
                        let secureReplacement = DOMPurify.sanitize(errorReplacement);
                        let newText = elem.text.substr(0, relErrorOffset) + secureReplacement + elem.text.substr(relErrorOffset+errorLen);
                        if (newText !== elem.text) {
                            found = true;
                        }
                        result.push({text: newText});
                    } else {
                        result.push({text: elem.text});
                    }
                } else {
                    result.push({text: elem.text});
                }
                plainTextPos += elem.text.length;
            } else if (elem.markup) {
                result.push({markup: elem.markup});
            }
        }
        if (!found) {
            // see test case for when this might happen
            throw chrome.i18n.getMessage("noReplacementPossible2");
        }
        return result;
    }

}

if (typeof module !== 'undefined') {
    module.exports = Markup;
}
