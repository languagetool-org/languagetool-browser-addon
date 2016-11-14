#!/bin/sh
# pack everything as a Chrome extension

TARGET=$PWD/dist/languagetool-webextension-chrome.zip

cd webextension
rm -i $TARGET
zip -x node_modules/\* -x tests.js -x test/ -x test/\* -x languagetool-for-chrome-tests.html -r $TARGET .
echo "Saved to $TARGET"
cd -
