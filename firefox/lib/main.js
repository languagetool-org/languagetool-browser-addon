var preferencesservice=require("preferences-service");
var Request=require("request").Request;
var selection=require("selection");
var self=require("self");
var simpleprefs=require("simple-prefs");
var tabs=require("tabs");
// tabs.open("http://www.languagetool.org/forum/");
var widgets=require("widget");
var _=require("l10n").get;

var PLEASEWAITWHILECHECKING="<div class=\"status\">"+_("pleaseWaitWhileChecking")+"</div>";
var MAXCONTEXTLENGTH=20;

var selectedText="";

function selectionChanged(event) {
	selectedText=selection.text;
}

selection.on("select", selectionChanged);

/**
 * escape %, ?, and & in url
 * normal escape does not work properly with umlauts
 */
function escapeUrl(string) {
	return string.replace(/\%/g,"%25").replace(/\?/g,"%3F").replace(/\&/g,"%26");
}

/**
 * escape <, >, and " in xml
 */
function escapeXml(string) {
	return string.replace(/\</g,"&lt;").replace(/\>/g,"&gt;").replace(/\"/g,"&quot;");
}

/**
 * removes contents of <script>, html tags, newlines, and trims the resulting string
 */
function preprocess(text) {
	return text.replace(/\<script\>[\s\S]*?\<\/script\>/gm," <BR> ") // remove everything between <script>-Tags
	           .replace(/\<\/?([\s\S]*?)\>/gm,"") // remove html tags
	           .replace(/(\r\n|\n|\r)/gm,"") // remove newlines
	           .replace(/(\s+\<BR\>\s+(\<BR\>\s+)*)/g," ") // remove extra spaces added after newline
	           .replace(/^\s+|\s+$/g,""); // trim
}

function formatError(error) {
	var prepend="";
	if(error.indexOf("not a language code known")!=-1) {
		prepend=_("checkLanguageCode")+"<br/>";
	}
	return prepend
	       + error.replace(/(\r\n|\n|\r)/," <a id=\"unhidelink\" href=\"javascript:unhide();\">…</a><br/>")
	              .replace(/\<br\/\>/,"<div class=\"hidden\">")
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

function createReport(response, selectedText) {
	var returnLanguage="";
	var returnTextGrammar="";
	var returnTextSpelling="";
	
	lang=getLanguage(response, "name");
	mothertongue=getLanguage(response, "mothertonguename");
	
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
		l=selectedText.substring(0,fromx);
		if(l.length>MAXCONTEXTLENGTH) {
			l="&hellip;"+escapeXml(l.substring(l.length-MAXCONTEXTLENGTH));
		}
		m=escapeXml(selectedText.substring(fromx,tox));
		r=selectedText.substring(tox);
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
		
		url=getAttributeValue(response[i],"url");
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
	if(selectedText!=null)
		selectedText=preprocess(selectedText);
	
	console.log("Selection (preprocessed): "+selectedText);
	console.log("Selection (escaped): "+escapeUrl(selectedText));
	
	var autodetect="";
	if(simpleprefs.prefs.autodetect) {
		autodetect="&autodetect=1";
	}
	
	var mothertongue="";
	if(simpleprefs.prefs.mothertongue!="") {
		mothertongue="&motherTongue="+simpleprefs.prefs.mothertongue;
	}
	
	var contentString="language="+simpleprefs.prefs.language+mothertongue+autodetect+"&text="+escapeUrl(selectedText);
	
	var checkTextOnline=Request({
		url: "http://api.languagetool.org:8081/",
		onComplete: function (response) {
			if(response.status!=200) {
				console.log("Response status: "+response.status);
				var errorText=_("errorOccurredStatus")+" "+response.status
				if(response.status==500) {
					errorText+="<br/>"+formatError(response.text);
				}
				panel.port.emit("setText", "<div class=\"status\">"+errorText+"</div>");
			} else {
				text=response.text;
				console.log("Response: "+text);
				panel.show();
				panel.port.emit("setText", createReport(text, selectedText));
			}
		},
		content: contentString
	});
	
	var checkTextLocal=Request({
		url: "http://localhost:8081",
		onComplete: function (response) {
			if(response.status!=200) {
				console.log("Response status: "+response.status);
				var errorText=_("errorOccurredStatus")+" "+response.status
				if(simpleprefs.prefs.enableWebService) {
					console.log("Connecting with web service");
					errorText+="<br>"+_("usingWebService");
					panel.port.emit("setText", "<div class=\"status\">"+errorText+"</div>");
					checkTextOnline.post();
				} else {
					if(response.status==0) {
						errorText+="<br/>"+_("checkLtRunning");
					} else if(response.status==500) {
						errorText+="<br/>"+formatError(response.text);
					}
					panel.port.emit("setText", "<div class=\"status\">"+errorText+"</div>");
				}
			} else {
				text=response.text;
				console.log("Response: "+text);
				panel.show();
				panel.port.emit("setText", createReport(text, selectedText));
			}
		},
		content: contentString
	});
	
	if(selectedText!=null && selectedText!="") {
		console.log(contentString);
		checkTextLocal.post();
	} else {
		panel.port.emit("setText", "<div class=\"status\">"+_("emptyText")+"</div>");
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
