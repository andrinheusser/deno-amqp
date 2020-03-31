import { splitArray, padArray, readBytesSync } from "../framing/utils.ts";

function writeBitField(bits: boolean[]): number {
  if (bits.length > 8) {
    throw new Error(`Too many bits to fit in one byte`);
  }

  const field = (bits[7] ? 0b10000000 : 0) |
    (bits[6] ? 0b01000000 : 0) |
    (bits[5] ? 0b00100000 : 0) |
    (bits[4] ? 0b00010000 : 0) |
    (bits[3] ? 0b00001000 : 0) |
    (bits[2] ? 0b00000100 : 0) |
    (bits[1] ? 0b00000010 : 0) |
    (bits[0] ? 0b00000001 : 0);

  return field;
}

function readBitField(num: number) {
  const bits: boolean[] = [];

  bits.push((0b00000001 & num) !== 0);
  bits.push((0b00000010 & num) !== 0);
  bits.push((0b00000100 & num) !== 0);
  bits.push((0b00001000 & num) !== 0);
  bits.push((0b00010000 & num) !== 0);
  bits.push((0b00100000 & num) !== 0);
  bits.push((0b01000000 & num) !== 0);
  bits.push((0b10000000 & num) !== 0);

  return bits;
}

export function encodeBits(
  bits: boolean[]
): Uint8Array {
  const bytes = splitArray(bits, 8)
    .map(s => padArray(s, 8, false))
    .flatMap(writeBitField);

  return new Uint8Array(bytes);
}

export function decodeBits(r: Deno.SyncReader, length: number) {
  const bytes = Math.ceil(length / 8);
  const data = readBytesSync(r, bytes);
  const bits: boolean[] = [];

  for (const byte of data) {
    bits.push(...readBitField(byte));
  }

  return bits.slice(0, length);
}
