// Parse block math

'use strict';

var isWhiteSpace = require('../common/utils').isWhiteSpace;

module.exports = function math_block(state, startLine, endLine, silent) {
  var line,
      pos = state.bMarks[startLine] + state.tShift[startLine],
      max = state.eMarks[startLine],
      src = state.src;

  if (state.sCount[startLine] - state.blkIndent >= 4
      || pos + 2 > max
      || src.charCodeAt(pos) !== 0x24/* $ */
      || src.charCodeAt(pos + 1) !== 0x24
      || src.charCodeAt(pos + 2) === 0x24) {
    return false;
  }

  for (line = startLine; line !== endLine; ++line) {
    if (state.sCount[line] < state.blkIndent) { return false; }
    var lstart = Math.max(state.bMarks[line] + state.sCount[line], pos + 2),
        lend = state.eMarks[line];
    while (lend > lstart && isWhiteSpace(src.charCodeAt(lend - 1))) {
      --lend;
    }
    if (lend > lstart + 1
        && src.charCodeAt(lend - 1) === 0x24
        && src.charCodeAt(lend - 2) === 0x24) {
      state.line = line + 1;
      if (silent) {
        return true;
      }
      var content = state.getLines(startLine, state.line, state.sCount[startLine], false);
      lstart = 2;
      lend = content.length - (state.eMarks[line] - lend + 2);
      while (lstart < lend && isWhiteSpace(content.charCodeAt(lstart))) {
        ++lstart;
      }
      while (lstart < lend && isWhiteSpace(content.charCodeAt(lend - 1))) {
        --lend;
      }
      content = content.slice(lstart, lend);
      var token = state.push('math_block', 'math', 0);
      token.block = true;
      token.content = content;
      token.map = [ startLine, state.line ];
      token.markup = '$$';
      return true;
    }
  }

  return false;
};
