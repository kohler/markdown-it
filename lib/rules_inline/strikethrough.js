// ~~strike through~~
//
'use strict';


function processStrikethroughPair(state, delimiters, i) {
  var startDelim = delimiters[i],
      endDelim = delimiters[startDelim.end],
      token, j;

  token         = state.tokens[startDelim.token];
  token.type    = 's_open';
  token.tag     = 's';
  token.nesting = 1;
  token.markup  = '~~';
  token.content = '';

  token         = state.tokens[endDelim.token];
  token.type    = 's_close';
  token.tag     = 's';
  token.nesting = -1;
  token.markup  = '~~';
  token.content = '';

  // If a marker sequence has an odd number of characters, it's splitted
  // like this: `~~~~~` -> `~` + `~~` + `~~`, leaving one marker at the
  // start of the sequence.
  //
  // So, we have to move all those markers after subsequent s_close tags.
  //
  token = state.tokens[endDelim.token - 1];
  if (token.type === 'text' && token.content === '~') {
    j = endDelim.token + 1;
    while (j < state.tokens.length && state.tokens[j].type === 's_close') {
      ++j;
    }
    state.tokens[endDelim.token - 1] = state.tokens[j - 1];
    state.tokens[j - 1] = token;
  }
}

// Insert each marker as a separate text token, and add it to delimiter list
//
module.exports = function strikethrough(state, silent) {
  var i, scanned, token, len, ch,
      start = state.pos,
      marker = state.src.charCodeAt(start);

  if (silent) { return false; }

  if (marker !== 0x7E/* ~ */) { return false; }

  scanned = state.scanDelims(state.pos, true);
  len = scanned.length;
  ch = String.fromCharCode(marker);

  if (len < 2) { return false; }

  if (len % 2) {
    token         = state.push('text', '', 0);
    token.content = ch;
    len--;
  }

  for (i = 0; i < len; i += 2) {
    token         = state.push('text', '', 0);
    token.content = ch + ch;

    state.delimiters.push({
      marker: marker,
      length: 0,     // disable "rule of 3" length checks meant for emphasis
      token:  state.tokens.length - 1,
      end:    -1,
      open:   scanned.can_open,
      close:  scanned.can_close,
      pairf:  processStrikethroughPair
    });
  }

  state.pos += scanned.length;

  return true;
};
