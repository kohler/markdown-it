// Process autolinks '<protocol:...>'

import { isWhiteSpace, isPunctChar } from '../common/utils.mjs'

/* eslint max-len:0 */
const EMAIL_RE    = /^([a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*)$/
/* eslint-disable-next-line no-control-regex */
const AUTOLINK_RE = /^([a-zA-Z][a-zA-Z0-9+.-]{1,31}):(\/*[^/<>\x00-\x20][^<>\x00-\x20]*)$/

function isAutolinkTrim (ch) {
  return ch === 0x22/* " */ || ch === 0x28/* ( */ || ch === 0x29/* ) */ ||
    ch === 0x2C/* , */ || ch === 0x2E/* . */ || ch === 0x3A/* : */ ||
    ch === 0x3B/* ; */ || ch === 0x21/* ! */ || ch === 0x3F/* ? */
}

export default function autolink (state, silent) {
  const src = state.src
  let pos = state.pos
  let ch = src.charCodeAt(pos)
  let start, type, eatPending
  if (ch === 0x3C/* < */) {
    type = 0
    ++pos
    start = pos
    eatPending = 0
  } else if (ch === 0x3A/* : */ &&
             state.md.options.hotcrp &&
             pos >= 3 &&
             (src.charCodeAt(pos + 1) === 0x2F/* / */ ||
              src.charCodeAt(pos - 1) === 0x6F/* o */)) {
    type = 1
    if (pos >= 4 && src.slice(pos - 4, pos + 3) === 'http://') {
      start = pos - 4
      pos += 3
    } else if (pos >= 5 && src.slice(pos - 5, pos + 3) === 'https://') {
      start = pos - 5
      pos += 3
    } else if (pos >= 3 && src.slice(pos - 3, pos + 3) === 'ftp://') {
      start = pos - 3
      pos += 3
    } else if (pos >= 6 && src.slice(pos - 6, pos) === 'mailto') {
      type = 2
      start = pos + 1
      pos += 1
    } else {
      return false
    }
    eatPending = state.pos - (type === 2 ? start - 7 : start)
    if ((!silent && state.pending.length < eatPending) ||
        (start > 0 &&
         !isWhiteSpace(src.charCodeAt(start - 1)) &&
         !isPunctChar(src.charAt(start - 1)))) {
      return false
    }
  } else {
    return false
  }

  const max = state.posMax
  if (type === 0) {
    for (;;) {
      if (pos >= max) return false

      ch = src.charCodeAt(pos)

      if (ch === 0x3C /* < */) return false
      if (ch === 0x3E /* > */) break
      ++pos
    }
  } else {
    while (pos !== max &&
           (ch = src.charCodeAt(pos)) !== 0x3C /* < */ &&
           ch !== 0x3E /* > */ &&
           ch !== 0x22 /* " */ &&
           !isWhiteSpace(ch)) {
      ++pos
    }
    while (pos > start && isAutolinkTrim(src.charCodeAt(pos - 1))) {
      --pos
    }
  }

  if (pos === start) {
    return false
  }

  const url = src.slice(start, pos)
  let fullUrl

  if (type !== 2 && AUTOLINK_RE.test(url)) {
    fullUrl = state.md.normalizeLink(url)
  } else if (type !== 1 && EMAIL_RE.test(url)) {
    fullUrl = state.md.normalizeLink('mailto:' + url)
  } else {
    return false
  }

  if (!state.md.validateLink(fullUrl)) { return false }

  if (!silent) {
    if (eatPending) {
      state.pending = state.pending.slice(0, state.pending.length - eatPending)
    }

    const token_o   = state.push('link_open', 'a', 1)
    token_o.attrs   = [['href', fullUrl]]
    token_o.markup  = 'autolink'
    token_o.info    = 'auto'

    const token_t   = state.push('text', '', 0)
    token_t.content = state.md.normalizeLinkText(url)

    const token_c   = state.push('link_close', 'a', -1)
    token_c.markup  = 'autolink'
    token_c.info    = 'auto'
  }

  state.pos = type === 0 ? pos + 1 : pos
  return true
}
