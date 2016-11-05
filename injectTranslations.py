#!/usr/bin/env python3
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

if len(sys.argv) != 4:
    sys.stderr.write("Usage: {} <translationLangCode> <englishFile> <translatedFile>\n".format(sys.argv[0]))
    sys.exit()

translationLangCode = sys.argv[1]
englishFile = open(sys.argv[2]).read()
translatedFile = open(sys.argv[3])


def loadLanguageDict(filename):
    codeToLang = collections.OrderedDict()
    with open(filename) as handle:
        lines = handle.readlines()
    for line in lines:
        regex = re.compile("([a-z][a-z]|[a-z][a-z]-[A-Z][A-Z]|[a-z][a-z][a-z]|[a-z][a-z]-[A-Z][A-Z]-.*?)\\s*=\\s*(.*)")  # e.g. "de", "de-DE", "ast", "ca-ES-valencia"
        match = regex.match(line)
        if match:
            codeToLang[match.group(1)] = match.group(2)
    return codeToLang

translationLangCodeShort = re.sub('_.*', '', translationLangCode)
if translationLangCodeShort == "el":
    translationLangCode = "el_GR"
coreDictFile = "../languagetool/languagetool-language-modules/{0}/src/main/resources/org/languagetool/MessagesBundle_{1}.properties".format(translationLangCodeShort, translationLangCode)
codeToLang = loadLanguageDict(coreDictFile)
newFile = englishFile
translatedJson = json.loads(translatedFile.read(),
                            object_pairs_hook=collections.OrderedDict)

for k in translatedJson:
    translation = translatedJson[k]['message'].replace("\n", "\\\\n").replace("\"", "\\\"")
    backup = newFile
    quoteRegex = '"[^"\\\]*(?:\\\.[^"\\\]*)*"'    # see http://stackoverflow.com/questions/430759/
    searchStr = '("{0}": {{\\s*"message":\\s*{1})'.format(k, quoteRegex)
    newFile = re.sub(searchStr,
                     '"{0}": {{\n    "message": "{1}"'.format(k, translation),
                     newFile,
                     flags=re.MULTILINE | re.DOTALL)
    if backup == newFile:
        sys.stderr.write("WARN: Could not add translation '{0}' for key '{1}', searched for: '{2}'\n".format(translation, k, searchStr))

newJson = json.loads(newFile, object_pairs_hook=collections.OrderedDict)
for key in codeToLang:
    newKey = key.replace("-", "_")
    if newKey in newJson:
        raise Exception("Cannot add key '{}' to file, already exists".format(newKey))
    translatedLang = bytes(codeToLang[key], "utf-8").decode("unicode_escape")   # e.g. Franz\\u00f6sisch -> Französisch
    newJson[newKey] = {'message': translatedLang,
                       'description': 'automatically added by injectTranslation.py'}

print(json.dumps(newJson, indent=2, ensure_ascii=False, sort_keys=True))
