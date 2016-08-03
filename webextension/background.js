
chrome.runtime.setUninstallURL("https://languagetool.org/webextension/uninstall.php");

function onClickHandler(info, tab) {
  if (chrome && chrome.browserAction && chrome.browserAction.openPopup) {
    // 'openPopup' is not documented at https://developer.chrome.com/extensions/browserAction,
    // and it's not in Chrome 50 (but in Chromium 49) so we are careful and don't call it if it's not there.
    // Also see https://bugs.chromium.org/p/chromium/issues/detail?id=436489
    chrome.browserAction.openPopup(
        function(popupView) {}
    );
  }
}

/*
This almost works for Firefox, but browser.browserAction.openPopup is missing:
 - https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/BrowserAction/openPopup
 - https://github.com/languagetool-org/languagetool-browser-addon/issues/45
if (browser && browser.browserAction && browser.browserAction.openPopup) {
  browser.contextMenus.create({"title": "FIXME", "contexts":["selection", "editable"], "id": "contextLT"});
}*/

if (chrome && chrome.browserAction && chrome.browserAction.openPopup) {
  chrome.contextMenus.onClicked.addListener(onClickHandler);
  chrome.runtime.onInstalled.addListener(function() {
    chrome.commands.getAll(function(commands) {
      var shortcut = "";
      if (commands && commands.length && commands.length > 0 && commands[0].shortcut) {
        shortcut = commands[0].shortcut;
      }
      // there seems to be no better way to show the shortcut (https://bugs.chromium.org/p/chromium/issues/detail?id=142840):
      let title = shortcut ? chrome.i18n.getMessage("contextMenuItemWithShortcut", shortcut) : chrome.i18n.getMessage("contextMenuItem");
      chrome.contextMenus.create({"title": title, "contexts":["selection", "editable"], "id": "contextLT"});
    });
    // With an entry only for 'editable' we could have a better name, but then Chrome will
    // move both entries into a sub menu, which is very bad for usability, so 'editable' is covered
    // by the entry above instead:
    //chrome.contextMenus.create({"title": "Check text field", "contexts":["editable"], "id": "contextLTeditable"});
  });
}

// Flash the icon as a reminder if the user hasn't used this extension for a long time.
/*function checkUsage() {
  var storage = chrome.storage.sync ? chrome.storage.sync : chrome.storage.local;
  storage.get({
    lastCheck: null
  }, function(items) {
    let now = new Date().getTime();
    let diffSeconds = (now - items.lastCheck) / 1000;
    let diffHours = diffSeconds / 60 / 60;
    //console.log("lastCheck:" + items.lastCheck + ", diffSeconds: " + diffSeconds + ", diffHours: " + diffHours);
    if (diffHours > 7*24) {  // TODO: make sure to not repeat the warning for n hours & only show if user is typing
      flashIcon(3);
    }
    setTimeout(function() {checkUsage()}, 10000);
  });
}

function flashIcon(times) {
  if (times <= 0) {
    return;
  }
  setTimeout(function() {
    chrome.browserAction.setIcon({path: "images/icon48-highlight.png"});
    setTimeout(function () {
      chrome.browserAction.setIcon({path: "images/icon48.png"});
      flashIcon(times - 1);
    }, 500);
  }, 500);
}

checkUsage();
*/