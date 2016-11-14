#!/bin/sh
# pack everything as a Firefox extension

TARGET=$PWD/dist/languagetool-webextension-firefox.xpi

cd webextension
rm -i $TARGET
zip -x node_modules/\* -x tests.js -x test/ -x test/\* -x languagetool-for-chrome-tests.html -r $TARGET .
echo "Saved to $TARGET"
cd -
