// Horizontal rule

'use strict';

var isSpace = require('../common/utils').isSpace;


module.exports = function hr(state, startLine, endLine, silent) {
  var marker, cnt, ch, token, src = state.src,
      pos = state.bMarks[startLine] + state.tShift[startLine],
      max = state.eMarks[startLine];

  // if it's indented more than 3 spaces, it should be a code block
  if (state.sCount[startLine] - state.blkIndent >= 4) { return false; }

  marker = src.charCodeAt(pos);

  // Check hr marker
  if (marker !== 0x2A/* * */ &&
      marker !== 0x2D/* - */ &&
      marker !== 0x5F/* _ */ &&
      (marker !== 0x3D/* = */ || !state.md.options.hotcrp)) {
    return false;
  }

  // markers can be mixed with spaces, but there should be at least 3 of them

  while (pos !== max && isSpace(src.charCodeAt(max - 1))) {
    --max;
  }

  cnt = 1;
  for (++pos; pos !== max; ++pos) {
    if ((ch = src.charCodeAt(pos)) === marker) {
      ++cnt;
    } else if (!isSpace(ch)) {
      return false;
    }
  }

  if (cnt < 3) { return false; }

  state.line = startLine + 1;

  if (!silent) {
    token        = state.push('hr', 'hr', 0);
    token.map    = [ startLine, state.line ];
    token.markup = String.fromCharCode(marker).repeat(3);

    if ((marker === 0x2D || marker === 0x3D)
        && state.bMarks[startLine] + state.tShift[startLine] + cnt === max) {
      state.lastSetext = token;
    } else {
      state.lastSetext = null;
    }
  }

  return true;
};
