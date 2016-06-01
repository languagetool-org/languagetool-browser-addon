#!/usr/bin/python3
# -*- coding: utf-8 -*-
# Daniel Naber, 2015-11-04
# Created a JSON file based on the existing English file,
# but using the translations from another language (needed
# as Transifex removes the 'placeholders' keys). Also,
# inject translation for language names.

import json
import re
import sys
import collections

def loadLanguageDict(filename):
    codeToLang = collections.OrderedDict()
    file = open(filename)
    for line in file:
        regex = re.compile("([a-z][a-z]|[a-z][a-z]-[A-Z][A-Z]|[a-z][a-z][a-z]|[a-z][a-z]-[A-Z][A-Z]-.*?)\\s*=\\s*(.*)")  # e.g. "de", "de-DE", "ast", "ca-ES-valencia"
        match = regex.match(line)
        if match:
            codeToLang[match.group(1)] = match.group(2)
    return codeToLang

if len(sys.argv) != 4:
    sys.stderr.write("Usage: " + sys.argv[0] + " <translationLangCode> <englishFile> <translatedFile>\n")
    sys.exit()

translationLangCode = sys.argv[1]
translationLangCodeShort = re.sub('_.*', '', translationLangCode)
if translationLangCodeShort == "el":
    coreDictFile = "../languagetool/languagetool-language-modules/" + translationLangCodeShort + "/src/main/resources/org/languagetool/MessagesBundle_el_GR.properties"
else:
    coreDictFile = "../languagetool/languagetool-language-modules/" + translationLangCodeShort + "/src/main/resources/org/languagetool/MessagesBundle_" + translationLangCode + ".properties"
codeToLang = loadLanguageDict(coreDictFile)
englishFile = open(sys.argv[2]).read()
translatedFile = open(sys.argv[3])
translatedJson = json.loads(translatedFile.read(), object_pairs_hook=collections.OrderedDict)
newFile = englishFile

for k in translatedJson:
    translation = translatedJson[k]['message'].replace("\n", "\\\\n").replace("\"", "\\\"")
    backup = newFile
    quoteRegex = '"[^"\\\]*(?:\\\.[^"\\\]*)*"'    # see http://stackoverflow.com/questions/430759/
    searchStr = '("' + k + '": {\\s*"message":\\s*' + quoteRegex + ')'
    newFile = re.sub(searchStr, '"' + k + '": {\n    "message": "' + translation + '"', newFile, flags=re.MULTILINE|re.DOTALL)
    if backup == newFile:
        sys.stderr.write("WARN: Could not add translation '" + translation + "' for key '" + k + "', searched for: '" + searchStr + "'\n")

newJson = json.loads(newFile, object_pairs_hook=collections.OrderedDict)
for key in codeToLang:
    newKey = key.replace("-", "_")
    if newKey in newJson:
        raise Exception("Cannot add key '" + newKey + "' to file, already exists")
    translatedLang = bytes(codeToLang[key], "utf-8").decode("unicode_escape")   # e.g. Franz\\u00f6sisch -> Französisch
    newJson[newKey] = {'message': translatedLang, 'description': 'automatically added by injectTranslation.py'}

print(json.dumps(newJson, indent=2, ensure_ascii=False, sort_keys=True))
