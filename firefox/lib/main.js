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

function createReport(response, selectedTextProcessed) {
	var returnLanguage="";
	var returnTextGrammar="";
	var returnTextSpelling="";
	
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
		return returnLanguage+"<div class=\"status\">"+_("noProblemsFound")+"</div>";
	}
	
	for(var i=1; i<response.length; ++i) {
		var returnText="<div class=\"msg\">"+escapeXml(getAttributeValue(response[i],"msg"))+"</div>";
		
		fromx=getAttributeValue(response[i],"fromx");
		tox=getAttributeValue(response[i],"tox");
		l=selectedTextProcessed.substring(0,fromx);
		if(l.length>MAXCONTEXTLENGTH) {
			l="&hellip;"+escapeXml(l.substring(l.length-MAXCONTEXTLENGTH));
		}
		m=escapeXml(selectedTextProcessed.substring(fromx,tox));
		r=selectedTextProcessed.substring(tox);
		if(r.length>MAXCONTEXTLENGTH) {
			r=escapeXml(r.substring(0,MAXCONTEXTLENGTH))+"&hellip;";
		}
		id=getAttributeValue(response[i],"ruleId");
		if(id.indexOf("MORFOLOGIK")!=-1 || id.indexOf("HUNSPELL")!=-1 || id.indexOf("SPELLER_RULE")!=-1) {
			spanclass="markerSpelling";
		} else {
			spanclass="markerGrammar";
		}
		returnText+="<div class=\"context\">"+l+"<span class=\""+spanclass+"\">"+m+"</span>"+r+"</div>";
		
		url=escapeXml(getAttributeValue(response[i],"url"));
		if(url!="") {
			returnText+="<div class=\"url\"><a targer=\"_blank\" href=\""+url+"\">"+_("moreInformation")+"</a></div>";
		}
		
		returnText+="<hr/>";
		
		if(returnText.indexOf("markerGrammar")!=-1) {
			returnTextGrammar+=returnText;
		} else {
			if(PERSDICT.indexOf(m)==-1) { // ignore spelling mistakes if the word is in personal dictionary
				returnTextSpelling+=returnText;
			}
		}
	} // for each <error/>
	
	if(!simpleprefs.prefs.enableSpellCheck) {
		returnTextSpelling="";
	}
	
	console.log("returnText: "+returnLanguage+returnTextGrammar+returnTextSpelling);
	return returnLanguage+returnTextGrammar+returnTextSpelling;
}

var panel=panels.Panel({
	contentURL: self.data.url("panel.html"),
	contentScriptFile: self.data.url("panel.js"),
	onHide: function () {
		panel.port.emit("setText", PLEASEWAITWHILECHECKING);
	},
	position: {
		right: 0,
		bottom: 0
	},
	width: 330,
	heigth: 250
});

panel.port.emit("setText", PLEASEWAITWHILECHECKING);

panel.port.on("linkClicked", function(url) {
	tabs.open(url);
});

panel.port.on("enableWebService", function() {
	simpleprefs.prefs.enableWebService=true;
	widgetClicked();
});

panel.port.on("closePopup", function() {
	panel.hide();
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
		panel.port.emit("setText", "<div class=\"status\">"+errorText+"</div>");
	} else {
		var text=response.text;
		console.log("Response: "+text);
		panel.port.emit("setText", webServiceNote+createReport(text, selectedTextProcessed));
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
			panel.port.emit("setText", "<div class=\"status\">"+errorText+"</div>");
			checkTextOnline.post();
		} else {
			var errorText=_("errorOccurredStatus")+" "+response.status;
			if(response.status==0) {
				errorText+="<br/>"+_("checkLtRunning", simpleprefs.prefs.localServerUrl);
			} else if(response.status==500) {
				errorText+="<br/>"+formatError(response.text);
			}
			panel.port.emit("setText", "<div class=\"status\">"+errorText+"</div>");
		}
	} else {
		var text=response.text;
		console.log("Response: "+text);
		panel.port.emit("setText", createReport(text, selectedTextProcessed));
	}
}

function widgetClicked() {
	// avoid that selectedText is changed while the text is being checked
	selectedTextProcessed=selectedText;
	
	if(selectedTextProcessed!=null) {
		console.log("Selection: "+selectedTextProcessed);
		selectedTextProcessed=preprocess(selectedTextProcessed);
	}
	
	panel.show();
	
	if(selectedTextProcessed==null || selectedTextProcessed=="") {
		panel.port.emit("setText", EMPTYTEXTWARNING);
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
		panel.port.emit("setText", EMPTYTEXTWARNING);
	}
}

function widgetOnClick() {
	tabs.activeTab.attach({
		contentScriptFile: self.data.url("content.js"),
		onMessage: function (message) {
			if(message!="-NULL-") selectedText=message;
			widgetClicked();
		}
	});
}

var widget=widgets.Widget({
	id: "lt-check",
	label: _("checkSelectionWithLT"),
	contentURL: self.data.url("iconSmall.ico"),
	panel: panel,
	onClick: widgetOnClick
});

var contextmenuitemSelection=cm.Item({
	label: _("checkSelectionWithLTShort"),
	context: cm.SelectionContext(),
	// SDK bug 851647
	contentScript: 'self.on("click", function(){self.postMessage()});',
	onMessage: widgetClicked,
	image: self.data.url("iconSmall.ico")
});

var contextmenuitemTextarea=cm.Item({
	label: _("checkTextareaWithLTShort"),
	context: cm.SelectorContext("textarea, [contenteditable='true']"),
	// SDK bug 851647
	contentScript: 'self.on("click", function(){self.postMessage()});',
	onMessage: widgetOnClick,
	image: self.data.url("iconSmall.ico")
});

var checkSelectionHotkey=hotkeys.Hotkey({
// 	combo: "accel-shift-l",
	combo: simpleprefs.prefs.hotkeySelection,
	onPress: function(){widgetClicked();}
});

var checkTextareaHotkey=hotkeys.Hotkey({
// 	combo: "accel-shift-return",
	combo: simpleprefs.prefs.hotkeyTextarea,
	onPress: function(){widgetOnClick();}
});
