// Process LaTeX escapes

'use strict';


function processLatexEscapePair(state, delimiters, i) {
  var startDelim = delimiters[i],
      endDelim = delimiters[startDelim.end],
      isStrong, token;

  token         = state.tokens[startDelim.token];
  isStrong      = token.content === '\\textbf{';
  token.type    = isStrong ? 'strong_open' : 'em_open';
  token.tag     = isStrong ? 'strong' : 'em';
  token.nesting = 1;
  token.markup  = 'latex';
  token.content = '';

  token         = state.tokens[endDelim.token];
  token.type    = isStrong ? 'strong_close' : 'em_close';
  token.tag     = isStrong ? 'strong' : 'em';
  token.nesting = -1;
  token.markup  = 'latex';
  token.content = '';
}


module.exports = function latex_escape(state, silent) {
  var ch, ch2, w, len,
      src = state.src, pos = state.pos, max = state.posMax,
      token;

  if (silent) { return false; }

  ch = src.charCodeAt(pos);
  if (ch === 0x5C/* \ */) {
    ch2 = src.charCodeAt(pos + 1);
    if (ch2 === 0x65/* e */) {
      len = 6;
    } else if (ch2 === 0x74/* t */) {
      len = 8;
    } else {
      return false;
    }
    if (pos + len >= max || src.charCodeAt(pos + len - 1) !== 0x7B/* { */) {
      return false;
    }

    w = src.slice(pos, pos + len);
    if (w === '\\emph{' || w === '\\textit{' || w === '\\textbf{') {
      token = state.push('text', '', 0);
      token.content = w;

      state.delimiters.push({
        marker: -1000,
        length: 0,
        jump: 0,
        token: state.tokens.length - 1,
        end: -1,
        open: true,
        close: false,
        pairf: processLatexEscapePair
      });

      ++state.latexEscapes;
      state.pos += len;
      return true;
    }
  } else if (ch === 0x7D/* } */ && state.latexEscapes > 0) {
    token = state.push('text', '', 0);
    token.content = String.fromCharCode(ch);

    state.delimiters.push({
      marker: -1000,
      length: 0,
      jump: 0,
      token: state.tokens.length - 1,
      end: -1,
      open: false,
      close: true
    });

    --state.latexEscapes;
    state.pos += 1;
    return true;
  }

  return false;
};
