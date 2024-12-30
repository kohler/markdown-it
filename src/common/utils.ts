/**
 * Common utility functions exposed through `md.utils` for use by plugins.
 *
 * @module md.utils
 */

import * as mdurl from 'mdurl'
import * as ucmicro from 'uc.micro'
import { decodeHTMLStrict } from 'entities'
import type Token from '../token.ts'

/** @hidden */
type ClassToWrap = new (...args: any[]) => object

/** Wraps a class so it can be called with or without `new`. */
function callable<T extends ClassToWrap> (
  cls: T
): T & ((...args: ConstructorParameters<T>) => InstanceType<T>)
function callable<T extends ClassToWrap> (cls: T) {
  const wrapper = function (...args: ConstructorParameters<T>) {
    const newTarget =
      new.target && new.target !== wrapper
        ? new.target
        : cls

    return Reflect.construct(cls, args, newTarget)
  }

  Object.defineProperty(wrapper, 'name', { value: cls.name })
  Object.setPrototypeOf(wrapper, cls)
  wrapper.prototype = cls.prototype

  return wrapper
}

/**
 * Returns a copy of a token array with the token at `pos` replaced by
 * `newElements`. Used to transform token streams without modifying the
 * original array.
 */
function arrayReplaceAt<T> (src: T[], pos: number, newElements: T[]): T[] {
  return ([] as T[]).concat(src.slice(0, pos), newElements, src.slice(pos + 1))
}

/** Checks whether a code point can be decoded from a numeric HTML entity. */
function isValidEntityCode (c: number) {
  // broken sequence
  if (c >= 0xD800 && c <= 0xDFFF) { return false }
  // never used
  if (c >= 0xFDD0 && c <= 0xFDEF) { return false }
  if ((c & 0xFFFF) === 0xFFFF || (c & 0xFFFF) === 0xFFFE) { return false }
  // control codes
  if (c >= 0x00 && c <= 0x08) { return false }
  if (c === 0x0B) { return false }
  if (c >= 0x0E && c <= 0x1F) { return false }
  if (c >= 0x7F && c <= 0x9F) { return false }
  // out of range
  if (c > 0x10FFFF) { return false }
  return true
}

/**
 * Converts a Unicode code point to a string, like `String.fromCodePoint()`,
 * but does not throw for invalid input.
 */
function fromCodePoint (c: number) {
  /* eslint no-bitwise:0 */
  if (c > 0xffff) {
    c -= 0x10000
    const surrogate1 = 0xd800 + (c >> 10)
    const surrogate2 = 0xdc00 + (c & 0x3ff)

    return String.fromCharCode(surrogate1, surrogate2)
  }
  return String.fromCharCode(c)
}

const UNESCAPE_MD_RE = /\\([!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~])/g
const ENTITY_RE = /&([a-z#][a-z0-9]{1,31});/gi
const UNESCAPE_ALL_RE = new RegExp(`${UNESCAPE_MD_RE.source}|${ENTITY_RE.source}`, 'gi')

const DIGITAL_ENTITY_TEST_RE = /^#((?:x[a-f0-9]{1,8}|[0-9]{1,8}))$/i

function replaceEntityPattern (match: string, name: string) {
  if (name.charCodeAt(0) === 0x23/* # */ && DIGITAL_ENTITY_TEST_RE.test(name)) {
    const code = name[1].toLowerCase() === 'x'
      ? parseInt(name.slice(2), 16)
      : parseInt(name.slice(1), 10)

    if (isValidEntityCode(code)) {
      return fromCodePoint(code)
    }

    return match
  }

  const decoded = decodeHTMLStrict(match)
  if (decoded !== match) {
    return decoded
  }

  return match
}

/** Decodes HTML character references. */
function replaceEntities (str: string) {
  if (str.indexOf('&') < 0) { return str }

  return str.replace(ENTITY_RE, replaceEntityPattern)
}

/** Decodes Markdown backslash escapes. */
function unescapeMd (str: string) {
  if (str.indexOf('\\') < 0) { return str }
  return str.replace(UNESCAPE_MD_RE, '$1')
}

/**
 * Decodes Markdown backslash escapes and HTML character references in link
 * destinations, link titles, and fenced code info strings.
 */
function unescapeAll (str: string) {
  if (str.indexOf('\\') < 0 && str.indexOf('&') < 0) { return str }

  return str.replace(UNESCAPE_ALL_RE, function (match, escaped, entity) {
    if (escaped) { return escaped }
    return replaceEntityPattern(match, entity)
  })
}

const HTML_ESCAPE_TEST_RE = /[&<>"]/
const HTML_ESCAPE_REPLACE_RE = /[&<>"]/g
const HTML_REPLACEMENTS = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;'
}

function replaceUnsafeChar (ch: string): string {
  return HTML_REPLACEMENTS[ch as keyof typeof HTML_REPLACEMENTS]
}

/** Escapes HTML special characters in a string. */
function escapeHtml (str: string) {
  if (HTML_ESCAPE_TEST_RE.test(str)) {
    return str.replace(HTML_ESCAPE_REPLACE_RE, replaceUnsafeChar)
  }
  return str
}

const REGEXP_ESCAPE_RE = /[.?*+^$[\]\\(){}|-]/g

/** Escapes regular expression metacharacters in a string. */
function escapeRE (str: string) {
  return str.replace(REGEXP_ESCAPE_RE, '\\$&')
}

/** Checks whether a character code is an ASCII space or tab. */
function isSpace (code: number) {
  switch (code) {
    case 0x09:
    case 0x20:
      return true
  }
  return false
}

/** Checks whether a character code is a space, tab, or nonbreaking space. */
function isSpaceNB (code: number) {
  switch (code) {
    case 0x09:
    case 0x20:
    case 0xA0:
      return true
  }
  return false
}

/**
 * Checks whether a character code is whitespace recognized by Markdown.
 *
 * Matches the Unicode `Zs` category or `\t`, `\f`, `\v`, `\r`, `\n`.
 */
function isWhiteSpace (code: number) {
  if (code >= 0x2000 && code <= 0x200A) { return true }
  switch (code) {
    case 0x09: // \t
    case 0x0A: // \n
    case 0x0B: // \v
    case 0x0C: // \f
    case 0x0D: // \r
    case 0x20:
    case 0xA0:
    case 0x1680:
    case 0x202F:
    case 0x205F:
    case 0x3000:
      return true
  }
  return false
}

/**
 * Checks whether a character is Unicode punctuation or a symbol.
 *
 * Does not support astral characters.
 */
function isPunctChar (ch: string) {
  return ucmicro.P.test(ch) || ucmicro.S.test(ch)
}

/** Checks whether a Unicode code point is punctuation or a symbol. */
function isPunctCharCode (code: number) {
  return isPunctChar(fromCodePoint(code))
}

/**
 * Markdown ASCII punctuation characters.
 *
 *     !, ", #, $, %, &, ', (, ), *, +, ,, -, ., /, :, ;, <, =, >, ?, @,
 *     [, \, ], ^, _, `, {, |, }, or ~
 *
 * http://spec.commonmark.org/0.15/#ascii-punctuation-character
 *
 * Don't confuse with Unicode punctuation. It lacks some characters in the
 * ASCII range.
 */
function isMdAsciiPunct (ch: number) {
  switch (ch) {
    case 0x21/* ! */:
    case 0x22/* " */:
    case 0x23/* # */:
    case 0x24/* $ */:
    case 0x25/* % */:
    case 0x26/* & */:
    case 0x27/* ' */:
    case 0x28/* ( */:
    case 0x29/* ) */:
    case 0x2A/* * */:
    case 0x2B/* + */:
    case 0x2C/* , */:
    case 0x2D/* - */:
    case 0x2E/* . */:
    case 0x2F/* / */:
    case 0x3A/* : */:
    case 0x3B/* ; */:
    case 0x3C/* < */:
    case 0x3D/* = */:
    case 0x3E/* > */:
    case 0x3F/* ? */:
    case 0x40/* @ */:
    case 0x5B/* [ */:
    case 0x5C/* \ */:
    case 0x5D/* ] */:
    case 0x5E/* ^ */:
    case 0x5F/* _ */:
    case 0x60/* ` */:
    case 0x7B/* { */:
    case 0x7C/* | */:
    case 0x7D/* } */:
    case 0x7E/* ~ */:
      return true
    default:
      return false
  }
}

/** Returns true for close brackets `)`, `]`, and `}`. */
function isCloseBracket (ch: number) {
  return ch === 0x29/* ) */ || ch === 0x5D/* ] */ || ch === 0x7D/* } */
}

function isAttributeStart (ch: number) {
  return ch === 0x3A/* : */ || (ch >= 0x41/* A */ && ch <= 0x5A/* Z */) ||
    ch === 0x5F/* _ */ || (ch >= 0x61/* a */ && ch <= 0x7A/* z */)
}

function isAttributeContinue (ch: number) {
  return ch === 0x2D/* - */ || ch === 0x2E/* . */ ||
    (ch >= 0x30/* 0 */ && ch <= 0x3A/* : */) ||
    (ch >= 0x41/* A */ && ch <= 0x5A/* Z */) ||
    ch === 0x5F/* _ */ || (ch >= 0x61/* a */ && ch <= 0x7A/* z */)
}

/** Normalizes `[reference labels]` for case-insensitive lookup. */
function normalizeReference (str: string) {
  // Trim and collapse whitespace
  //
  str = str.trim().replace(/\s+/g, ' ')

  // .toLowerCase().toUpperCase() should get rid of all differences
  // between letter variants.
  //
  // Simple .toLowerCase() doesn't normalize 125 code points correctly,
  // and .toUpperCase doesn't normalize 6 of them (list of exceptions:
  // İ, ϴ, ẞ, Ω, K, Å - those are already uppercased, but have differently
  // uppercased versions).
  //
  // Here's an example showing how it happens. Lets take greek letter omega:
  // uppercase U+0398 (Θ), U+03f4 (ϴ) and lowercase U+03b8 (θ), U+03d1 (ϑ)
  //
  // Unicode entries:
  // 0398;GREEK CAPITAL LETTER THETA;Lu;0;L;;;;;N;;;;03B8;
  // 03B8;GREEK SMALL LETTER THETA;Ll;0;L;;;;;N;;;0398;;0398
  // 03D1;GREEK THETA SYMBOL;Ll;0;L;<compat> 03B8;;;;N;GREEK SMALL LETTER SCRIPT THETA;;0398;;0398
  // 03F4;GREEK CAPITAL THETA SYMBOL;Lu;0;L;<compat> 0398;;;;N;;;;03B8;
  //
  // Case-insensitive comparison should treat all of them as equivalent.
  //
  // But .toLowerCase() doesn't change ϑ (it's already lowercase),
  // and .toUpperCase() doesn't change ϴ (already uppercase).
  //
  // Applying first lower then upper case normalizes any character:
  // '\u0398\u03f4\u03b8\u03d1'.toLowerCase().toUpperCase() === '\u0398\u0398\u0398\u0398'
  //
  // Note: this is equivalent to unicode case folding; unicode normalization
  // is a different step that is not required here.
  //
  // Final result should be uppercased, because it's later stored in an object
  // (this avoid a conflict with Object.prototype members,
  // most notably, `__proto__`)
  //
  return str.toLowerCase().toUpperCase()
}

function isAsciiTrimmable (c: number) {
  return c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d
}

/**
 * "Light" `.trim()` for blocks (headings, paragraphs), where Unicode spaces
 * should be preserved.
 */
function asciiTrim (str: string) {
  let start = 0
  for (; start < str.length; start++) {
    if (!isAsciiTrimmable(str.charCodeAt(start))) {
      break
    }
  }
  let end = str.length - 1
  for (; end >= start; end--) {
    if (!isAsciiTrimmable(str.charCodeAt(end))) {
      break
    }
  }
  return str.slice(start, end + 1)
}

/**
 * Parses a `{.class #id name="value"}` attribute block in a fenced code
 * info string, adds the attributes to `token`, and returns the info string
 * with the attribute block removed. If the block is malformed or unterminated,
 * returns `info` unchanged and leaves `token.attrs` as it was.
 */
function handleAttributes (info: string, token: Token, allowNB: boolean): string {
  let pos = info ? info.indexOf('{') : -1
  if (pos < 0) {
    return info
  }

  const bpos = pos
  const len = info.length
  token.attrs = token.attrs || []
  const oldAttrs = token.attrs
  const issp = allowNB ? isSpaceNB : isSpace

  for (++pos; pos < len; ++pos) {
    const apos = pos
    let ch = info.charCodeAt(pos)
    let wantAttr: string, wantValue: string, wantJoin: boolean
    if (issp(ch)) {
      continue
    } else if (ch === 0x7D/* } */) {
      info = info.substring(0, bpos).concat(' ', info.substring(pos + 1)).trim()
      return info
    } else if (ch === 0x23/* # */ && pos < len - 1 && isAttributeContinue(info.charCodeAt(pos + 1))) {
      for (pos += 2; pos < len && isAttributeContinue(info.charCodeAt(pos)); ++pos) {
        /* nothing */
      }
      wantAttr = 'id'
      wantValue = info.substring(apos + 1, pos)
      wantJoin = false
      --pos
    } else if (ch === 0x2E/* . */ && pos < len - 1 && isAttributeContinue(info.charCodeAt(pos + 1))) {
      for (pos += 2; pos < len && isAttributeContinue(info.charCodeAt(pos)); ++pos) {
        /* nothing */
      }
      wantAttr = 'class'
      wantValue = info.substring(apos + 1, pos)
      wantJoin = true
      --pos
    } else if (isAttributeStart(ch)) {
      for (++pos; pos < len; ++pos) {
        ch = info.charCodeAt(pos)
        if (!isAttributeContinue(ch)) {
          break
        }
      }
      const apos2 = pos
      wantAttr = info.substring(apos, apos2)
      while (pos < len && issp(ch)) {
        ++pos
        ch = pos < len ? info.charCodeAt(pos) : 0
      }
      if (pos === len) {
        break
      } else if (ch === 0x3D/* = */) {
        for (++pos; pos < len; ++pos) {
          ch = info.charCodeAt(pos)
          if (!issp(ch)) {
            break
          }
        }
        if (pos === len || (ch !== 0x22/* " */ && ch !== 0x27/* ' */)) {
          break
        }
        const quot = ch
        const vpos = pos + 1
        for (++pos; pos < len; ++pos) {
          ch = info.charCodeAt(pos)
          if (ch === quot) {
            break
          }
        }
        if (pos === len) {
          break
        }
        wantValue = replaceEntities(info.substring(vpos, pos))
        wantJoin = false
      } else if (ch === 0x7D/* } */ || apos2 !== pos) {
        wantValue = ''
        wantJoin = false
        --pos
      } else {
        break
      }
    } else {
      break
    }

    if (oldAttrs === token.attrs) {
      token.attrs = oldAttrs.slice()
    }
    if (wantJoin) {
      token.attrJoin(wantAttr, wantValue)
    } else {
      token.attrSet(wantAttr, wantValue)
    }
  }

  /* did not find close brace */
  if (oldAttrs !== token.attrs) {
    token.attrs = oldAttrs
  }
  return info
}

/**
 * Libraries commonly used by markdown-it and its plugins, re-exported to
 * reduce duplicate dependencies in browser bundles.
 */
const lib = { mdurl, ucmicro }

export {
  lib,
  callable,
  unescapeMd,
  unescapeAll,
  isValidEntityCode,
  fromCodePoint,
  escapeHtml,
  arrayReplaceAt,
  isSpace,
  isSpaceNB,
  isWhiteSpace,
  isMdAsciiPunct,
  isPunctChar,
  isPunctCharCode,
  isCloseBracket,
  escapeRE,
  normalizeReference,
  asciiTrim,
  handleAttributes
}
