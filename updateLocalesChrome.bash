#!/bin/bash
# script to fetch translated JSON files for Chrome from Transifex

source .lgn

if [[ -z "$U" || -z "$P" ]]; then
	echo "Set \$U and \$P with username and password for transifex"
	exit
fi

for lang in `ls chrome/_locales | sed "s/en//g"`; do
	echo "Getting $lang..."
	curl --user $U:$P http://www.transifex.net/api/2/project/languagetool/resource/chrome-extension/translation/$lang/?file > chrome/_locales/$lang/messages.json && \
  	  ./injectTranslations.py $lang chrome/_locales/en/messages.json chrome/_locales/$lang/messages.json > chrome/_locales/$lang/messages.json.tmp && \
	  mv chrome/_locales/$lang/messages.json.tmp chrome/_locales/$lang/messages.json
done
