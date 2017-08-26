#!/bin/bash
# script to fetch translated JSON files for Chrome/WebExtension from Transifex

# a bash file that sets variables U (user) and P (password):
source ~/.transifex_login

if [[ -z "$U" || -z "$P" ]]; then
	echo "Set \$U and \$P with username and password for transifex"
	exit
fi

for lang in `ls webextension/_locales | sed "s/en//g"`; do
	echo "Getting $lang..."
	LTLANG=$lang
	if [ $lang = "el" ]; then
		LTLANG="el_GR"
	fi
	curl --user $U:$P https://www.transifex.com/api/2/project/languagetool/resource/chrome-extension/translation/$LTLANG/?file > webextension/_locales/$lang/messages.json && \
  	  ./injectTranslations.py $lang webextension/_locales/en/messages.json webextension/_locales/$lang/messages.json > webextension/_locales/$lang/messages.json.tmp && \
	  mv webextension/_locales/$lang/messages.json.tmp webextension/_locales/$lang/messages.json
done
