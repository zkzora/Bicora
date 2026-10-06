/**
 * Minimal decoder for the Clarity values returned by Hiro's call-read endpoint (hex-serialized).
 * Covers what the TVL mapping reads: uint, int, bool, and (ok …) / (err …) / (some …) / none around them.
 */
export type ClarityValue =
  | { type: 'uint' | 'int'; value: bigint }
  | { type: 'bool'; value: boolean }
  | { type: 'ok' | 'err' | 'some'; value: ClarityValue }
  | { type: 'none' };

export function decodeClarity(hex: string): ClarityValue {
  const bytes = Buffer.from(hex.replace(/^0x/, ''), 'hex');
  const [value, end] = read(bytes, 0);
  if (end !== bytes.length) throw new Error(`trailing bytes after Clarity value (${bytes.length - end})`);
  return value;
}

function read(b: Buffer, at: number): [ClarityValue, number] {
  const tag = b[at];
  switch (tag) {
    case 0x00:
    case 0x01: {
      if (b.length < at + 17) throw new Error('truncated integer');
      let v = 0n;
      for (let i = 1; i <= 16; i++) v = (v << 8n) | BigInt(b[at + i]);
      if (tag === 0x00 && v >= 1n << 127n) v -= 1n << 128n;
      return [{ type: tag === 0x00 ? 'int' : 'uint', value: v }, at + 17];
    }
    case 0x03:
    case 0x04:
      return [{ type: 'bool', value: tag === 0x03 }, at + 1];
    case 0x07:
    case 0x08:
    case 0x0a: {
      const [inner, end] = read(b, at + 1);
      return [{ type: tag === 0x07 ? 'ok' : tag === 0x08 ? 'err' : 'some', value: inner }, end];
    }
    case 0x09:
      return [{ type: 'none' }, at + 1];
    default:
      throw new Error(`unsupported Clarity type 0x${(tag ?? 0).toString(16).padStart(2, '0')}`);
  }
}

/** Unwraps (ok …) / (some …) to an integer; throws on err, none or a non-integer. */
export function toBigInt(v: ClarityValue): bigint {
  if (v.type === 'uint' || v.type === 'int') return v.value;
  if (v.type === 'ok' || v.type === 'some') return toBigInt(v.value);
  throw new Error(`expected an integer, got ${v.type}`);
}
