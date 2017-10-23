/* LanguageTool WebExtension 
 * Copyright (C) 2015 Daniel Naber (http://www.danielnaber.de)
 * 
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301
 * USA
 */
"use strict";

let assert = require('assert');
let Tools = require('../share/tools.js');
let Markup = require('../share/markup.js');

describe('Tools', function () {
    it('should properly escape', function () {
        let e = Tools.escapeHtml;
        assert.equal(e(""), "");
        assert.equal(e("X"), "X");
        assert.equal(e("<x>"), "&lt;x&gt;");
        assert.equal(e("foo <x> bar"), "foo &lt;x&gt; bar");
        assert.equal(e("A & B & C"), "A &amp; B &amp; C");
        assert.equal(e("foo\"bar"), "foo&quot;bar");
        assert.equal(e("'foo\"bar'"), "&apos;foo&quot;bar&apos;");
    });
    it('check lowercase first char', function () {
        let e = Tools.startWithLowercase;
        assert.equal(e("a"), true);
        assert.equal(e("ä"), true);
        assert.equal(e("äXX"), true);
        assert.equal(e(""), false);
        assert.equal(e("A"), false);
        assert.equal(e("Ä"), false);
    });
    it('check uppercase first char', function () {
        let e = Tools.startWithUppercase;
        assert.equal(e("a"), false);
        assert.equal(e("ä"), false);
        assert.equal(e("äXX"), false);
        assert.equal(e(""), false);
        assert.equal(e("A"), true);
        assert.equal(e("Ä"), true);
    });
    it('lowercase first char', function () {
        let e = Tools.lowerCaseFirstChar;
        assert.equal(e(""), "");
        assert.equal(e("abc"), "abc");
        assert.equal(e("A"), "a");
        assert.equal(e("A"), "a");
        assert.equal(e("ÄXX"), "äXX");
    });
});

describe('Markup', function () {

    // see https://www.npmjs.com/package/mock-browser
    let MockBrowser = require('mock-browser').mocks.MockBrowser;
    let doc = new MockBrowser().getDocument();

    it('html2markupList', function () {
        let f = Markup.html2markupList;
        assert.deepEqual(f("foo", doc), [{text: 'foo'}]);
        assert.deepEqual(f("<x/>", doc), [{markup: '<x/>'}]);
        assert.deepEqual(f("<div/>", doc), [{markup: '<div/>', text: '\n\n'}]);
        assert.deepEqual(f("y <x/> z", doc), [
            {text: 'y '},
            {markup: '<x/>'},
            {text: ' z'}
        ]);
        assert.deepEqual(f("<div>foo</div>", doc), [
            {markup: '<div>', text: '\n\n'},
            {text: 'foo'},
            {markup: '</div>'}
        ]);
        assert.deepEqual(f("<div class='myclass'>foo</div>", doc), [
            {markup: '<div class=\'myclass\'>', text: '\n\n'},
            {text: 'foo'},
            {markup: '</div>'}
        ]);
        assert.deepEqual(f("<p>foo</p>", doc), [
            {markup: '<p>', text: '\n\n'},
            {text: 'foo'},
            {markup: '</p>'}
        ]);
        assert.deepEqual(f("<x><div>foo</div></x>", doc), [
            {markup: '<x>'},
            {markup: '<div>', text: '\n\n'},
            {text: 'foo'},
            {markup: '</div>'},
            {markup: '</x>'}
        ]);
        assert.deepEqual(f("<x><div>foo</div></x> end", doc), [
            {markup: '<x>'},
            {markup: '<div>', text: '\n\n'},
            {text: 'foo'},
            {markup: '</div>'},
            {markup: '</x>'},
            {text: ' end'}
        ]);
        assert.deepEqual(f('<p>start <span class="c" onkeypress="foo <br/> bar">span text</span> end</p>', doc), [
            {markup: '<p>', text: '\n\n'},
            {text: 'start '},
            {markup: '<span class="c" onkeypress="foo <br/> bar">'},
            {text: 'span text'},
            {markup: '</span>'},
            {text: ' end'},
            {markup: '</p>'}
        ]);
        assert.deepEqual(f("<x>start <span onkeypress='foo \"<br/> bar'>span text</span> end</x>", doc), [
            {markup: '<x>'},
            {text: 'start '},
            {markup: "<span onkeypress='foo \"<br/> bar'>"},
            {text: 'span text'},
            {markup: '</span>'},
            {text: ' end'},
            {markup: '</x>'}
        ]);
        assert.deepEqual(f("<x>start<br>end</x>", doc), [
            {markup: '<x>'},
            {text: 'start'},
            {markup: '<br>', text: '\n'},
            {text: 'end'},
            {markup: '</x>'}
        ]);
        assert.deepEqual(f("<x>start<br/>end</x>", doc), [
            {markup: '<x>'},
            {text: 'start'},
            {markup: '<br/>', text: '\n'},
            {text: 'end'},
            {markup: '</x>'}
        ]);
    });
    
    it('markupList2html and markupList2text', function () {
        let html = Markup.markupList2html;
        let text = Markup.markupList2text;
        
        let input1 = [];
        assert.equal(html(input1), '');
        assert.equal(text(input1), '');

        let input2 = [{text: 'foo'}];
        assert.equal(html(input2), 'foo');
        assert.equal(text(input2), 'foo');

        let input3 = [{text: 'foo'}];
        assert.equal(html([{markup: '<x/>'}]), '<x/>');
        assert.equal(text([{markup: '<x/>'}]), '');
        
        let input4 = [
                {markup: '<x>'},
                {text: 'foo'},
                {markup: '</x>'}
            ];
        assert.equal(html(input4), '<x>foo</x>');
        assert.equal(text(input4), 'foo');
        
        let input5 = [
            {markup: '<x>'},
            {markup: '<div>', text: '\n\n'},
            {text: 'foo'},
            {markup: '</div>'},
            {markup: '</x>'},
            {text: ' end'}
        ];
        assert.equal(html(input5), "<x><div>foo</div></x> end");
        assert.equal(text(input5), "\n\nfoo end");

        let input6 = [
            {markup: '<div>', text: '\n\n'},
            {text: 'foo1'},
            {markup: '</div>'},
            {markup: '<div>', text: '\n\n'},
            {text: 'foo2'},
            {markup: '</div>'}
        ];
        assert.equal(html(input6), "<div>foo1</div><div>foo2</div>");
        assert.equal(text(input6), "\n\nfoo1\n\nfoo2");
    });

    it('replace', function () {
        let f = Markup.replace;
        
        let input1   = [{text: 'foo'}];
        let output1a = [{text: 'bar'}];
        assert.deepEqual(f(input1, 0, 3, 'bar'), output1a);

        let output1b = [{text: 'fxo'}];
        assert.deepEqual(f(input1, 1, 1, 'x'), output1b);

        let input2   = [{markup: '<div>', text: '\n\n'}, {text: 'foo'}, {markup: '</div>'}];
        let output2a = [{markup: '<div>', text: '\n\n'}, {text: 'bar'}, {markup: '</div>'}];
        assert.deepEqual(f(input2, 2, 3, 'bar'), output2a);

        let input3   = [{markup: '<div>', text: '\n\n'}, {text: 'foo'}, {markup: '</div>'}];
        let output3a = [{markup: '<div>', text: '\n\n'}, {text: 'longer-than-input'}, {markup: '</div>'}];
        assert.deepEqual(f(input3, 2, 3, 'longer-than-input'), output3a);

        let input4   = [{markup: '<div>', text: '\n\n'}, {text: 'foo'}, {markup: '</div>'}, 
                        {markup: '<div>', text: '\n\n'}, {text: 'bar'}, {markup: '</div>'}];
        let output4a = [{markup: '<div>', text: '\n\n'}, {text: 'foo'}, {markup: '</div>'},
                        {markup: '<div>', text: '\n\n'}, {text: 'new'}, {markup: '</div>'}];
        assert.deepEqual(f(input4, 7, 3, 'new'), output4a);

        // "This <b>is</b> is ..." - not supported yet, as error area spans more than a single
        // 'text' element:
        try {
            let input5   = [{text: 'This '}, {markup: '<b>'}, {text: 'is'}, {markup: '</b>'}, {text: ' is'}];
            let output5a = [{text: 'This '}, {markup: '<b>'}, {text: 'is'}, {markup: '</b>'}];
            assert.deepEqual(f(input5, 5, 5, 'is'), output5a);
        } catch (expected) {
            // expected
        }

        // TODO: this doesn't work yet:
        let input6   = [{text: 'This '}, {text: 'is '}, {markup: '<b>'}, {text: 'is'}, {markup: '</b>'}];
        let output6a = [{text: 'This '}, {markup: '<b>'}, {text: 'is'}, {markup: '</b>'}];
        //assert.deepEqual(f(input6, 5, 5, 'is'), output6a);
    });

    it('resolveEntities', function () {
        let f = Markup._resolveEntities;
        assert.equal(f("", doc), "");
        assert.equal(f("foo&nbsp;bar", doc), "foo\u00A0bar");
        assert.equal(f("&Uuml;ber &uuml;bel &szlig;", doc), "Über übel ß");
    });
    
});
