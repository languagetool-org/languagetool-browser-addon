self.port.on("setText", function(text) {
	document.getElementById("body").innerHTML=text;
});

window.addEventListener(
	'click',
	function(event) {
		var t=event.target;
		if(t.nodeName=="A") {
			event.stopPropagation();
			event.preventDefault();
			self.port.emit('linkClicked', t.toString());
		}
	},
	false
);
