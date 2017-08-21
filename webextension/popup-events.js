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

console.log("binding events for popup");

const SELECT_ROW_ACTIVE = "suggestionActiveRow";
const SUGGESTION_ROW = "suggestionRow";
const UP_KEY = "ArrowUp";
const DOWN_KEY = "ArrowDown";
const LEFT_KEY = "ArrowLeft";
const RIGHT_KEY = "ArrowRight";
const ENTER_KEY = "Enter";
const DETECT_KEYS = [UP_KEY, DOWN_KEY, LEFT_KEY, RIGHT_KEY, ENTER_KEY];

let activeSelectRow = -1;

document.addEventListener(
  "keydown",
  event => {
    const keyName = event.key;
    if (DETECT_KEYS.indexOf(keyName) !== -1) {
      switch (keyName) {
        case UP_KEY:
          {
            if (activeSelectRow >= 0) {
              activeSuggestionRow(activeSelectRow, false);
              activeSelectRow -= 1;
              activeSuggestionRow(activeSelectRow);
              scrollToActiveRow(activeSelectRow);
            }
          }
          break;
        case DOWN_KEY:
          {
            const rows = document.getElementsByClassName(SUGGESTION_ROW);
            const MAX_ROWS = rows.length || 0;
            if (activeSelectRow < MAX_ROWS - 1) {
              activeSuggestionRow(activeSelectRow, false);
              activeSelectRow += 1;
              activeSuggestionRow(activeSelectRow);
              scrollToActiveRow(activeSelectRow);
            }
          }
          break;
        case LEFT_KEY:
          {
          }
          break;
        case RIGHT_KEY:
          {
          }
          break;
        case ENTER_KEY:
          {
          }
          break;
      }
    }
  },
  false
);

function activeSuggestionRow(rowIndex, isInsert = true) {
  const rows = document.getElementsByClassName(SUGGESTION_ROW);
  const selectedRow = rows[rowIndex];
  if (!!selectedRow) {
    const className = selectedRow.className;
    if (isInsert) {
      if (className.indexOf(SELECT_ROW_ACTIVE) === -1) {
        selectedRow.className = `${className} ${SELECT_ROW_ACTIVE}`;
      }
    } else {
      if (className.indexOf(SELECT_ROW_ACTIVE) !== -1) {
        selectedRow.className = className.replace(` ${SELECT_ROW_ACTIVE}`, "");
      }
    }
  }
}

function scrollToActiveRow(selectedRow) {
  const activeElements = document.getElementsByClassName(SELECT_ROW_ACTIVE);
  if (activeElements && activeElements.length) {
    const element = activeElements[0];
    document.body.scrollTop = element.offsetTop - element.offsetHeight / 2;
  }
}
