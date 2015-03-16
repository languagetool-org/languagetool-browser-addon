#!/bin/bash

source .lgn

if [[ -z "$U" || -z "$P" ]]; then
	echo "Set \$U and \$P with username and password for transifex"
	exit
fi

rm -rI firefox/locale~
mv firefox/locale firefox/locale~
mkdir firefox/locale
cp firefox/locale~/en-US.properties firefox/locale/en-US.properties

for lang in `ls firefox/locale~ | sed "s/\.properties\|\-DE\|en\-US//g"`; do
	curl --user $U:$P http://www.transifex.net/api/2/project/languagetool/resource/firefox-extension/translation/$lang/?file > firefox/locale/$lang.properties
done

mv firefox/locale/de.properties firefox/locale/de-DE.properties

wc -l firefox/locale/*
grep "# " firefox/locale/*
