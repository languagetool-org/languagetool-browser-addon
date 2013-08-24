var activeElement = document.activeElement;

if(activeElement.hasAttribute("contenteditable")) {
	self.postMessage(activeElement.textContent);
} else if(activeElement.tagName=="TEXTAREA") {
	self.postMessage(activeElement.value.toString());
} else {
// 	self.postMessage(window.getSelection().toString()); // This does not work when the selected text is in an iframe (e.g. lt forum)
	self.postMessage("-NULL-");
}
