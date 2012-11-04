var activeElement = document.activeElement;
if(activeElement.tagName=="TEXTAREA") {
	self.postMessage(activeElement.value.toString());
} else {
// 	self.postMessage(window.getSelection().toString()); // This does not work when the selected text is in an iframe (e.g. lt forum)
	self.postMessage("-NULL-");
}
