function unhide() {
	for(var i=0; i<document.getElementsByClassName("hidden").length; ++i) {
		document.getElementsByClassName("hidden")[i].className="";
	}
	document.getElementById("unhidelink").innerHTML="";
}

function enableWebService() {
	self.port.emit('enableWebService');
}

function openSidebar() {
	self.port.emit('openSidebar');
}

function closePopup() {
	self.port.emit('closePopup');
}

self.port.on("setText", function(text) {
	// NOTE dynamically generated text went through escapeXml and parser.sanitize in main.js to avoid evaluating arbitrary text as html
	document.getElementById("body").innerHTML=text;
	
	// when there are no errors, hide the 'open sidebar' link
	if(document.getElementById("clickAnywhereToClose")==null) {
		document.getElementById("openSidebar").style.display="block";
	} else {
		document.getElementById("openSidebar").style.display="none";
	}
});

window.addEventListener(
	'click',
	function(event) {
		var t=event.target;
		event.stopPropagation();
		event.preventDefault();
		if(t.toString().indexOf("http://unhide")==0) {
			unhide();
		} else if(t.toString().indexOf("javascript:openSidebar()")==0) {
			openSidebar();
		} else if(t.toString().indexOf("javascript:closePopup()")==0) {
			closePopup();
		} else if(t.toString().indexOf("http://enablewebservice")==0) {
			enableWebService();
		} else if(t.parentNode.className=="addword") {
			var word=t.parentNode.parentNode.nextSibling.getElementsByTagName("span")[0].textContent;
			self.port.emit("addWordToDictionary", word);
			t.parentNode.classList.add("clicked");
		} else if(t.parentNode.className=="ignorephrase") {
			var word=t.parentNode.parentNode.nextSibling.getElementsByTagName("span")[0].textContent;
			self.port.emit("addToIgnoredPhrases", word);
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
			self.port.emit("applySuggestion", error, replacement, contextLeft, contextRight);
			t.classList.add("clicked");
		} else  if(t.nodeName=="A") {
			var link=t.toString();
			if(link=="http://about_addons/") link="about:addons";
			self.port.emit('linkClicked', link);
		}
	},
	false
);
