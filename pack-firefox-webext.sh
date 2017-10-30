#!/bin/sh
# pack everything as a Firefox extension

TARGET=$PWD/dist/languagetool-webextension-firefox.xpi

cd webextension
rm -i $TARGET
sed -i.bak 's#"offline_enabled": false,##' manifest.json
zip -x node_modules/\* -x tests.js -x test/ -x test/\* -x languagetool-for-chrome-tests.html -r $TARGET .
echo "Saved to $TARGET"
cp manifest.json.bak manifest.json
cd -
