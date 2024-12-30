// Process special characters

import type StateInline from './state_inline.ts'

export default function special_pass (state: StateInline, silent: boolean): boolean {
  if (state.src.charCodeAt(state.pos) !== 0) return false

  if (!silent) {
    const token = state.push('text_special', '', 0)
    token.content = '�'
    token.markup = '\0'
    token.info = 'special'
  }
  state.pos++
  return true
}
