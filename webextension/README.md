## LanguageTool for Firefox and Chrome

A [LanguageTool](https://languagetool.org) extension [for Firefox](https://addons.mozilla.org/de/firefox/addon/languagetool/)
and [for Chrome](https://chrome.google.com/webstore/detail/languagetool/oldceeleldhonbafppcapldpdifcinji).

### Unit tests

Install mocha [as documented on their homepage](https://mochajs.org/). Then run `mocha`.
To run tests continuously during development, run `mocha -w`
(this will automatically run the tests as soon as the source files change).
Tests should work with Node.js v4.2.1 or later. You can switch between different
Node.js versions using e.g. `nvm use v4.2.1`.

### Integration tests

Link `languagetool-for-chrome-tests.html` from your web root so that it can be accessed
via `http://localhost/languagetool-for-chrome-tests.html`. If you open that URL with Chrome
and click the LanguageTool extension icon, tests will run automatically (note: these tests
are very incomplete yet).

### Testing in Firefox

You need an [unbranded build](https://wiki.mozilla.org/Add-ons/Extension_Signing#Unbranded_Builds) 
of Firefox. Go to `about:debugging`, enable add-on debugging and load `manifest.json` from the
extension directory. See https://blog.mozilla.org/addons/2016/04/14/developing-extensions-with-web-ext-1-0/
for details.


### License

Lesser General Public License 2.1 or later, see file `COPYING`
