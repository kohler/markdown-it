// Process LaTeX escapes

function processLatexEscapePair (state, delimiters, i) {
  const startDelim = delimiters[i]
  const endDelim = delimiters[startDelim.end]

  const token_o = state.tokens[startDelim.token]
  let ttype, tag
  if (token_o.content === '\\textbf{') {
    ttype = 'strong'
    tag = 'strong'
  } else if (token_o.content === '\\underline{') {
    ttype = 'em'
    tag = 'u'
  } else {
    ttype = 'em'
    tag = 'em'
  }

  token_o.type    = ttype + '_open'
  token_o.tag     = tag
  token_o.nesting = 1
  token_o.markup  = 'latex'
  token_o.content = ''

  const token_c   = state.tokens[endDelim.token]
  token_c.type    = ttype + '_close'
  token_c.tag     = tag
  token_c.nesting = -1
  token_c.markup  = 'latex'
  token_c.content = ''
}

export default function latex_escape (state, silent) {
  if (silent) { return false }

  const src = state.src
  const pos = state.pos
  const max = state.posMax
  const ch = src.charCodeAt(pos)

  if (state.latexEscapes) {
    if (ch === 0x7B/* { */) {
      state.latexEscapes.push(false)
    } else if (ch === 0x7D/* } */) {
      const wasOpener = state.latexEscapes.pop()
      if (state.latexEscapes.length === 0) {
        state.latexEscapes = null
      }
      if (wasOpener) {
        const token = state.push('text', '', 0)
        token.content = String.fromCharCode(ch)

        state.delimiters.push({
          marker: 'latex',
          length: 0,
          token: state.tokens.length - 1,
          end: -1,
          open: false,
          close: true
        })

        state.pos += 1
        return true
      }
    }
  }

  if (ch !== 0x5C/* \ */) { return false }

  const ch2 = src.charCodeAt(state.pos + 1)
  let len
  if (ch2 === 0x65/* e */) {
    len = 6
  } else if (ch2 === 0x74/* t */) {
    len = 8
  } else if (ch2 === 0x75/* u */) {
    len = 11
  } else {
    return false
  }
  if (pos + len >= max || src.charCodeAt(pos + len - 1) !== 0x7B/* { */) {
    return false
  }

  const w = src.slice(pos, pos + len)
  if (w !== '\\emph{' && w !== '\\textit{' && w !== '\\textbf{' && w !== '\\underline{') {
    return false
  }

  const token = state.push('text', '', 0)
  token.content = w
  token.pos = pos + len

  state.delimiters.push({
    marker: 'latex',
    length: 0,
    token: state.tokens.length - 1,
    end: -1,
    open: true,
    close: false,
    pairf: processLatexEscapePair
  })

  state.latexEscapes = state.latexEscapes || []
  state.latexEscapes.push(true)
  state.pos += len

  return true
}
