// Normalize input string

// https://spec.commonmark.org/0.29/#line-ending
const NULL_RE      = /\0/g

export default function normalize (state) {
  // Replace NULL characters
  state.src = state.src.replace(NULL_RE, '\uFFFD')
}
