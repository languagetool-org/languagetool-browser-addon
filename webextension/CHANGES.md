# LanguageTool WebExtension Change Log

### 1.0.48 (2018-12-08)
  * internal changes to tracking so old and new extension don't get mixed up

### 1.0.47 (2018-10-09)
  * renamed to "LanguageTool (old version)" - the new version will be a complete
    rewrite, this version will probably not get any updates anymore

### 1.0.46 (2018-08-17)
  * fixed headline detection on wordpress.com that caused false alarms

### 1.0.45 (2018-08-13)
  * improved another error message

### 1.0.44 (2018-08-12)
  * improved some error messages

### 1.0.43 (2018-08-10)
  * small internal changes

### 1.0.42 (2018-08-08)
  * small internal changes

### 1.0.41 (2018-08-06)
  * small internal changes

### 1.0.40 (2018-07-31)
  * Improve handling of non-editable lists (i.e. code in web pages that contains `<li>...</li>`)
  * On first start, user can select to auto-check by default

### 1.0.39 (2018-06-23)
  * Don't accept empty username or password when using languagetoolplus.com

### 1.0.38 (2018-05-25)
  * Another fix to make applying suggestions work for WordPress 
    (now tested on own WordPress installation and with language other than English) (issue #213)

### 1.0.37 (2018-05-15)
  * Make applying suggestions work for WordPress (tested on wordpress.com) (issue #213)

### 1.0.36 (2018-05-11)
  * added initial support for Serbian
  * bug fixes for applying a suggested correction
  * improved handling of lists in WYSIWYG editors (e.g. summernote.org)
  * small usability improvements

### 1.0.35 (2018-01-14)
  * show link to premium version for regular users

### 1.0.34 (2017-12-12)
  * fixed a case where the add-on could slow down the browser
  * translation updates
  * Portuguese and Spanish can now be selected as mother tongue

### 1.0.33 (2017-12-01)
  * commented out 2 listeners to see if this improves the slowdown
    some users are experiencing

### 1.0.32 (2017-11-28)
  * internal cleanups
  * updated translations

### 1.0.31 (2017-11-19)
  * auto-check 1.5 seconds after user stops typing (instead of 1 second) 

### 1.0.30 (2017-11-18)
  * make the context menu item work in Firefox
  * small bug fixes
  
### 1.0.29 (2017-10-31)
  * bug fix: using a local server was not possible anymore
  * check mark icon that indicates "no errors" is now green
  
### 1.0.28 (2017-10-30)
  * bug fixes

### 1.0.27 (2017-10-26)
  * new option to auto-check on every domain
  * bug fixes

### 1.0.26 (2017-10-22)
  * Text can now be checked automatically. This needs to be activated once
    per domain by hovering over the reminder icon in the lower right corner
    of the text area and selecting the auto-check icon.
  * Added support for using languagetoolplus.com - activate
    this in the options if you have a premium account there
    and want the add-on to use it.
  * Added Dutch translation

### 1.0.25 (2017-10-02)
  * Fixed a bug that made the orientation setting (landscape/portrait) disappear
    from Chrome's printing dialog

### 1.0.24 (2017-09-29)
  * Internal preparation for upcoming features
  * Tracking fixes
  
### 1.0.23 (2017-09-28)
  * commented out error logging to avoid excessive logging of 'unknown error event'
    to Piwik
  
### 1.0.22 (2017-09-28)
  * An icon is now shown in the lower right corner of the text box the user is typing in,
    to remind them the add-on exists. Text is not checked automatically but only when
    clicking on the icon. There are a few sites where the icon is not shown, e.g. Facebook.
    (https://github.com/languagetool-org/languagetool-browser-addon/issues/46)
  * Some typography-related rules are now turned off by default because they are not useful
    in a web context for most users (only affects new installations or those that haven't
    saved any rule turn on/off yet)
    (https://github.com/languagetool-org/languagetool/issues/798)
  * Added French translation

### 1.0.21 (2017-09-11)
  * Show "no text found" message if no text could be found, as it also
    happens in Collabora Office
    (https://github.com/languagetool-org/languagetool-browser-addon/issues/115)

### 1.0.20 (2017-08-28)
  * improvements to keyboard-only usage
  * tracking manual language switching so we can see for which language pairs the
    automatic detection doesn't work well

### 1.0.19 (2017-08-23)
  * Chrome only: the add-on can now be used with the keyboard only. Use
    cursor up/down to navigate to an error, use cursor right/left to
    select a suggestion and `Return` to apply a suggestion.
    (https://github.com/languagetool-org/languagetool-browser-addon/issues/109)
  * Tracking fixes
  
### 1.0.18 (2017-08-19)
  * Tracking: we now also track opening the options dialog to understand
    how many users change their settings
  
### 1.0.15, 1.0.16, 1.0.17 (2017-07-30)
  * Track unique users and actions like 'apply suggestion' - your IP address still
    isn't logged and we cannot identify you.
    Anyway, you can opt-out at https://languagetool.org/privacy/
  
### 1.0.14 (2017-07-19)
  * add some tracking via Piwik - your IP address still isn't logged and you can
    opt-out at https://languagetool.org/privacy/
  
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
  
