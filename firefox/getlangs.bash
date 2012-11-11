#!/bin/bash

EXCLUDE=("en-ANY" "de" "pt")

langs=`wget -qO- https://www.languagetool.org:8081/Languages | grep abbrWithVariant | sed -e "s/.*abbrWithVariant=\"//g" | sed -e "s/\".*//g" | sort`

for lang in $langs
do
	if [[ ${EXCLUDE[*]} =~ "$lang" ]]; then
		:
	else
		echo \{
		echo \"value\": \"$lang\",
		echo \"label\": \"$lang\"
		echo \},
	fi
done


