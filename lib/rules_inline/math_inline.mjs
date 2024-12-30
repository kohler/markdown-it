// Parse inline math

import { isWhiteSpace } from '../common/utils.mjs'

function escapeBefore (str, pos) {
  let i = 0
  while (str.charCodeAt(pos - i - 1) === 0x5c/* \ */) {
    ++i
  }
  return i % 2 === 1
}

function isDigit (code) {
  return code >= 0x30 && code <= 0x39
}

export default function math_inline (state, silent) {
  if (!state.md.options.hotcrp) { return false }

  let pos = state.pos
  const src = state.src
  if (src.charCodeAt(pos) !== 0x24/* $ */) { return false }

  const start = pos
  const max = state.posMax
  ++pos
  while (pos < max && src.charCodeAt(pos) === 0x24) { ++pos }
  const delim = src.slice(start, pos)
  if (pos === max ||
      delim.length > 2 ||
      isWhiteSpace(src.charCodeAt(pos))) {
    state.shiftPending(delim.length, silent)
    return true
  }

  let matchStart
  while ((matchStart = src.indexOf(delim, pos)) !== -1) {
    const ch = src.charCodeAt(matchStart - 1)
    if (ch === 0x5c/* \ */) {
      if (escapeBefore(src, matchStart)) {
        ++pos
        continue
      }
    } else if (isWhiteSpace(ch)) {
      if ((ch !== 0x20 && ch !== 0x09) || !escapeBefore(src, matchStart)) {
        break
      }
    } else if (matchStart + delim.length < max &&
               isDigit(src.charCodeAt(matchStart + delim.length)) &&
               (start === 0 || !isDigit(src.charCodeAt(start - 1)))) {
      break
    }
    if (!silent) {
      const token = state.push('math_inline', 'math', 0)
      token.markup = delim
      token.content = src.slice(start + delim.length, matchStart)
    }
    state.pos = matchStart + delim.length
    return true
  }

  state.shiftPending(delim.length, silent)
  return true
}
