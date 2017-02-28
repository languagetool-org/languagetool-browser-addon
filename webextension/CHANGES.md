# LanguageTool WebExtension Change Log

### 1.0.13 (2017-02-28)
  * make saving options work with Firefox 52 and later
  * show a proper error message when used on addons.mozilla.org (it's blocked there)
  * conform to Mozilla's code guidelines and make sure that everything
    shown via innerHTML is sanitized for security reasons (using
    https://github.com/cure53/DOMPurify)
 
### 1.0.11 (2017-02-01)
  * ask users for a review in the popup if they have used
    the extension at least 30 times (Chrome only) 

### 1.0.10 (2017-01-28)
  * make it work with Firefox 52 and later
    (https://github.com/languagetool-org/languagetool-browser-addon/issues/97)

### 1.0.9 (2016-12-03)
  * bugfix for Firefox 50: hovering over the rule/spelling icons
    made the content of the popup suddenly scroll up

### 1.0.7 (2016-11-17)
  * bugfix for visual improvements introduced in previous version

### 1.0.6 (2016-11-14)
  * small visual improvement for popup: show red/yellow/blue for error
    type (red: spelling, yellow: grammar/semantics, blue: style), thanks
    to Yana Agun Siswanto

### 1.0.5 (2016-09-24)
  * small visual improvement for Firefox 49: popup background is white again

### 1.0.4 (2016-08-28)
  * now also works for files loaded from the local disk ("file:///" URLs)
  * further improvements for error logging
  * fix some cases of replacements not working, e.g. in the message view
    on upwork.com (#71)
  * applying corrections on facebook.com has been disabled, as it makes
    further edits of the text impossible (#70)

### 1.0.3 (2016-08-22)
  * more data (usage counter and add-on version) get transferred when users
    uninstall the add-on

### 1.0.2 (2016-08-21)
  * some internal errors that cause a text check to fail are now sent to the
    server for better analysis

### 1.0.1 (2016-08-16)
  * fix: selection was ignored in iframes, i.e. the whole text was checked
    instead (issue #59)

### 1.0.0 (2016-07-11 for Firefox only)
  * show a hint about the keyboard shortcut (Chrome only)
  
### 0.9.9 (2016-06-28)
  * improved design of popup dialog

### 0.9.8 (2016-06-15)
  * fix to work with `<input type="search">`, e.g. on bing.com
  
### 0.9.7 (2016-06-11 for Firefox only)
  * disabled rules now show a number indicating how many more matches there
    will be when the rule gets activated again
  * fix: applying suggestions on e.g. wordpress.com removed line breaks
  * cleanups for Firefox (requires Firefox 48 or later)

### 0.9.5 (2016-06-06)
  * fix handling of hard return (shift+return) in at least Gmail
  * small layout fixes in the popup

### 0.9.4 (2016-06-05)
  * small wording and layout fixes
  * rules can now easily be deactivated and activated again
  * Catalan and Catalan (València) can be selected as variants
  
### 0.9.2 (2016-05-14)
  * new feature to ignore quoted lines (on by default)
  * new feature to allow adding words to the user's dictionary
  * mother tongue can now be set to activate false friend checks
  * automatically detected language can now be changed manually
  * default language variants can be set in the options dialog
  * duplicate errors are filtered so only one error is shown
  
