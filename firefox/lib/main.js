var cm=require("sdk/context-menu");
var file=require("sdk/io/file");
var hotkeys=require("sdk/hotkeys");
var panels=require("sdk/panel");
var requests=require("sdk/request");
var selection=require("sdk/selection");
var self=require("sdk/self");
var simpleprefs=require("sdk/simple-prefs");
var system = require("sdk/system");
var tabs=require("sdk/tabs");
// tabs.open("http://www.languagetool.org/forum/");
var timer=require("sdk/timers");
var widgets=require("sdk/widget");
var _=require("sdk/l10n").get;

var EMPTYTEXTWARNING="<div class=\"status\">"+_("emptyText")+"</div>";
var PLEASEWAITWHILECHECKING="<div class=\"status\">"+_("pleaseWaitWhileChecking")+"</div>";
var MAXCONTEXTLENGTH=20;
var MAXLENGTHWEBSERVICE=50000;
var PERSDICTFILE=file.join(system.pathFor("ProfD"), "persdict.dat");
var PERSDICT=file.exists(PERSDICTFILE) ? file.read(PERSDICTFILE,"r").split("\n") : [];

var contentString="";
var originalContentStringLength=0;
var selectedText="";
var selectedTextProcessed="";
var framePermissionProblem="";
var showResultsInPanel=true;
var sidebarWorkers=[];
var sidebarTextCache="";

function selectionChanged(event) {
	selectedText=selection.text;
}

selection.on("select", selectionChanged);

/**
 * escape &, <, >, and " in xml
 */
function escapeXml(string) {
	// prevent double escaping of html entities
	string=string.replace(/&quot;/g,"\"").replace(/&lt;/g,"<").replace(/&gt;/g,">");
	return string.replace(/&/g,"&amp;").replace(/\</g,"&lt;").replace(/\>/g,"&gt;").replace(/\"/g,"&quot;");
}

/**
 * removes contents of <script>, html tags, newlines, and trims the resulting string
 */
function preprocess(text) {
	text=text.replace(/\<script[\s\S]*?\>[\s\S]*?\<\/script\>/gm," <BR> ") // remove everything between <script>-Tags
	         .replace(/\<\/?([\s\S]*?)\>/gm,"") // remove html tags
	
	if(simpleprefs.prefs.ignoreQuotes) {
		text=text.replace(/^>.*?\n/gm, '\n')
		         .replace(/\n>.*?\n/gm, '\n')
		         .replace(/\n>.*?$/gm, '\n'); // remove quotes
	}
	
	return text.replace(/(\r\n|\n|\r)/gm," <BR> ") // remove newlines
	           .replace(/(\s+\<BR\>\s+(\<BR\>\s+)*)/g," ") // remove extra spaces added after newline
	           .replace(/^\s+|\s+$/g,""); // trim
}

function formatError(error) {
	var prepend="";
	if(error.indexOf("language code")!=-1) {
		prepend=_("checkLanguageCode")+"<br/>";
	}
	error=escapeXml(error);
	return prepend
	       + error.replace(/(\r\n|\n|\r)/," <a id=\"unhidelink\" href=\"javascript:unhide();\">…</a><br/>")
	              .replace(/\<br\/\>/,"<div class=\"hidden\">")
	              .replace(/(\r\n|\n|\r)/,"<br/>")
	       + "</div>";
}

function getAttributeValue(string, attribute) {
	if(string.indexOf(attribute+"=\"")==-1)
		return "";
	return string.split(attribute+"=\"")[1].split("\"")[0];
}

function getLanguage(response, attr) {
	if(response.indexOf("language")==-1)
		return "";
	response=response.split("language")[1];
	if(response.indexOf(" "+attr+"=\"")==-1)
		return "";
	return response.split(" "+attr+"=\"")[1].split("\"")[0];
}

/**
 * @returns the suggestions from the given @param xml snippet, each within a <span>, wrapped in a <div class="suggestions"> (if any)
 */
function getSuggestions(xml) {
	var suggestions=getAttributeValue(xml, "replacements");
	
	if(suggestions=="") return "";
	
	suggestions=suggestions.split("#");
	
	var returnText="";
	for(var i=0; i<suggestions.length; i++) {
		returnText+="<span>"+suggestions[i]+"</span>";
	}
	
	return '<div class="suggestions">'+returnText+'</div>';
}

function createReport(response, selectedTextProcessed) {
	var returnLanguage="";
	var returnTextGrammar="";
	var returnTextSpelling="";
	var permissionNote=framePermissionProblem;
	framePermissionProblem="";
	
	var lang=escapeXml(getLanguage(response, "name"));
	var mothertongue=escapeXml(getLanguage(response, "mothertonguename"));
	
	if(lang!="") {
		returnLanguage="<div class=\"status\">"+_("textLanguage")+" "+lang+"</div>";
	}
	if(mothertongue!="" && (lang=="" || mothertongue!=lang)) {
		returnLanguage+="<div class=\"status\">"+_("motherTongue")+" "+mothertongue+"</div>";
	}
	if(returnLanguage!="") {
		returnLanguage+="<hr/>";
	}
	
	response=response.split("<error ");
	
	if(response.length<2) {
		// #22 close sidebar when there are no mistakes
		sidebar.hide();
		panel.show();
		return returnLanguage+"<div class=\"status\">"+_("noProblemsFound")+"</div>"
		                     +"<div id=\"clickAnywhereToClose\" class=\"status\">("+_("clickAnywhereToClose")+")</div>";
	}
	
	for(var i=1; i<response.length; ++i) {
		var returnText="<div class=\"msg\">"+escapeXml(getAttributeValue(response[i],"msg"))+"</div>";
		
		returnText+=getSuggestions(response[i]);
		
		fromx=getAttributeValue(response[i],"fromx");
		tox=getAttributeValue(response[i],"tox");
		leftContext=selectedTextProcessed.substring(0,fromx);
		if(leftContext.length>MAXCONTEXTLENGTH) {
			leftContext="&hellip;"+escapeXml(leftContext.substring(leftContext.length-MAXCONTEXTLENGTH));
		}
		markedText=escapeXml(selectedTextProcessed.substring(fromx,tox));
		rightContext=selectedTextProcessed.substring(tox);
		if(rightContext.length>MAXCONTEXTLENGTH) {
			rightContext=escapeXml(rightContext.substring(0,MAXCONTEXTLENGTH))+"&hellip;";
		}
		id=getAttributeValue(response[i],"ruleId");
		if(id.indexOf("MORFOLOGIK")!=-1 || id.indexOf("HUNSPELL")!=-1 || id.indexOf("SPELLER_RULE")!=-1) {
			markerClass="markerSpelling";
		} else {
			markerClass="markerGrammar";
		}
		returnText+="<div class=\"context\">"+leftContext+"<span class=\""+markerClass+"\">"+markedText+"</span>"+rightContext+"</div>";
		
		url=escapeXml(getAttributeValue(response[i],"url"));
		if(url!="") {
			returnText+="<div class=\"url\"><a targer=\"_blank\" href=\""+url+"\">"+_("moreInformation")+"</a></div>";
		}
		
		returnText+="<hr/>";
		
		if(returnText.indexOf("markerGrammar")!=-1) {
			returnTextGrammar+=returnText;
		} else {
			if(PERSDICT.indexOf(markedText)==-1) { // ignore spelling mistakes if the word is in personal dictionary
				returnTextSpelling+=returnText;
			}
		}
	} // for each <error/>
	
	if(!simpleprefs.prefs.enableSpellCheck) {
		returnTextSpelling="";
	}
	
	// permissionNote at the end since we don't know whether there is any active text field (TODO must be possible to determine it)
	var returnText=returnLanguage+returnTextGrammar+returnTextSpelling+permissionNote;
	
	console.log("returnText: "+returnText);
	return returnText;
}

function emitSetText(text) {
	panel.port.emit("setText", text);
	if(sidebarWorkers.length>0) {
		// TODO should be per window
		for(var i=0; i<sidebarWorkers.length; ++i) {
			sidebarWorkers[i].port.emit("setText", text);
		}
		sidebarTextCache=text;
	} else if(!showResultsInPanel) {
		console.log("setText requested for sidebar, but sidebarWorkers.length is 0");
		sidebarTextCache=text;
	}
}

var sidebar=require("sdk/ui/sidebar").Sidebar({
	id: 'languagetoolfx-sidebar',
	title: 'LanguageToolFx',
	url: require("sdk/self").data.url("sidebar.html"),
	onAttach: function(worker) {
		
		sidebarWorkers.push(worker);
		console.log("sidebarWorker added " + sidebarWorkers.length + " " + sidebarTextCache.substr(0,10));
		
		// it might happen that the sidebarWorker is created delayed, so that the original setText event is missed
		if(sidebarTextCache!="") {
			worker.port.emit("setText", sidebarTextCache);
			sidebarTextCache="";
			console.log("sidebarTextCache cleared");
		}
		
		worker.port.on("linkClicked", function(url) {
			tabs.open(url);
		});
		
		worker.port.on("applySuggestion", function(error, replacement, contextLeft, contextRight) {
			applySuggestion(error, replacement, contextLeft, contextRight)
		});
		
		worker.port.on("enableWebService", function() {
			simpleprefs.prefs.enableWebService=true;
			widgetClicked();
		});
		
	},
	onDetach: function(worker) {
		var index=sidebarWorkers.indexOf(worker);
		if(index!=-1) {
			sidebarWorkers.splice(index, 1);
		}
	}
});

var panel=panels.Panel({
	contentURL: self.data.url("panel.html"),
	contentScriptFile: self.data.url("panel.js"),
	onHide: function () {
		panel.port.emit("setText", "");
	},
	position: {
		right: 0,
		bottom: 0
	},
	width: 330,
	heigth: 250
});

emitSetText("");

panel.port.on("linkClicked", function(url) {
	tabs.open(url);
});

panel.port.on("enableWebService", function() {
	simpleprefs.prefs.enableWebService=true;
	widgetClicked();
});

panel.port.on("applySuggestion", function(error, replacement, contextLeft, contextRight) {
	applySuggestion(error, replacement, contextLeft, contextRight)
});

panel.port.on("closePopup", function() {
	panel.hide();
});

panel.port.on("openSidebar", function() {
	showResultsInPanel=false;
	widgetClicked();
});

function checkTextOnlineCompleted(response) {
	var webServiceNote="<div class=\"status\">"+_("webServiceUsed");
	if(contentString.length!=originalContentStringLength) {
		webServiceNote+="<br/>"+_("textShortened");
	}
	webServiceNote+="</div><hr/>";
	if(response.status!=200) {
		console.log("Response status: "+response.status);
		var errorText=webServiceNote+_("errorOccurredStatus")+" "+response.status;
		if(response.status==500) {
			errorText+="<br/>"+formatError(response.text);
		}
		emitSetText("<div class=\"status\">"+errorText+"</div>");
	} else {
		var text=response.text;
		console.log("Response: "+text);
		emitSetText(webServiceNote+createReport(text, selectedTextProcessed));
	}
}

function checkTextLocalCompleted(response) {
	if(response.status!=200) {
		console.log("Response status: "+response.status);
		if(simpleprefs.prefs.enableWebService) {
			contentString=contentString.substring(0,MAXLENGTHWEBSERVICE);
			var checkTextOnline=requests.Request({
				url: "https://languagetool.org:8081/",
				onComplete: function (response) {
					timer.setTimeout(function() {
						checkTextOnlineCompleted(response, contentString)
					},0);
				},
				content: contentString
			});
			console.log("Connecting with web service");
			var errorText=_("usingWebService",response.status);
			emitSetText("<div class=\"status\">"+errorText+"</div>");
			checkTextOnline.post();
		} else {
			var errorText=_("errorOccurredStatus")+" "+response.status;
			if(response.status==0) {
				errorText+="<br/>"+_("checkLtRunning", simpleprefs.prefs.localServerUrl);
			} else if(response.status==500) {
				errorText+="<br/>"+formatError(response.text);
			}
			emitSetText("<div class=\"status\">"+errorText+"</div>");
		}
	} else {
		var text=response.text;
		console.log("Response: "+text);
		emitSetText(createReport(text, selectedTextProcessed));
	}
}

function applySuggestion(error, replacement, contextLeft, contextRight) {
	replaceWorker = tabs.activeTab.attach({
		contentScriptFile: self.data.url("replaceText.js"),
	});
	replaceWorker.port.emit("applySuggestion", error, replacement, contextLeft, contextRight, "Sorry, suggestions can be applied to text in (“real”) text fields only. (Please make also sure that the cursor is still in the text field.");
	timer.setTimeout(function(){recheck()},300);
}

// TODO functions should get sensible names
function recheck() {
	widgetOnClick();
}

function widgetClicked() {
	emitSetText(PLEASEWAITWHILECHECKING);
	
	// avoid that selectedText is changed while the text is being checked
	selectedTextProcessed=selectedText;
	
	if(selectedTextProcessed!=null) {
		console.log("Selection: "+selectedTextProcessed);
		selectedTextProcessed=preprocess(selectedTextProcessed);
	}
	
	console.log(showResultsInPanel);
	if(showResultsInPanel) {
		panel.show();
		sidebar.hide();
	} else {
		sidebar.show();
		panel.hide();
	}
	
	var emptyTextWarning = EMPTYTEXTWARNING+framePermissionProblem;
	
	if(selectedTextProcessed==null || selectedTextProcessed=="") {
		emitSetText(emptyTextWarning);
		framePermissionProblem="";
		return;
	}
	
	console.log("Selection (preprocessed): "+selectedTextProcessed);
	console.log("Selection (encoded): "+encodeURIComponent(selectedTextProcessed));
	
	var autodetect="";
	if(simpleprefs.prefs.autodetect) {
		autodetect="&autodetect=1";
	}
	
	var mothertongue="";
	if(simpleprefs.prefs.mothertongue!="") {
		mothertongue="&motherTongue="+simpleprefs.prefs.mothertongue;
	}
	
	contentString="useragent=languagetoolfx&language="+simpleprefs.prefs.language+mothertongue+autodetect+"&text="+encodeURIComponent(selectedTextProcessed);
	originalContentStringLength=contentString.length;
	
	var checkTextLocal=requests.Request({
		url: simpleprefs.prefs.localServerUrl,
		onComplete: function (response) {
			timer.setTimeout(function() { // workaround for NS_ERROR_XPC_BAD_CONVERT_JS
				checkTextLocalCompleted(response)
			},0);
		},
		content: contentString
	});
	
	if(selectedTextProcessed!=null && selectedTextProcessed!="") {
		console.log(contentString);
		checkTextLocal.post();
	} else {
		emitSetText(emptyTextWarning);
		framePermissionProblem="";
	}
}

function widgetOnClick() {
	tabs.activeTab.attach({
		contentScriptFile: self.data.url("content.js"),
		onMessage: function (message) {
			if(message.substring(0,17)=="-FRAMEPERMISSION-") {
				// NOTE content.js assures that only the exception text and no arbitrary text is passed with this prefix.
				framePermissionProblem="<hr/><div class=\"status\">"
					+_("framePermission",message.substring(message.indexOf("-",1)+1))
					+"</div><hr/>";
			} else {
				if(message!="-NULL-") selectedText=message;
				widgetClicked();
			}
		}
	});
}

var widget=widgets.Widget({
	id: "lt-check",
	label: _("checkSelectionWithLT"),
	contentURL: self.data.url("iconSmall.ico"),
	panel: panel,
	contentScriptFile: self.data.url("widget.js")
});

widget.port.on("widgetOnLeftClick", function() {
	showResultsInPanel=(simpleprefs.prefs.leftClickAction=="popup");
	widgetOnClick();
});

widget.port.on("widgetOnMiddleClick", function() {
	showResultsInPanel=(simpleprefs.prefs.middleClickAction=="popup");
	widgetOnClick();
});

widget.port.on("widgetOnRightClick", function() {
	showResultsInPanel=(simpleprefs.prefs.rightClickAction=="popup");
	widgetOnClick();
});

var contextmenuitemSelection=cm.Item({
	label: _("checkSelectionWithLTShort"),
	context: cm.SelectionContext(),
	// SDK bug 851647
	contentScript: 'self.on("click", function(){self.postMessage()});',
	onMessage: function() {
		showResultsInPanel=(simpleprefs.prefs.contextmenuitemSelectionAction=="popup");
		widgetClicked();
	},
	image: self.data.url("iconSmall.ico")
});

var contextmenuitemTextarea=cm.Item({
	label: _("checkTextareaWithLTShort"),
	context: cm.SelectorContext("input, textarea, [contenteditable='true']"),
	// SDK bug 851647
	contentScript: 'self.on("click", function(){self.postMessage()});',
	onMessage: function() {
		showResultsInPanel=(simpleprefs.prefs.contextmenuitemTextarea=="popup");
		widgetOnClick();
	},
	image: self.data.url("iconSmall.ico")
});

var checkSelectionHotkey=hotkeys.Hotkey({
// 	combo: "accel-shift-l",
	combo: simpleprefs.prefs.hotkeySelection,
	onPress: function() {
		showResultsInPanel=(simpleprefs.prefs.hotkeySelectionAction=="popup");
		widgetClicked();
	}
});

var checkTextareaHotkey=hotkeys.Hotkey({
// 	combo: "accel-shift-return",
	combo: simpleprefs.prefs.hotkeyTextarea,
	onPress: function() {
		showResultsInPanel=(simpleprefs.prefs.hotkeyTextareaAction=="popup");
		widgetOnClick();
	}
});
