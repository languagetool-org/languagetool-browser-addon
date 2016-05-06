
// TODO: this needs "contextMenus" permissions
/*
function onClickHandler(info, tab) {
  //TODO: check text
}

chrome.contextMenus.onClicked.addListener(onClickHandler);
chrome.runtime.onInstalled.addListener(function() {
  //TODO: i18n
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
