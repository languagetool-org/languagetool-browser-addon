var preferencesservice=require("preferences-service");
var Request=require("request").Request;
var selection=require("selection");
var self=require("self");
var simpleprefs=require("simple-prefs");
var tabs=require("tabs");
// tabs.open("http://www.languagetool.org/forum/");
var widgets=require("widget");
var _=require("l10n").get;

var EMPTYTEXTWARNING="<div class=\"status\">"+_("emptyText")+"</div>";
var PLEASEWAITWHILECHECKING="<div class=\"status\">"+_("pleaseWaitWhileChecking")+"</div>";
var MAXCONTEXTLENGTH=20;
var MAXLENGTHWEBSERVICE=50000;

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
	return text.replace(/\<script[\s\S]*?\>[\s\S]*?\<\/script\>/gm," <BR> ") // remove everything between <script>-Tags
	           .replace(/\<\/?([\s\S]*?)\>/gm,"") // remove html tags
	           .replace(/(\r\n|\n|\r)/gm," <BR> ") // remove newlines
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
		if(id.indexOf("MORFOLOGIK")!=-1 || id.indexOf("HUNSPELL")!=-1) {
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
			returnTextSpelling+=returnText;
		}
	} // for each <error/>
	
	console.log("returnText: "+returnLanguage+returnTextGrammar+returnTextSpelling);
	return returnLanguage+returnTextGrammar+returnTextSpelling;
}

var panel=require("panel").Panel({
	contentURL: self.data.url("panel.html"),
	contentScriptFile: self.data.url("panel.js"),
	onHide: function () {
		panel.port.emit("setText", PLEASEWAITWHILECHECKING);
	}
});

panel.port.emit("setText", PLEASEWAITWHILECHECKING);

panel.port.on("linkClicked", function(url) {
	tabs.open(url);
});

function widgetClicked() {
	// avoid that selectedText is changed while the text is being checked
	selectedTextProcessed=selectedText;
	
	if(selectedTextProcessed!=null) {
		console.log("Selection: "+selectedTextProcessed);
		selectedTextProcessed=preprocess(selectedTextProcessed);
	}
	
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
	
	var contentString="language="+simpleprefs.prefs.language+mothertongue+autodetect+"&text="+encodeURIComponent(selectedTextProcessed);
	var originalContentStringLength=contentString.length;
	
	var checkTextOnline=Request({
		url: "https://languagetool.org:8081/",
		onComplete: function (response) {
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
				panel.show();
				panel.port.emit("setText", webServiceNote+createReport(text, selectedTextProcessed));
			}
		},
		content: contentString
	});
	
	var checkTextLocal=Request({
		url: simpleprefs.prefs.localServerUrl,
		onComplete: function (response) {
			if(response.status!=200) {
				console.log("Response status: "+response.status);
				var errorText=_("errorOccurredStatus")+" "+response.status;
				if(simpleprefs.prefs.enableWebService) {
					console.log("Connecting with web service");
					errorText+="<br>"+_("usingWebService");
					panel.port.emit("setText", "<div class=\"status\">"+errorText+"</div>");
					contentString=contentString.substring(0,MAXLENGTHWEBSERVICE);
					checkTextOnline.post();
				} else {
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
				panel.show();
				panel.port.emit("setText", createReport(text, selectedTextProcessed));
			}
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

var widget=widgets.Widget({
	id: "lt-check",
	label: _("checkSelectionWithLT"),
	contentURL: self.data.url("iconSmall.ico"),
	panel: panel,
	onClick: function() {
		tabs.activeTab.attach({
			contentScriptFile: self.data.url("content.js"),
			onMessage: function (message) {
				if(message!="-NULL-") selectedText=message;
				widgetClicked();
			}
		});
	}
});
