/**
 * Copyright (c) 2019 The xterm.js authors. All rights reserved.
 * @license MIT
 */
import { TypedArray } from '../../common/Types';

/**
 * StringToUtf32 - decodes UTF16 sequences into UTF32 codepoints.
 * To keep the decoder in line with JS strings it handles single surrogates as UCS2.
 */
export class StringToUtf32 {
  private _interim: number = 0;

  /**
   * Clears interim and resets decoder to clean state.
   */
  public clear(): void {
    this._interim = 0;
  }

  /**
   * Decode JS string to UTF32 codepoints.
   * The methods assumes stream input and will store partly transmitted
   * surrogate pairs and decode them with the next data chunk.
   * Note: The method does no bound checks for target, therefore make sure
   * the provided input data does not exceed the size of `target`.
   * Returns the number of written codepoints in `target`.
   */
  decode(input: string, target: Uint32Array): number {
    const length = input.length;

    if (!length) {
      return 0;
    }

    let size = 0;
    let startPos = 0;

    // handle leftover surrogate high
    if (this._interim) {
      const second = input.charCodeAt(startPos++);
      if (0xDC00 <= second && second <= 0xDFFF) {
        target[size++] = (this._interim - 0xD800) * 0x400 + second - 0xDC00 + 0x10000;
      } else {
        // illegal codepoint (USC2 handling)
        target[size++] = this._interim;
        target[size++] = second;
      }
      this._interim = 0;
    }

    for (let i = startPos; i < length; ++i) {
      const code = input.charCodeAt(i);
      // surrogate pair first
      if (0xD800 <= code && code <= 0xDBFF) {
        if (++i >= length) {
          this._interim = code;
          return size;
        }
        const second = input.charCodeAt(i);
        if (0xDC00 <= second && second <= 0xDFFF) {
          target[size++] = (code - 0xD800) * 0x400 + second - 0xDC00 + 0x10000;
        } else {
          // illegal codepoint (USC2 handling)
          target[size++] = code;
          target[size++] = second;
        }
        continue;
      }
      target[size++] = code;
    }
    return size;
  }
}

/**
 * Convert UTF32 codepoint into JS string.
 */
export function stringFromCodePoint(codePoint: number): string {
  if (codePoint > 0xFFFF) {
    codePoint -= 0x10000;
    return String.fromCharCode((codePoint >> 10) + 0xD800) + String.fromCharCode((codePoint % 0x400) + 0xDC00);
  }
  return String.fromCharCode(codePoint);
}

/**
 * Convert UTF32 char codes into JS string.
 * Basically the same as `stringFromCodePoint` but for multiple codepoints
 * in a loop (which is a lot faster).
 */
export function utf32ToString<T extends TypedArray>(data: T, start: number = 0, end: number = data.length): string {
  let result = '';
  let cp;
  for (let i = start; i < end; ++i) {
    if ((cp = data[i]) > 0xFFFF) {
      cp -= 0x10000;
      result += String.fromCharCode((cp >> 10) + 0xD800) + String.fromCharCode((cp % 0x400) + 0xDC00);
    } else {
      result += String.fromCharCode(cp);
    }
  }
  return result;
}
