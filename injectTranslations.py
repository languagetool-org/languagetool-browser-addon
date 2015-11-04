#!/usr/bin/python3
# Daniel Naber, 2015-11-04
# Created a JSON file based on the existing English file,
# but using the translations from another language (needed
# as Transifex removes the 'placeholders' keys)

import json
import re
import sys

if len(sys.argv) != 3:
    sys.stderr.write("Usage: " + sys.argv[0] + " <englishFile> <translatedFile>\n")
    sys.exit()
    
englishFile = open(sys.argv[1]).read()
translatedFile = open(sys.argv[2])
json = json.loads(translatedFile.read())
newFile = englishFile

for k in json:
    translation = json[k]['message'].replace("\n", "\\\\n")
    backup = newFile
    newFile = re.sub('("' + k + '": {\\s*"message":\\s*".*?")', '"' + k + '": {\n    "message": "' + translation + '"', newFile, flags=re.MULTILINE|re.DOTALL)
    if backup == newFile:
        sys.stderr.write("WARN: Could not replace " + k + "\n")
    
print(newFile)
