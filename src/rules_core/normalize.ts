// Normalize input string

import type StateCore from './state_core.ts'

const NULL_RE = /\0/g

export default function normalize (state: StateCore): void {
  // Replace NULL characters
  state.src = state.src.replace(NULL_RE, '�')
}
