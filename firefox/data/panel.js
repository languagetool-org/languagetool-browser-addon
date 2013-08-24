function unhide() {
	for(var i=0; i<document.getElementsByClassName("hidden").length; ++i) {
		document.getElementsByClassName("hidden")[i].className="";
	}
	document.getElementById("unhidelink").innerHTML="";
}

function enableWebService() {
	self.port.emit('enableWebService');
}

function closePopup() {
	self.port.emit('closePopup');
}

self.port.on("setText", function(text) {
	// NOTE dynamically generated text went through escapeXml in main.js to avoid evaluating arbitrary text as html
	document.getElementById("body").innerHTML=text;
});

window.addEventListener(
	'click',
	function(event) {
		var t=event.target;
		event.stopPropagation();
		event.preventDefault();
		if(t.nodeName=="A" && t.toString().indexOf("javascript:")!=0) {
			self.port.emit('linkClicked', t.toString());
		} else if(t.toString().indexOf("javascript:unhide()")==0) {
			unhide(); // WORKAROUND don't know why fx says "ReferenceError: unhide is not defined"
		} else if(t.toString().indexOf("javascript:closePopup()")==0) {
			closePopup();
		} else if(t.toString().indexOf("javascript:enableWebService()")==0) {
			enableWebService();
		}
	},
	false
);
