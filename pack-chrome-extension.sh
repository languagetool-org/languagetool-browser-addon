#!/bin/sh
# pack everything as a Chrome extension
TARGET=$PWD/dist/languagetool-webextension-chrome.zip
cd webextension
rm -i $TARGET
zip -x webextension/tests.js -x webextension/test/ -x webextension/test/\* -x webextension/languagetool-for-chrome-tests.html -r $TARGET .
echo "Saved to $TARGET"
cd -
