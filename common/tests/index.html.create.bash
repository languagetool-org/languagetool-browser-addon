#!/bin/bash

echo "<!DOCTYPE HTML>" > index.html
echo "<html>" >> index.html
echo "<head>" >> index.html
echo "<meta http-equiv=\"Content-Type\" content=\"text/html; charset=utf-8\">" >> index.html
echo "<title>Tests</title>" >> index.html
echo "<style type=\"text/css\">" >> index.html
echo ".pass{background:#E6FFE6;}.pass:after{content:\" ✓\"}" >> index.html
echo ".fail{background:#FFE6E6;}.fail:after{content:\" ✗\"}" >> index.html
echo "</style>" >> index.html
echo "</head>" >> index.html
echo "<body>" >> index.html

for filename in `echo *Test.*`
do
	if grep "$filename" FAILING_TESTS
	then
		echo "<span class=\"fail\"><a href=\"$filename\">$filename</a></span><br/>" >> index.html
	else
		echo "<span class=\"pass\"><a href=\"$filename\">$filename</a></span><br/>" >> index.html
	fi
	
done

echo "</body>" >> index.html
echo "</html>" >> index.html
