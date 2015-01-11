LanguageToolFx
==============

LanguageTool for Firefox

Usage
-----

Select the text that you want to check with LanguageTool and click the LT icon in the add-on bar.

The extensions tries to connect to a locally running LanguageTool server. If the connection fails, the extensions uses the webservice at http://api.languagetool.org:8081/ if it is enabled in the settings of the extension.

The default language is en-US. You might want to change this in the settings of the extension.

Build installable XPI file
--------------------------

1. npm install jpm
2. jpm xpi
