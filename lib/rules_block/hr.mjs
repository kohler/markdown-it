// Horizontal rule

import { isSpace } from '../common/utils.mjs'

export default function hr (state, startLine, endLine, silent) {
  // if it's indented more than 3 spaces, it should be a code block
  if (state.sCount[startLine] - state.blkIndent >= 4) { return false }

  let pos = state.bMarks[startLine] + state.tShift[startLine]
  const src = state.src
  const marker = src.charCodeAt(pos)

  // Check hr marker
  if (marker !== 0x2A/* * */ &&
      marker !== 0x2D/* - */ &&
      marker !== 0x5F/* _ */ &&
      (marker !== 0x3D/* = */ || !state.md.options.hotcrp)) {
    return false
  }

  // markers can be mixed with spaces, but there should be at least 3 of them

  let max = state.eMarks[startLine]
  while (pos !== max && isSpace(src.charCodeAt(max - 1))) {
    --max
  }

  let cnt = 1
  for (++pos; pos < max; ++pos) {
    const ch = src.charCodeAt(pos)
    if (ch === marker) {
      cnt++
    } else if (!isSpace(ch)) {
      return false
    }
  }

  if (cnt < 3) { return false }

  if (silent) { return true }

  state.line = startLine + 1

  const token  = state.push('hr', 'hr', 0)
  token.map    = [startLine, state.line]
  token.markup = String.fromCharCode(marker).repeat(cnt)

  if ((marker === 0x2D/* - */ || marker === 0x3D/* = */) &&
      state.bMarks[startLine] + state.tShift[startLine] + cnt === max) {
    state.lastSetext = token
  } else {
    state.lastSetext = null
  }

  return true
}
