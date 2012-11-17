function unhide() {
	for(var i=0; i<document.getElementsByClassName("hidden").length; ++i) {
		document.getElementsByClassName("hidden")[i].className="";
	}
	document.getElementById("unhidelink").innerHTML="";
}

self.port.on("setText", function(text) {
	// dynamically generated text went through escapeXml in main.js to avoid evaluating arbitrary text as html
	document.getElementById("body").innerHTML=text;
});

window.addEventListener(
	'click',
	function(event) {
		var t=event.target;
		if(t.nodeName=="A" && t.toString().indexOf("javascript:")!=0) {
			event.stopPropagation();
			event.preventDefault();
			self.port.emit('linkClicked', t.toString());
		}
		if(t.toString().indexOf("javascript:unhide()")==0)
			unhide(); // WORKAROUND don't know why fx says "ReferenceError: unhide is not defined"
	},
	false
);
