// Process autolinks '<protocol:...>'

'use strict';


/*eslint max-len:0*/
var EMAIL_RE    = /^([a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*)$/;
var AUTOLINK_RE = /^([a-zA-Z][a-zA-Z0-9+.\-]{1,31}):(\/*[^\/<>\x00-\x20][^<>\x00-\x20]*)$/;
var isWhiteSpace = require('../common/utils').isWhiteSpace,
    isPunctChar  = require('../common/utils').isPunctChar;

function isAutolinkTrim(ch) {
  return ch === 0x22/* " */ || ch === 0x28/* ( */ || ch === 0x29/* ) */
    || ch === 0x2C/* , */ || ch === 0x2E/* . */ || ch === 0x3A/* : */
    || ch === 0x3B/* ; */ || ch === 0x21/* ! */ || ch === 0x3F/* ? */;
}

module.exports = function autolink(state, silent) {
  var url, fullUrl, token, ch, max,
      src = state.src, pos = state.pos, start, eatPending, type;

  ch = src.charCodeAt(pos);
  if (ch === 0x3C/* < */) {
    type = 0;
    start = (pos += 1);
    eatPending = 0;
  } else if (ch === 0x3A/* : */
             && state.md.options.hotcrp
             && pos >= 3
             && (src.charCodeAt(pos + 1) === 0x2F/*/*/
                 || src.charCodeAt(pos - 1) === 0x6F/*o*/)) {
    type = 1;
    if (pos >= 4 && src.slice(pos - 4, pos + 3) === 'http://') {
      start = pos - 4;
      pos += 3;
    } else if (pos >= 5 && src.slice(pos - 5, pos + 3) === 'https://') {
      start = pos - 5;
      pos += 3;
    } else if (pos >= 3 && src.slice(pos - 3, pos + 3) === 'ftp://') {
      start = pos - 3;
      pos += 3;
    } else if (pos >= 6 && src.slice(pos - 6, pos) === 'mailto') {
      start = pos + 1;
      pos += 1;
      type = 2;
    } else {
      return false;
    }
    eatPending = state.pos - (type === 2 ? start - 7 : start);
    if ((!silent && state.pending.length < eatPending)
        || (start > 0
            && !isWhiteSpace(src.charCodeAt(start - 1))
            && !isPunctChar(src.charAt(start - 1)))) {
      return false;
    }
  } else {
    return false;
  }

  max = state.posMax;
  if (type === 0) {
    while (pos !== max
           && (ch = src.charCodeAt(pos)) !== 0x3C/* < */
           && ch !== 0x3E/* > */) {
      ++pos;
    }
    if (pos === max || ch === 0x3C) { return false; }
  } else {
    while (pos !== max
           && (ch = src.charCodeAt(pos)) !== 0x3C/* < */
           && ch !== 0x3E/* > */
           && ch !== 0x22/* " */
           && !isWhiteSpace(ch)) {
      ++pos;
    }
    while (pos > start && isAutolinkTrim(src.charCodeAt(pos - 1))) {
      --pos;
    }
  }

  if (pos === start) {
    return false;
  }

  url = src.slice(start, pos);

  if (type !== 2 && AUTOLINK_RE.test(url)) {
    fullUrl = state.md.normalizeLink(url);
  } else if (type !== 1 && EMAIL_RE.test(url)) {
    fullUrl = state.md.normalizeLink('mailto:' + url);
  } else {
    return false;
  }

  if (!state.md.validateLink(fullUrl)) { return false; }

  if (!silent) {
    if (eatPending) {
      state.pending = state.pending.slice(0, state.pending.length - eatPending);
    }

    token         = state.push('link_open', 'a', 1);
    token.attrs   = [ [ 'href', fullUrl ] ];
    token.markup  = 'autolink';
    token.info    = 'auto';

    token         = state.push('text', '', 0);
    token.content = state.md.normalizeLinkText(url);

    token         = state.push('link_close', 'a', -1);
    token.markup  = 'autolink';
    token.info    = 'auto';
  }

  state.pos = type === 0 ? pos + 1 : pos;
  return true;
};
