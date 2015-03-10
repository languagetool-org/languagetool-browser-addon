const {Cc, Ci} = require("chrome");
var cm=require("sdk/context-menu");
var file=require("sdk/io/file");
var hotkeys=require("sdk/hotkeys");
var panels=require("sdk/panel");
var parser=Cc["@mozilla.org/parserutils;1"].getService(Ci.nsIParserUtils);
var persDict=Cc["@mozilla.org/spellchecker/personaldictionary;1"].getService(Ci.mozIPersonalDictionary);
var requests=require("sdk/request");
var selection=require("sdk/selection");
var self=require("sdk/self");
var simpleprefs=require("sdk/simple-prefs");
var tabs=require("sdk/tabs");
var timer=require("sdk/timers");
var {ToggleButton} = require("sdk/ui/button/toggle");
var _=require("sdk/l10n").get;
var pageMod=require("sdk/page-mod");

var EMPTYTEXTWARNING="<div class=\"status\">"+_("emptyText")+"</div>";
var THROBBERIMG="<img id=\"throbber\" src=\"throbber_48.png\"/>";
var PLEASEWAITWHILECHECKING="<div class=\"status\">"+_("pleaseWaitWhileChecking")+"</div>"+THROBBERIMG;
var MAXCONTEXTLENGTH=20;
var MAXLENGTHWEBSERVICE=50000;
var RECHECKDELAY=300;

var contentString="";
var originalContentStringLength=0;
var selectedText="";
var selectedTextProcessed="";
var framePermissionProblem="";
var showResultsInPanel=true;
var sidebarWorkers=[];
var sidebarCacheTimer=null;
var sidebarTextCache="";
var ports=[];

function selectionChanged(event) {
	selectedText=selection.text;
}

selection.on("select", selectionChanged);

/**
 * escape &, <, >, and " in xml
 */
function escapeXml(string) {
	// prevent double escaping of html entities
	string=string.replace(/&quot;/g,"\"").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/\&apos;/g, "'");
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
	       + error.replace(/(\r\n|\n|\r)/," <a id=\"unhidelink\" href=\"http://unhide\">…</a><br/>")
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
 * @returns the suggestions from the given @param xml snippet, each within a <span class="suggestion">, wrapped in a <div class="suggestions"> (if any)
 * @param spellerRuleSuggestion when true, a link for adding the marked text to the user’s dictionary is appended to the list of suggestions, otherwise for ignoring the phrase
 */
function getSuggestions(xml, spellerRuleSuggestion) {
	var suggestions=getAttributeValue(xml, "replacements");

	var returnText="";

	if(suggestions!="") {
		suggestions=suggestions.split("#");

		for(var i=0; i<suggestions.length; i++) {
			suggestions[i]=suggestions[i].replace(/^ /, "␣").replace(/ $/, "␣");
			returnText+='<span class="suggestion">'+escapeXml(suggestions[i])+'</span>';
		}
		console.log(returnText);
	}

	var addword;
	if(spellerRuleSuggestion) {
		addword = ' <span class="addword">+<span> '+_("addWordToDictionary")+'</span></span>';
	} else {
		addword = ' <span class="ignorephrase">+<span> '+_("ignorePhrase")+'</span></span>';
	}

	if(returnText+addword=="") return "";
	return '<div class="suggestions">'+returnText+addword+'</div>';
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

	ignoredPhrases = simpleprefs.prefs.ignoredPhrases;
	if(!ignoredPhrases) ignoredPhrases = "";

	response=response.split("<error ");

	var noProblemsFoundText=returnLanguage+"<div class=\"status\">"+_("noProblemsFound")+"</div>"
		               +"<div id=\"clickAnywhereToClose\" class=\"status\">("+_("clickAnywhereToClose")+")</div>";

	if(response.length<2) {
		// #22 close sidebar when there are no mistakes
		sidebar.hide();
		panel.show();
		return noProblemsFoundText;
	}

	for(var i=1; i<response.length; ++i) {
		var returnText="<div class=\"msg\">"+escapeXml(getAttributeValue(response[i],"msg"))+"</div>";

		fromx=getAttributeValue(response[i],"fromx");
		tox=getAttributeValue(response[i],"tox");
		leftContext=selectedTextProcessed.substring(0,fromx);
		if(leftContext.length>MAXCONTEXTLENGTH) {
			leftContext="&hellip;"+escapeXml(leftContext.substring(leftContext.length-MAXCONTEXTLENGTH));
		} else {
			leftContext=escapeXml(leftContext);
		}
		markedTextUnescaped=selectedTextProcessed.substring(fromx,tox);
		markedText=escapeXml(markedTextUnescaped);
		rightContext=selectedTextProcessed.substring(tox);
		if(rightContext.length>MAXCONTEXTLENGTH) {
			rightContext=escapeXml(rightContext.substring(0,MAXCONTEXTLENGTH))+"&hellip;";
		} else {
			rightContext=escapeXml(rightContext);
		}
		id=getAttributeValue(response[i],"ruleId");
		if(id.indexOf("MORFOLOGIK")!=-1 || id.indexOf("HUNSPELL")!=-1 || id.indexOf("SPELLER_RULE")!=-1) {
			markerClass="markerSpelling";
			returnText+=getSuggestions(response[i], true);
		} else {
			markerClass="markerGrammar";
			returnText+=getSuggestions(response[i], false);
		}

		returnText+="<div class=\"context\">"+leftContext+"<span class=\""+markerClass+"\">"+markedText+"</span>"+rightContext+"</div>";

		url=escapeXml(getAttributeValue(response[i],"url"));
		if(url!="") {
			returnText+="<div class=\"url\"><a targer=\"_blank\" href=\""+url+"\">"+_("moreInformation")+"</a></div>";
		}

		returnText+="<hr/>";

		if(ignoredPhrases.indexOf("\""+markedTextUnescaped+"\",") == -1) {
			if(returnText.indexOf("markerGrammar")!=-1) {
				returnTextGrammar+=returnText;
			} else {
				if(!persDict.check(markedText, "xx")) { // ignore spelling mistakes if the word is in personal dictionary
					returnTextSpelling+=returnText;
				}
			}
		}
	} // for each <error/>

	if(!simpleprefs.prefs.enableSpellCheck) {
		returnTextSpelling="";
	}

	if(returnTextGrammar+returnTextSpelling+permissionNote=="") {
		// #18 say that no problems have been found even if we found problems, but these are ignored
		sidebar.hide();
		panel.show();
		return noProblemsFoundText;
	}

	// permissionNote at the end since we don't know whether there is any active text field (TODO must be possible to determine it)
	var returnText=returnLanguage+returnTextGrammar+returnTextSpelling+permissionNote;

	console.log("returnText: "+returnText);
	return returnText;
}

function emitSetText(text) {
	// assure that we do not evaluating arbitrary text as (evil) html, we shouldn't (or may not) even trust our translations
	text=parser.sanitize(text, 0).replace(/.*<body>/, "").replace(/<\/body>.*/, "");

	panel.port.emit("setText", text);
	if(sidebarWorkers.length>0) {
		// TODO should be per window
		for(var i=0; i<sidebarWorkers.length; ++i) {
			sidebarWorkers[i].port.emit("setText", text);
			timer.clearTimeout(sidebarCacheTimer);
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
			sidebarCacheTimer=timer.setTimeout(worker.port.emit, 200, "setText", sidebarTextCache);
			sidebarTextCache="";
			console.log("sidebarTextCache cleared");
		}

		worker.port.on("linkClicked", function(url) {
			tabs.open(url);
		});

		worker.port.on("recheck", function() {
			recheck();
		});

		worker.port.on("addWordToDictionary", function(word) {
			addWordToDictionary(word);
		});

		worker.port.on("addToIgnoredPhrases", function(phrase) {
			addToIgnoredPhrases(phrase);
		});

		worker.port.on("applySuggestion", function(error, replacement, contextLeft, contextRight) {
			applySuggestion(error, replacement, contextLeft, contextRight);
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
		ltButton.state('window', {checked: false});
        if (ports.length !== 0) {
            for (var i = 0; i < ports.length; i++) {
                ports[i].emit("backFocus", "");
            }
        }
	},
	position: {
		right: 0,
		bottom: 0
	},
	width: 330,
	height: 250
});

emitSetText("");

panel.port.on("linkClicked", function(url) {
	tabs.open(url);
});

panel.port.on("enableWebService", function() {
	simpleprefs.prefs.enableWebService=true;
	widgetClicked();
});

panel.port.on("addWordToDictionary", function(word) {
	addWordToDictionary(word)
});

panel.port.on("addToIgnoredPhrases", function(phrase) {
	addToIgnoredPhrases(phrase)
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
			// make sure that we do not cut off percent-encoded character (#19)
			if(contentString.lastIndexOf("%")==MAXLENGTHWEBSERVICE-1) {
				contentString=contentString.substring(0,MAXLENGTHWEBSERVICE-1);
			} else if(contentString.lastIndexOf("%")==MAXLENGTHWEBSERVICE-2) {
				contentString=contentString.substring(0,MAXLENGTHWEBSERVICE-2);
			}
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

function addWordToDictionary(word) {
	persDict.addWord(word, "xx");
	timer.setTimeout(recheck, RECHECKDELAY);
}

function addToIgnoredPhrases(phrase) {
	// contains a list of phrases which are ignored (must match markedText)
	// format: "phrase 1","phrase 2","phrase 3",
	// Note that escaping is not (really) necessery, things like """, work.
	var ignoredPhrases = simpleprefs.prefs.ignoredPhrases;
	simpleprefs.prefs.ignoredPhrases = (ignoredPhrases ? ignoredPhrases : "") + '"'+phrase+'",';
	timer.setTimeout(recheck, RECHECKDELAY);
}

function applySuggestion(error, replacement, contextLeft, contextRight) {
	replaceWorker = tabs.activeTab.attach({
		contentScriptFile: self.data.url("replaceText.js"),
	});
	replaceWorker.port.emit("applySuggestion", error, replacement, contextLeft, contextRight, _("applySuggestionNoTextField"));
	timer.setTimeout(recheck, RECHECKDELAY);
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

	var motherTongue="";
	if(simpleprefs.prefs.mothertongue!="") {
		motherTongue="&motherTongue="+simpleprefs.prefs.mothertongue;
	}

	contentString="useragent=languagetoolfx&language="+simpleprefs.prefs.language+motherTongue+autodetect+"&text="+encodeURIComponent(selectedTextProcessed);
	originalContentStringLength=contentString.length;

	var checkTextLocal=requests.Request({
		url: simpleprefs.prefs.localServerUrl,
		onComplete: function (response) {
			timer.setTimeout(checkTextLocalCompleted, 0, response); // workaround for NS_ERROR_XPC_BAD_CONVERT_JS
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

var ltButton=ToggleButton({
	id: "lt-check",
	label: _("ltButtonLabel"),
	// tooltip: _("checkSelectionWithLT"),
	icon: {
		"16": "./iconSmall.ico",
		"32": "./icon32.png"
	},
	// NOTE as per https://blog.mozilla.org/addons/2014/03/13/new-add-on-sdk-australis-ui-features-in-firefox-29/comment-page-1/#comment-178621,
	// it is not possible to distinguish between left/right click
	onClick: function(state) {
		showResultsInPanel=(simpleprefs.prefs.leftClickAction=="popup");
		panel.show({position: ltButton});
		widgetOnClick();
	}
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

pageMod.PageMod({
    include: ['*'],
    contentScriptFile: [self.data.url('backFocus.js')],
    onAttach: function (worker) {
        ports.push(worker.port);
        worker.on('detach', function () {
            var index = ports.indexOf(worker.port);
            if (index !== -1) {
                ports.splice(index, 1);
            }
        });
    }
});