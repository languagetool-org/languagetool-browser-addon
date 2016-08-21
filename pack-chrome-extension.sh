#!/bin/sh
# pack everything as a Chrome extension
 
cd /lt/git/languagetool-browser-addon/webextension
TARGET=~/languagetool-webextension-chrome.zip
rm -i $TARGET
zip -x tests.js -x test/ -x test/\* -x languagetool-for-chrome-tests.html -r $TARGET .
echo "Saved to $TARGET"
cd -
