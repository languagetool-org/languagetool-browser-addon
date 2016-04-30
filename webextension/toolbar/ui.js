var port = chrome.runtime.connect();

document.querySelector("#toggle").addEventListener("click", function() {
  // Ask the background page to toggle the toolbar on the current tab
  port.postMessage("toggle-in-page-toolbar");
});
