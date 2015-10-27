/* LanguageTool for Chrome 
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
let Tools = require('../tools.js');

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
});
