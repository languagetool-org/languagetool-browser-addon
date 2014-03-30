function escape(str) {
	return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

self.port.on("applySuggestion", function(error, replacement, contextLeft, contextRight, sorryText) {
	var activeElement = document.activeElement;
	
	if(replacement=="␣") replacement=" ";
	
	if(activeElement.tagName=="IFRAME" || activeElement.tagName=="FRAME") {
		try {
			activeElement=document.activeElement.contentWindow.document.activeElement;
		} catch(e) {
			console.log("Error accessing iframe contents: " + e);
		}
	}
	
	if(activeElement.tagName=="TEXTAREA" || activeElement.tagName=="INPUT") {
		text=activeElement.value.toString();
		if(text.indexOf(contextLeft+error+contextRight)!=-1) {
			activeElement.value = text.replace(contextLeft+error+contextRight, contextLeft+replacement+contextRight);
		} else {
			// this can happen because we remove some text (esp. line breaks) before
			// sending the text to the server, thus the given context might not exist; 
			// adding \s{0,3} after every char should solve most problems.
			contextLeft=escape(contextLeft);
			var contextLeftMatch='';
			var contextLeftReplace='';
			var captureCount=0;
			for (i=0; i<contextLeft.length; i++) {
				// newline was replaced with space, do not add extra spaces
				if(contextLeft[i]!=' ') {
					contextLeftMatch += contextLeft[i];
					// un-escape for replace string
					if(contextLeft[i]!="\\") contextLeftReplace += contextLeft[i];
				}
				
				if(contextLeft[i]=="\\") continue;
				
				contextLeftMatch += '(\\s{0,3})';
				captureCount++;
				contextLeftReplace += '$'+captureCount;
			}
			
			contextRight=escape(contextRight);
			var contextRightMatch='';
			var contextRightReplace='';
			for (i=0; i<contextRight.length; i++) {
				if(contextRight[i]!=' ') {
					contextRightMatch += contextRight[i];
					if(contextRight[i]!="\\") contextRightReplace += contextRight[i];
				}
				
				if(contextRight[i]=="\\") continue;
				
				contextRightMatch += '(\\s{0,3})';
				captureCount++;
				contextRightReplace += '$'+captureCount;
			}
			
			activeElement.value = text.replace(RegExp(contextLeftMatch + error + contextRightMatch, 'gm'), contextLeftReplace + replacement + contextRightReplace);
		}
	} else {
		self.postMessage("-NOTEXTAREA-");
		alert(sorryText);
	}
});
