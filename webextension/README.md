## NOTE

This is our old add-on. We recommend using the new one instead: https://chrome.google.com/webstore/detail/languagetool/oldceeleldhonbafppcapldpdifcinji (to be released for Firefox soon)

## LanguageTool for Firefox and Chrome

A [LanguageTool](https://languagetool.org) extension [for Firefox](https://addons.mozilla.org/firefox/addon/languagetool/)
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

Go to `about:debugging`, enable add-on debugging and load `manifest.json` from the
extension directory.


### License

Lesser General Public License 2.1 or later, see file `COPYING`


### Release Checklist

1. test at least the sites [linked here](https://github.com/languagetool-org/languagetool-browser-addon/wiki/Sites-to-test)
2. make sure no permissions have been added to the manifest since last release
3. Run `updateLocales.bash`
4. increase version in `manifest.json`
5. update `CHANGES.md`
6. run `pack-firefox-webext.sh` and `pack-chrome-extension.sh` and upload the 
   results (in `dist`)
