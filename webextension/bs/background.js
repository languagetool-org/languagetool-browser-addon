chrome.runtime.setUninstallURL("https://languagetool.org/webextension/uninstall.php");

// would require "management" permission:
//chrome.management.onUninstalled.addListener(function() {
//  Tools.track("http://unknown.domain", "uninstall");
//});

function onClickHandler(info, tab) {
  if (chrome && chrome.browserAction && chrome.browserAction.openPopup) {
    if (Tools.isFirefox()) {
      chrome.browserAction.openPopup();
    } else {
      // 'openPopup' is not documented at https://developer.chrome.com/extensions/browserAction,
      // and it's not in Chrome 50 (but in Chromium 49) so we are careful and don't call it if it's not there.
      // Also see https://bugs.chromium.org/p/chromium/issues/detail?id=436489
      chrome.browserAction.openPopup(
        function(popupView) {}
      );
    }
  }
}

if (chrome && chrome.browserAction && chrome.browserAction.openPopup) {
  chrome.contextMenus.onClicked.addListener(onClickHandler);
  chrome.runtime.onInstalled.addListener(function() {
    chrome.commands.getAll(function(commands) {
      let shortcut = "";
      if (commands && commands.length && commands.length > 0 && commands[0].shortcut) {
        shortcut = commands[0].shortcut;
      }
      // there seems to be no better way to show the shortcut (https://bugs.chromium.org/p/chromium/issues/detail?id=142840):
      const title = shortcut ? chrome.i18n.getMessage("contextMenuItemWithShortcut", shortcut) : chrome.i18n.getMessage("contextMenuItem");
      chrome.contextMenus.create({"title": title, "contexts":["selection", "editable"], "id": "contextLT"});
    });
    // With an entry only for 'editable' we could have a better name, but then Chrome will
    // move both entries into a sub menu, which is very bad for usability, so 'editable' is covered
    // by the entry above instead:
    //chrome.contextMenus.create({"title": "Check text field", "contexts":["editable"], "id": "contextLTeditable"});
  });
}

/* workaround handle for FF */
chrome.runtime.onMessage.addListener(handleMessage);
function handleMessage(request, sender, sendResponse) {
  switch (request.action) {
    case "openNewTab": {
      const { url } = request;
      chrome.tabs.create({ url });
      return false;
    }
    case "getActiveTab": {
      chrome.tabs.query(
        {
          active: true,
          currentWindow: true
        },
        tabs => {
          sendResponse({
            action: request.action,
            tabs
          });
        }
      );
      return true;
    }
    default: {
      if (request.tabId) {
        // proxy msg from cs -> bg -> cs
        chrome.tabs.sendMessage(request.tabId, request, response => {
          sendResponse(response);
        });
        return true;
      }
      // TODO: handle for unknown action
      sendResponse({
        action: `unknow ${request.action}`
      });
      return false;
    }
  }
}

chrome.runtime.onConnect.addListener(function(port) {
  console.assert(port.name == "LanguageTool");
  port.onMessage.addListener((msg) => {
    if (msg.action == "checkText") {
      const { markupList, metaData  } = msg.data;
      getCheckResult(markupList, metaData, response => {
        port.postMessage({
          action: 'checkText',
          success: true,
          result: JSON.parse(response)
        });
      }, (errorMessage) => {
        console.warn('found error', errorMessage);
        port.postMessage({
          action: 'checkText',
          success: false,
          errorMessage
        });
      })
    }
  });
});

chrome.webNavigation.onCompleted.addListener(function(){
  let storage = Tools.getStorage();
  storage.remove('savedLanguage');
});