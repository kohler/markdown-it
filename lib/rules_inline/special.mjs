// Process special characters

export default function special_pass (state, silent) {
  const ch = state.src.charCodeAt(state.pos)
  if (ch !== 0 && ch !== 0xFFFC) return false

  let len = 1
  if (ch === 0xFFFC) {
    // consume a possible sequence of TAG characters
    let ch1
    while (state.pos + len + 1 < state.posMax &&
           (ch1 = state.src.codePointAt(state.pos + len)) >= 0xE0020 &&
           ch1 <= 0xE007F) {
      len += 2
      if (ch1 === 0xE007F) {
        break
      }
    }
  }

  if (!silent) {
    const token = state.push('text_special', '', 0)
    token.markup  = state.src.slice(state.pos, state.pos + len)
    token.content = ch ? token.markup : '\uFFFD'
    token.info    = 'special'
  }
  state.pos += len
  return true
}
