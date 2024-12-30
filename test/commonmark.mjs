import { fileURLToPath } from 'node:url'
import { relative } from 'node:path'
import { load } from 'markdown-it-testgen'
import markdownit from '../index.mjs'
import { assert } from 'chai'

function normalize (text) {
  return text.replace(/<blockquote>(?:\r\n?|\n)<\/blockquote>/g, '<blockquote></blockquote>')
}

function generate (path, md, nlmode) {
  load(path, function (data) {
    data.meta = data.meta || {}

    const desc = data.meta.desc || relative(path, data.file);

    (data.meta.skip ? describe.skip : describe)(desc, function () {
      data.fixtures.forEach(function (fixture) {
        let first = fixture.first.text
        const second = fixture.second.text
        if (nlmode > 0) {
          if (!/\n/.test(first)) {
            return
          } else if (nlmode === 1) {
            first = first.replace(/\n/g, '\r')
          } else {
            first = first.replace(/\n/g, '\r\n')
          }
        }
        it(fixture.header ? fixture.header : 'line ' + (fixture.first.range[0] - 1), function () {
          let result = md.render(first)
          if (nlmode > 0) {
            result = result.replace(/\r\n?/g, '\n')
          }
          assert.strictEqual(result, normalize(second))
        })
      })
    })
  })
}

describe('CommonMark', function () {
  const md = markdownit('commonmark')

  generate(fileURLToPath(new URL('fixtures/commonmark/good.txt', import.meta.url)), md, 0)
})

describe('CommonMark with CR', function () {
  const md = markdownit('commonmark')

  generate(fileURLToPath(new URL('fixtures/commonmark/good.txt', import.meta.url)), md, 1)
})

describe('CommonMark with CRNL', function () {
  const md = markdownit('commonmark')

  generate(fileURLToPath(new URL('fixtures/commonmark/good.txt', import.meta.url)), md, 2)
})
