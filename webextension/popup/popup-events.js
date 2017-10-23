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
/* global sendMessageToTab */
const CONTAINER_ID = "status";
const POWER_BY_CLASS = "poweredBy";
const SELECT_ROW_ACTIVE = "suggestionActiveRow";
const REPLACEMENT_ACTIVE = "replacementActive";
const SELECT_TURN_OFF_RULE = "turnOffRuleActive";
const SELECT_ADD_TO_DICT = "addToDictActive";
const TURN_OFF_RULE = "turnOffRule";
const ADD_TO_DICT = "addToDict";
const SUGGESTION_ROW = "suggestionRow";
const REPLACEMENT_ROW = "replacement";
const UP_KEY = "ArrowUp";
const DOWN_KEY = "ArrowDown";
const LEFT_KEY = "ArrowLeft";
const RIGHT_KEY = "ArrowRight";
const ENTER_KEY = "Enter";
const ESCAPE_KEY = "Escape";
const DETECT_KEYS = [
  UP_KEY,
  DOWN_KEY,
  LEFT_KEY,
  RIGHT_KEY,
  ENTER_KEY,
  ESCAPE_KEY
];

let activeSelectRow = -1;
let activeReplacement = -1;
let activeTurnOffRule = false;
let activeAddToDict = false;

function selectedRow() {
  const activeElements = document.getElementsByClassName(SELECT_ROW_ACTIVE);
  if (activeElements && activeElements.length) {
    return activeElements[0];
  }
  return null;
}

function toggleSelectReplacement(replacements, index, isSelect = true) {
  if (replacements && replacements.length) {
    const selectedReplacement = replacements[index];
    if (selectedReplacement) {
      const { className } = selectedReplacement;
      if (isSelect) {
        if (className.indexOf(REPLACEMENT_ACTIVE) === -1) {
          selectedReplacement.className = `${className} ${REPLACEMENT_ACTIVE}`;
        }
      } else if (className.indexOf(REPLACEMENT_ACTIVE) !== -1) {
        selectedReplacement.className = className.replace(
          ` ${REPLACEMENT_ACTIVE}`,
          ""
        );
      }
    }
  }
}

function toggleSelectRow(rowIndex, isSelect = true) {
  const rows = document.getElementsByClassName(SUGGESTION_ROW);
  const currentRow = rows[rowIndex];
  if (currentRow) {
    const { className } = currentRow;
    if (isSelect) {
      if (className.indexOf(SELECT_ROW_ACTIVE) === -1) {
        currentRow.className = `${className} ${SELECT_ROW_ACTIVE}`;
      }
    } else {
      if (className.indexOf(SELECT_ROW_ACTIVE) !== -1) {
        currentRow.className = className.replace(` ${SELECT_ROW_ACTIVE}`, "");
      }
      const replacements = currentRow.getElementsByClassName(REPLACEMENT_ROW);
      toggleSelectReplacement(replacements, activeReplacement, false);
    }
  }
}

function scrollToActiveRow(duration = 200) {
  const element = selectedRow();
  if (element) {
    $.scrollTo(element, {
      axis: "y",
      duration
    });
  }
}

function resetTurnOffRuleAndAddToDict() {
  const turnOffRules = document.getElementsByClassName(SELECT_TURN_OFF_RULE);
  const addToDicts = document.getElementsByClassName(SELECT_ADD_TO_DICT);
  if (turnOffRules && turnOffRules.length) {
    for (let counter = 0; counter < turnOffRules.length; counter += 1) {
      const element = turnOffRules[counter];
      if (element && element.className.indexOf(SELECT_TURN_OFF_RULE) !== -1) {
        element.className = element.className.replace(
          ` ${SELECT_TURN_OFF_RULE}`,
          ""
        );
      }
    }
  }
  if (addToDicts && addToDicts.length) {
    for (let counter = 0; counter < addToDicts.length; counter += 1) {
      const element = addToDicts[counter];
      if (element && element.className.indexOf(SELECT_ADD_TO_DICT) !== -1) {
        element.className = element.className.replace(
          ` ${SELECT_ADD_TO_DICT}`,
          ""
        );
      }
    }
  }
}

function selectFirstReplacement() {
  const row = selectedRow();
  if (row) {
    const replacements = row.getElementsByClassName(REPLACEMENT_ROW);
    const maxReplacements = replacements.length || 0;
    if (activeReplacement < maxReplacements - 1) {
      toggleSelectReplacement(replacements, activeReplacement, false);
      activeReplacement += 1;
      toggleSelectReplacement(replacements, activeReplacement);
    }
  }
}

document.addEventListener(
  "keydown",
  event => {
    const keyName = event.key;
    if (DETECT_KEYS.indexOf(keyName) !== -1) {
      switch (keyName) {
        case UP_KEY:
          activeTurnOffRule = false;
          activeAddToDict = false;
          resetTurnOffRuleAndAddToDict();
          if (activeSelectRow >= 0) {
            toggleSelectRow(activeSelectRow, false);
            activeSelectRow -= 1;
            toggleSelectRow(activeSelectRow);
            activeReplacement = -1;
            selectFirstReplacement();
            scrollToActiveRow();
          }
          break;
        case DOWN_KEY:
          {
            const rows = document.getElementsByClassName(SUGGESTION_ROW);
            const maxRows = rows.length || 0;
            activeTurnOffRule = false;
            activeAddToDict = false;
            resetTurnOffRuleAndAddToDict();
            if (activeSelectRow < maxRows - 1) {
              toggleSelectRow(activeSelectRow, false);
              activeSelectRow += 1;
              toggleSelectRow(activeSelectRow);
              activeReplacement = -1;
              selectFirstReplacement();
              scrollToActiveRow();
            }
          }
          break;
        case LEFT_KEY:
          {
            const row = selectedRow();
            activeTurnOffRule = false;
            activeAddToDict = false;
            resetTurnOffRuleAndAddToDict();
            if(row) {
              if (activeReplacement <= 0) {
                // first line, navigate left to turn off rule or add to dict
                const replacements = row.getElementsByClassName(REPLACEMENT_ROW);
                const turnOffRule = row.getElementsByClassName(TURN_OFF_RULE);
                const addToDict = row.getElementsByClassName(ADD_TO_DICT);
                if (turnOffRule && turnOffRule.length && !activeTurnOffRule) {
                  toggleSelectReplacement(replacements, activeReplacement, false);
                  activeReplacement = replacements.length;
                  activeTurnOffRule = true;
                  const element = turnOffRule[0];
                  if (element && element.className.indexOf(SELECT_TURN_OFF_RULE) === -1) {
                    element.className += ` ${SELECT_TURN_OFF_RULE}`;
                  }
                }
                if (addToDict && addToDict.length && !activeAddToDict) {
                  toggleSelectReplacement(replacements, activeReplacement, false);
                  activeReplacement = replacements.length;
                  activeAddToDict = true;
                  const element = addToDict[0];
                  if (element && element.className.indexOf(SELECT_ADD_TO_DICT) === -1) {
                    element.className += ` ${SELECT_ADD_TO_DICT}`;
                  }
                }
              } else if (activeReplacement > 0) {
                const replacements = row.getElementsByClassName(REPLACEMENT_ROW);
                toggleSelectReplacement(replacements, activeReplacement, false);
                activeReplacement -= 1;
                toggleSelectReplacement(replacements, activeReplacement);
                if (Tools.isFirefox()) scrollToActiveRow(600);
              }
            }
          }
          break;
        case RIGHT_KEY:
          {
            const row = selectedRow();
            resetTurnOffRuleAndAddToDict();
            if (row) {
              const replacements = row.getElementsByClassName(REPLACEMENT_ROW);
              const maxReplacements = replacements.length || 0;
              if (activeReplacement < maxReplacements - 1) {
                toggleSelectReplacement(replacements, activeReplacement, false);
                activeReplacement += 1;
                activeTurnOffRule = false;
                toggleSelectReplacement(replacements, activeReplacement);
              } else {
                const turnOffRule = row.getElementsByClassName(TURN_OFF_RULE);
                const addToDict = row.getElementsByClassName(ADD_TO_DICT);
                if (
                  (turnOffRule && activeTurnOffRule) ||
                  (addToDict && activeAddToDict)
                ) {
                  toggleSelectReplacement(
                    replacements,
                    activeReplacement,
                    false
                  );
                  activeTurnOffRule = false;
                  activeAddToDict = false;
                  activeReplacement = 0;
                  toggleSelectReplacement(replacements, activeReplacement);
                } else if (turnOffRule && turnOffRule.length && !activeTurnOffRule) {
                  toggleSelectReplacement(replacements, activeReplacement, false);
                  activeReplacement += 1;
                  activeTurnOffRule = true;
                  const element = turnOffRule[0];
                  if (element && element.className.indexOf(SELECT_TURN_OFF_RULE) === -1) {
                    element.className += ` ${SELECT_TURN_OFF_RULE}`;
                  }
                } else if (addToDict && addToDict.length && !activeAddToDict) {
                  toggleSelectReplacement(replacements, activeReplacement, false);
                  activeReplacement += 1;
                  activeAddToDict = true;
                  const element = addToDict[0];
                  if (element && element.className.indexOf(SELECT_ADD_TO_DICT) === -1) {
                    element.className += ` ${SELECT_ADD_TO_DICT}`;
                  }
                }
              }
              if (Tools.isFirefox()) scrollToActiveRow(600);
            }
          }
          break;
        case ENTER_KEY:
          {
            const row = selectedRow();
            let hasTrigger = false;
            if (row) {
              if (activeTurnOffRule) {
                const turnOffRules = row.getElementsByClassName(SELECT_TURN_OFF_RULE);
                if (turnOffRules && turnOffRules.length) {
                  hasTrigger = true;
                  const element = turnOffRules[0];
                  if (element) {
                    element.click();
                  }
                }
              } else if (activeAddToDict) {
                const addToDicts = row.getElementsByClassName(SELECT_ADD_TO_DICT);
                if (addToDicts && addToDicts.length) {
                  hasTrigger = true;
                  const element = addToDicts[0];
                  if (element) {
                    element.click();
                  }
                }
              } else {
                const replacements = row.getElementsByClassName(REPLACEMENT_ACTIVE);
                if (replacements && replacements.length) {
                  const selectedReplacement = replacements[0];
                  hasTrigger = true;
                  if (selectedReplacement) {
                    selectedReplacement.click();
                  }
                }
              }
              // reset selection
              if (hasTrigger) {
                activeSelectRow = -1;
                activeReplacement = -1;
                activeTurnOffRule = false;
                activeAddToDict = false;
              }
            }
          }
          break;
        case ESCAPE_KEY:
          // close popup
          if (chrome && chrome.tabs) {
            chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
              if (tabs && tabs.length > 0) {
                sendMessageToTab(tabs[0].id, { action: "closePopup" });
              }
            });
          } else {
            chrome.runtime
              .sendMessage({
                action: "getActiveTab"
              })
              .then(
                response => {
                  if (response && response.tabs && response.tabs.length > 0) {
                    sendMessageToTab(response.tabs[0].id, { action: "closePopup"});
                  }
                },
                error => {
                  if (error) {
                    Tools.track("unknown", "error on getActiveTab", error.message);
                  }
                }
              );
          }
          break;
        default:
      }
    } else {
    }
  },
  false
);

function openPoweredByLink(evt) {
  evt.preventDefault();
  chrome.runtime
    .sendMessage({
      action: "openNewTab",
      url: this.href
    })
    .then(
      response => {
      },
      error => {
        if (error) {
          Tools.track(this.href, "error on openNewTab", error.message);
        }
      }
    );
}

function openPoweredByLinkOnNewTab() {
  // handle edge case for open poweredBy link from popup
  const poweredByElements = document.getElementsByClassName(POWER_BY_CLASS);
  if (poweredByElements.length) {
    for (let counter = 0; counter < poweredByElements.length; counter += 1) {
      const element = poweredByElements[counter];
      const anchorTag = element.getElementsByTagName("a");
      if (anchorTag.length) {
        anchorTag[0].addEventListener("click", openPoweredByLink);
      }
    }
  }
}

/** workaround for FF */
if (Tools.isFirefox()) {
  // create an observer instance
  const observer = new MutationObserver(mutations => {
    mutations.forEach(() => {
      openPoweredByLinkOnNewTab();
    });
  });

  document.addEventListener(
    "DOMContentLoaded",
    () => {
      const target = document.getElementById(CONTAINER_ID);
      const config = { childList: true };
      observer.observe(target, config);
    },
    false
  );

  window.addEventListener("unload", () => {
    observer.disconnect();
  });
}

/** Automatically handle errors, only works for popup **/
window.addEventListener('error', function(evt) {
  const { error } = evt;
  if (error) {
    Tools.track("unknown", `error message: ${error.message}`, error.stack);
  }
});