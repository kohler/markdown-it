// ~~strike through~~
//

function processStrikethroughPair (state, delimiters, i) {
  const startDelim = delimiters[i]
  const endDelim = delimiters[startDelim.end]

  const token_o   = state.tokens[startDelim.token]
  token_o.type    = 's_open'
  token_o.tag     = 's'
  token_o.nesting = 1
  token_o.markup  = '~~'
  token_o.content = ''

  const token_c   = state.tokens[endDelim.token]
  token_c.type    = 's_close'
  token_c.tag     = 's'
  token_c.nesting = -1
  token_c.markup  = '~~'
  token_c.content = ''

  // If a marker sequence has an odd number of characters, it's splitted
  // like this: `~~~~~` -> `~` + `~~` + `~~`, leaving one marker at the
  // start of the sequence.
  //
  // So, we have to move all those markers after subsequent s_close tags.
  //
  const token_p = state.tokens[endDelim.token - 1]
  if (token_p.type === 'text' && token_p.content === '~') {
    let j = endDelim.token + 1
    while (j < state.tokens.length && state.tokens[j].type === 's_close') {
      ++j
    }
    state.tokens[endDelim.token - 1] = state.tokens[j - 1]
    state.tokens[j - 1] = token_p
  }
}

// Insert each marker as a separate text token, and add it to delimiter list
//
export default function strikethrough (state, silent) {
  const start = state.pos
  const marker = state.src.charCodeAt(start)

  if (silent) { return false }

  if (marker !== 0x7E/* ~ */) { return false }

  if (state.latexEscapes) { return false }

  const scanned = state.scanDelims(state.pos, true)
  let len = scanned.length
  const ch = String.fromCharCode(marker)

  if (len < 2) { return false }

  let token

  if (len % 2) {
    token         = state.push('text', '', 0)
    token.content = ch
    len--
  }

  for (let i = 0; i < len; i += 2) {
    token         = state.push('text', '', 0)
    token.content = ch + ch

    state.delimiters.push({
      marker,
      length: 0,     // disable "rule of 3" length checks meant for emphasis
      token: state.tokens.length - 1,
      end: -1,
      open: scanned.can_open,
      close: scanned.can_close,
      pairf: processStrikethroughPair
    })
  }

  state.pos += scanned.length

  return true
}
