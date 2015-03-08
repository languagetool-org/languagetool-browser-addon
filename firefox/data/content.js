var activeElement = document.activeElement;

if(activeElement.tagName=="IFRAME" || activeElement.tagName=="FRAME") {
	try {
		activeElement=document.activeElement.contentWindow.document.activeElement;
	} catch(e) {
		console.log("Error accessing iframe contents: " + e);
		self.postMessage("-FRAMEPERMISSION-"+e);
	}
}

var text="-NULL-";

if(activeElement.hasAttribute("contenteditable")) {
	text=activeElement.textContent;
} else if(activeElement.tagName=="TEXTAREA" || (activeElement.tagName=="INPUT" && activeElement.type!="password") ) {
	text=activeElement.value.toString();
} else {
// 	text=window.getSelection().toString()); // This does not work when the selected text is in an iframe (e.g. lt forum), and we also want to have the latest selection (multiple selections possible with frames)
}

if(text.substring(0,17)=="-FRAMEPERMISSION-") {
	// prevent that we display code after the second "-" in the panel
	text=text.substring(1);
}

activeElement.setAttribute("langToolActive", 1);
self.postMessage(text);
