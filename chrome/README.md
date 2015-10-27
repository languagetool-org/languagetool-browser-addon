## LanguageTool for Chrome

A [LanguageTool](https://languagetool.org) extension for Chrome. Get it from:

https://chrome.google.com/webstore/detail/languagetool/oldceeleldhonbafppcapldpdifcinji

### Unit tests

Run `mocha`. To run tests continuously during development, run `mocha -w`
(this will automatically run the tests as soon as the source files change).

### Integration tests

Link `languagetool-for-chrome-tests.html` from your web root so that it can be accessed
via `http://localhost/languagetool-for-chrome-tests.html`. If you open that URL with Chrome
and click the LanguageTool extension icon, tests will run automatically (note: these tests
are very incomplete yet).

### License

Lesser General Public License 2.1 or later, see file `COPYING`

