// Parse inline math

'use strict';

var isWhiteSpace = require('../common/utils').isWhiteSpace;

function escapeBefore(str, pos) {
  var i = 0;
  while (str.charCodeAt(pos - i - 1) === 0x5c) {
    ++i;
  }
  return i % 2 === 1;
}

function isDigit(code) {
  return code >= 0x30 && code <= 0x39;
}

module.exports = function math_inline(state, silent) {
  var pos = state.pos, max = state.posMax, matchStart;

  if (state.src.charCodeAt(pos) !== 0x24) { return false; }
  var start = pos;
  ++pos;
  while (pos < max && state.src.charCodeAt(pos) === 0x24) { ++pos; }
  var delim = state.src.slice(start, pos);
  if (pos === max
      || delim.length > 2
      || isWhiteSpace(state.src.charCodeAt(pos))) {
    if (!silent) { state.pending += delim; }
    state.pos += delim.length;
    return true;
  }

  while ((matchStart = state.src.indexOf(delim, pos)) !== -1) {
    var ch = state.src.charCodeAt(matchStart - 1);
    if (ch === 0x5c) {
      if (escapeBefore(state.src, matchStart)) {
        ++pos;
        continue;
      }
    } else if (isWhiteSpace(ch)) {
      if ((ch !== 0x20 && ch !== 0x09) || !escapeBefore(state.src, matchStart)) {
        break;
      }
    } else if (matchStart + delim.length < max
               && isDigit(state.src.charCodeAt(matchStart + delim.length))
               && (start === 0 || !isDigit(state.src.charCodeAt(start - 1)))) {
      break;
    }
    if (!silent) {
      var token = state.push('math_inline', 'math', 0);
      token.markup = delim;
      token.content = state.src.slice(start + delim.length, matchStart);
    }
    state.pos = matchStart + delim.length;
    return true;
  }

  if (!silent) { state.pending += delim; }
  state.pos += delim.length;
  return true;
};
