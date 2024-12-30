// Proceess '\n'

import { isSpace, analyzeNewline } from '../common/utils.mjs'

export default function newline (state, silent) {
  let pos = state.pos

  const ch = state.src.charCodeAt(pos)
  if (ch !== 0x0A/* \n */ && ch !== 0x0D/* \r */) { return false }

  const plen = state.pendingLength()
  const max = state.posMax

  // '  \n' -> hardbreak
  // Lookup in pending chars is bad practice! Don't copy to other rules!
  // Pending string is stored in concat mode, indexed lookups will cause
  // convertion to flat mode.
  if (!silent) {
    if (plen > 0 && state.pendingCharCodeAt(plen - 1) === 0x20) {
      if (plen > 1 && state.pendingCharCodeAt(plen - 2) === 0x20) {
        // Find whitespaces tail of pending chars.
        let ws = 2
        while (plen > ws && state.pendingCharCodeAt(plen - ws - 1) === 0x20) ws++

        state.trimPending(ws)
        state.push('hardbreak', 'br', 0)
      } else {
        state.trimPending(1)
        state.push('softbreak', 'br', 0)
      }
    } else {
      state.push('softbreak', 'br', 0)
    }
  }

  pos += analyzeNewline(state.src, pos, max)

  // skip heading spaces for next line
  while (pos < max && isSpace(state.src.charCodeAt(pos))) { pos++ }

  state.pos = pos
  return true
}
