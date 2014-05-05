function unhide() {
	for(var i=0; i<document.getElementsByClassName("hidden").length; ++i) {
		document.getElementsByClassName("hidden")[i].className="";
	}
	document.getElementById("unhidelink").innerHTML="";
}

function enableWebService() {
	addon.port.emit('enableWebService');
}

addon.port.on("setText", function(text) {
	// NOTE dynamically generated text went through escapeXml in main.js to avoid evaluating arbitrary text as html
	document.getElementById("body").innerHTML=text;
});

window.addEventListener(
	'click',
	function(event) {
		var t=event.target;
		event.stopPropagation();
		event.preventDefault();
		// the sanitizer eats all javascript:-links, so we use http
		if(t.toString().indexOf("http://unhide/")==0) {
			unhide();
		} else if(t.toString().indexOf("http://enablewebservice")==0) {
			enableWebService();
		} else if(t.toString().indexOf("javascript:recheck()")==0) {
			addon.port.emit("recheck");
		} else if(t.parentNode.className=="addword") {
			var word=t.parentNode.parentNode.nextSibling.getElementsByTagName("span")[0].textContent;
			addon.port.emit("addWordToDictionary", word);
			t.parentNode.classList.add("clicked");
		} else if(t.className=="suggestion") {
			var error=t.parentNode.nextSibling.getElementsByTagName("span")[0].textContent;
			var replacement=t.textContent;
			var context=t.parentNode.nextSibling.childNodes;
			var contextLeft="";
			var contextRight="";
			if(context.length==3) {
				contextLeft=context[0].textContent;
				contextRight=context[2].textContent;
			} else if(context.length==2) {
				if(context[0].nodeName=="SPAN") {
					contextRight=context[1].textContent;
				} else {
					contextLeft=context[0].textContent;
				}
			}
			if(contextLeft.substr(0,1)=='…') contextLeft=contextLeft.substr(1);
			if(contextRight.substr(contextRight.length-1,1)=='…') contextRight=contextRight.slice(0,contextRight.length-1);
			addon.port.emit("applySuggestion", error, replacement, contextLeft, contextRight);
			t.classList.add("clicked");
		} else  if(t.nodeName=="A") {
			var link=t.toString();
			if(link=="http://about_addons") link="about:addons";
			addon.port.emit('linkClicked', link);
		}
	},
	false
);
