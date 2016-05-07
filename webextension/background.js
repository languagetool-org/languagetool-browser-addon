
/*
function onClickHandler(info, tab) {
  // Seems it's not possible to open the popup from a context menu:
  //   http://stackoverflow.com/questions/17851700/how-to-open-the-default-popup-from-context-menu-in-a-chrome-extension
  //   http://stackoverflow.com/questions/10479679/how-can-i-open-my-extensions-pop-up-with-javascript
  // If this ever gets activated, it also needs the 'contextMenus' permission.
}
chrome.contextMenus.onClicked.addListener(onClickHandler);
chrome.runtime.onInstalled.addListener(function() {
  chrome.contextMenus.create({"title": "Check selected text", "contexts":["selection"], "id": "contextLT"});
  chrome.contextMenus.create({"title": "Check text field", "contexts":["editable"], "id": "contextLTeditable"});
});
*/

function toggleToolbar() {
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, "toggle-in-page-toolbar");
  });
}

chrome.browserAction.onClicked.addListener(toggleToolbar);

// Handle connections received from the add-on toolbar ui iframes.
chrome.runtime.onConnect.addListener(function (port) {
  if (port.sender.url == chrome.runtime.getURL("toolbar/ui.html")) {
    // Handle port messages received from the connected toolbar ui frames.
    port.onMessage.addListener(toggleToolbar);
  }
});
