/* LanguageTool WebExtension
 * Copyright (C) 2016 Daniel Naber (http://www.danielnaber.de)
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
let activeTextarea;

function activeElement() {
  return activeTextarea;
}

function setActiveElement(el) {
  activeTextarea = el;
}

/** Automatically handle errors, only works for popup **/
window.addEventListener('error', function(evt) {
	const { error } = evt;
	if (error) {
		Tools.track("unknown", `error message: ${error.message}`, error.stack);
	} else {
		Tools.track("unknown", "unknown error event", JSON.stringify(evt));
	}
});