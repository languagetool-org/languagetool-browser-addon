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
function myEscape(string) {
	return string.replace(/\%/g,"%25").replace(/\?/g,"%3F").replace(/\&/g,"%26")
}

function getAttributeValue(string, attribute) {
	if(string.indexOf(attribute+"=\"")==-1)
		return "";
	return string.split(attribute+"=\"")[1].split("\"")[0];
}

function createReport(response, selectedText) {
	var returnTextGrammar="";
	var returnTextSpelling="";
	response=response.split("<error ");
	
	if(response.length<2) {
		return "<div class=\"status\">"+_("noProblemsFound")+"</div>";
	}
	
	for(var i=1; i<response.length; ++i) {
		var returnText="<div class=\"msg\">"+getAttributeValue(response[i],"msg")+"</div>";
		
		fromx=getAttributeValue(response[i],"fromx");
		tox=getAttributeValue(response[i],"tox");
		l=selectedText.substring(0,fromx);
		if(l.length>MAXCONTEXTLENGTH) {
			l="&hellip;"+l.substring(l.length-MAXCONTEXTLENGTH);
		}
		m=selectedText.substring(fromx,tox);
		r=selectedText.substring(tox);
		if(r.length>MAXCONTEXTLENGTH) {
			r=r.substring(0,MAXCONTEXTLENGTH)+"&hellip;";
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
	
	console.log("returnText: "+returnTextGrammar+returnTextSpelling);
	return returnTextGrammar+returnTextSpelling;
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
	selectedText=selectedText.replace(/(\r\n|\n|\r)/gm," <BR> ") // remove newlines
	                         .replace(/(\s+\<BR\>\s+(\<BR\>\s+)*)/g," ") // remove extra spaces added after newline
	                         .replace(/^\s+|\s+$/g,""); // trim
	
	console.log("Selection: "+selectedText);
	console.log("Selection (escaped): "+myEscape(selectedText));
	
	var checkTextOnline=Request({
		url: "http://api.languagetool.org:8081/",
		onComplete: function (response) {
			if(response.status!=200) {
				console.log("Response status: "+response.status);
				var errorText=_("errorOccuredStatus")+" "+response.status
				panel.port.emit("setText", "<div class=\"status\">"+errorText+"</div>");
			} else {
				text=response.text;
				console.log("Response: "+text);
				panel.show();
				panel.port.emit("setText", createReport(text, selectedText));
			}
		},
		content: "language="+simpleprefs.prefs.language+"&text="+myEscape(selectedText)
	});
	
	var checkTextLocal=Request({
		url: "http://localhost:8081",
		onComplete: function (response) {
			if(response.status!=200) {
				console.log("Response status: "+response.status);
				var errorText=_("errorOccuredStatus")+" "+response.status
				if(simpleprefs.prefs.enableWebService) {
					console.log("Connecting with web service");
					errorText+="<br>"+_("usingWebService");
					panel.port.emit("setText", "<div class=\"status\">"+errorText+"</div>");
					checkTextOnline.post();
				} else {
					if(response.status==0) {
						errorText+="<br/>"+_("checkLtRunning");
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
		content: "language="+simpleprefs.prefs.language+"&text="+myEscape(selectedText)
	});
	
	if(selectedText!=null && selectedText!="") {
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
