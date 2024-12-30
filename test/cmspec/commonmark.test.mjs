import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import markdownit from '../../src/index.ts'

function normalize (text) {
  return text.replace(/<blockquote>(?:\r\n?|\n)<\/blockquote>/g, '<blockquote></blockquote>')
}

function loadSpecExamples (path, md) {
  const input = readFileSync(path, 'utf8').replace(/→/g, '\t')
  const examples = []

  md.parse(input, {})
    .filter(function (token) {
      return token.tag === 'code' && token.info.trim() === 'example'
    })
    .forEach(function (token) {
      const arr = token.content.split(/^\.\s*?$/m, 2)

      examples.push({
        md: arr[0],
        html: arr[1].replace(/^\n/, ''),
        line: token.map[0]
      })
    })

  return examples
}

// nlmode 0: run examples as is; 1: replace `\n` with `\r` in input;
// 2: replace `\n` with `\r\n` in input
function generate (path, md, nlmode) {
  describe('spec.txt', function () {
    loadSpecExamples(path, md).forEach(function (fixture) {
      let input = fixture.md
      if (nlmode > 0) {
        if (!/\n/.test(input)) {
          return
        }
        input = input.replace(/\n/g, nlmode === 1 ? '\r' : '\r\n')
      }
      it(`line ${fixture.line}`, function () {
        let result = md.render(input)
        if (nlmode > 0) {
          result = result.replace(/\r\n?/g, '\n')
        }
        assert.strictEqual(result, normalize(fixture.html))
      })
    })
  })
}

describe('CommonMark', function () {
  const md = markdownit('commonmark')

  generate(new URL('../fixtures/commonmark/spec.txt', import.meta.url), md, 0)
})

describe('CommonMark with CR', function () {
  const md = markdownit('commonmark')

  generate(new URL('../fixtures/commonmark/spec.txt', import.meta.url), md, 1)
})

describe('CommonMark with CRNL', function () {
  const md = markdownit('commonmark')

  generate(new URL('../fixtures/commonmark/spec.txt', import.meta.url), md, 2)
})
