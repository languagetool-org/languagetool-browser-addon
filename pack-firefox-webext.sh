#!/bin/sh
# pack everything as a Firefox extension

TARGET=$PWD/dist/languagetool-webextension-firefox.xpi
cd webextension
rm -i $TARGET
zip -x webextension/tests.js -x webextension/test/ -x webextension/test/\* -x webextension/languagetool-for-chrome-tests.html -r $TARGET .
echo "Saved to $TARGET"
cd -
