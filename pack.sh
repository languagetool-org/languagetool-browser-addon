#!/bin/sh
# pack everything as an extension
 
cd /lt/git/languagetool-browser-addon/webextension
TARGET=~/languagetool-webextension.zip
rm -i $TARGET
zip -x tests.js -x test/ -x test/test.js -x languagetool-for-chrome-tests.html -r $TARGET .
echo "Saved to $TARGET"
cd -
