#!/bin/sh
# pack everything as a Firefox extension

cd /lt/git/languagetool-browser-addon/webextension
TARGET=~/languagetool-webextension-firefox.xpi
rm -i $TARGET
zip -x tests.js -x test/\* languagetool-for-chrome-tests.html -r $TARGET .
echo "Saved to $TARGET"
cd -
