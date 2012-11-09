#!/bin/bash

echo "<!DOCTYPE HTML>" > index.html
echo "<html>" >> index.html
echo "<head>" >> index.html
echo "<title>Tests</title>" >> index.html
echo "</head>" >> index.html
echo "<body>" >> index.html
echo "<table>" >> index.html

for filename in `ls -r`
do
	if [[ "$filename" == *.bash ]]; then
		continue
	fi
	if [ "$filename" == "index.html" ]; then
		continue
	fi
	echo "<tr><td><a href=\"$filename\">$filename</a></td></tr>" >> index.html
done

echo "</table>" >> index.html
echo "</body>" >> index.html
echo "</html>" >> index.html
