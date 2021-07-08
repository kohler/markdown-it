// Parse block math

'use strict';

var isWhiteSpace = require('../common/utils').isWhiteSpace;

function block_terminating_after(src, pos) {
  var xpos = src.indexOf('$$', pos), bsindex;
  while (xpos >= 0) {
    bsindex = xpos;
    while (bsindex > 0 && src.charCodeAt(bsindex - 1) === 0x5C/* \ */) {
      --bsindex;
    }
    if ((xpos - bsindex) % 2 === 0) {
      break;
    }
    xpos = src.indexOf('$$', xpos + 1);
  }
  return xpos;
}

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

  var terminator = pos;
  for (line = startLine; line !== endLine; ++line) {
    if (state.sCount[line] < state.blkIndent) {
      return false;
    }
    var lstart = Math.max(state.bMarks[line] + state.sCount[line], pos + 2),
        lend = state.eMarks[line];
    if (terminator <= lstart - 1) {
      terminator = block_terminating_after(src, lstart);
    }
    if (terminator < 0) {
      return false;
    }
    while (lend > lstart && isWhiteSpace(src.charCodeAt(lend - 1))) {
      --lend;
    }
    if (terminator + 2 < lend) {
      return false;
    } else if (terminator + 2 === lend) {
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
