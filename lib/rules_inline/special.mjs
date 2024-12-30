// Process special characters

export default function special_pass (state, silent) {
  if (state.src.charCodeAt(state.pos) !== 0) return false

  if (!silent) {
    const token = state.push('text_special', '', 0)
    token.content = '\uFFFD'
    token.markup  = '\0'
    token.info    = 'special'
  }
  state.pos++
  return true
}
