import zlib from "node:zlib";

/**
 * The code points a WOFF2 font maps to glyphs (its cmap). harfbuzzjs reads
 * OpenType but not WOFF2, which needs Brotli. Reads the Unicode cmap
 * subtables of format 4 and 12, which is what subset-font writes.
 */
export function woff2CodePoints(font: Buffer): Set<number> {
  if (font.toString("latin1", 0, 4) !== "wOF2") throw new Error("not a WOFF2 font");
  const cmap = woff2Tables(font).get("cmap");
  if (!cmap) throw new Error("font has no cmap table");
  const out = new Set<number>();
  const count = cmap.readUInt16BE(2);
  for (let i = 0; i < count; i++) {
    const platform = cmap.readUInt16BE(4 + i * 8);
    const encoding = cmap.readUInt16BE(6 + i * 8);
    const unicode = platform === 0 || (platform === 3 && (encoding === 1 || encoding === 10));
    if (unicode) readSubtable(cmap.subarray(cmap.readUInt32BE(8 + i * 8)), out);
  }
  return out;
}

function readSubtable(table: Buffer, out: Set<number>): void {
  const format = table.readUInt16BE(0);
  if (format === 12) {
    const groups = table.readUInt32BE(12);
    for (let g = 0; g < groups; g++) {
      const start = table.readUInt32BE(16 + g * 12);
      const end = table.readUInt32BE(20 + g * 12);
      const glyph = table.readUInt32BE(24 + g * 12);
      for (let cp = start; cp <= end; cp++) if (glyph + (cp - start) !== 0) out.add(cp);
    }
  } else if (format === 4) {
    const segments = table.readUInt16BE(6) / 2;
    const ends = 14;
    const starts = ends + segments * 2 + 2;
    const deltas = starts + segments * 2;
    const offsets = deltas + segments * 2;
    for (let s = 0; s < segments; s++) {
      const end = table.readUInt16BE(ends + s * 2);
      const start = table.readUInt16BE(starts + s * 2);
      const delta = table.readInt16BE(deltas + s * 2);
      const offset = table.readUInt16BE(offsets + s * 2);
      for (let cp = start; cp <= end && cp !== 0xffff; cp++) {
        const glyph = offset === 0 ? (cp + delta) & 0xffff : glyphAt(table, offsets + s * 2 + offset + (cp - start) * 2, delta);
        if (glyph !== 0) out.add(cp);
      }
    }
  }
}

function glyphAt(table: Buffer, at: number, delta: number): number {
  const raw = table.readUInt16BE(at);
  return raw === 0 ? 0 : (raw + delta) & 0xffff;
}

// The table tags a WOFF2 directory entry can name by index (flags bits 0-5).
const KNOWN_TAGS = [
  "cmap", "head", "hhea", "hmtx", "maxp", "name", "OS/2", "post", "cvt ", "fpgm", "glyf", "loca", "prep",
  "CFF ", "VORG", "EBDT", "EBLC", "gasp", "hdmx", "kern", "LTSH", "PCLT", "VDMX", "vhea", "vmtx", "BASE",
  "GDEF", "GPOS", "GSUB", "EBSC", "JSTF", "MATH", "CBDT", "CBLC", "COLR", "CPAL", "SVG ", "sbix", "acnt",
  "avar", "bdat", "bloc", "bsln", "cvar", "fdsc", "feat", "fmtx", "fvar", "gvar", "hsty", "just", "lcar",
  "mort", "morx", "opbd", "prop", "trak", "Zapf", "Silf", "Glat", "Gloc", "Feat", "Sill",
];

// WOFF2 (https://www.w3.org/TR/WOFF2/): a table directory, then every table in
// one Brotli stream, back to back. cmap is never transformed, so its bytes are
// the sfnt's own.
function woff2Tables(font: Buffer): Map<string, Buffer> {
  const count = font.readUInt16BE(12);
  const compressedLength = font.readUInt32BE(20);
  let at = 48;
  const readBase128 = () => {
    let value = 0;
    for (let i = 0; i < 5; i++) {
      const byte = font[at++];
      value = value * 128 + (byte & 0x7f);
      if (!(byte & 0x80)) return value;
    }
    throw new Error("bad UIntBase128");
  };
  const directory: { tag: string; length: number }[] = [];
  for (let i = 0; i < count; i++) {
    const flags = font[at++];
    const tag = (flags & 0x3f) === 63 ? font.toString("latin1", at, (at += 4)) : KNOWN_TAGS[flags & 0x3f];
    const transform = flags >> 6;
    const origLength = readBase128();
    const transformed = tag === "glyf" || tag === "loca" ? transform === 0 : transform !== 0;
    directory.push({ tag, length: transformed ? readBase128() : origLength });
  }
  const stream = zlib.brotliDecompressSync(font.subarray(at, at + compressedLength));
  const tables = new Map<string, Buffer>();
  let offset = 0;
  for (const { tag, length } of directory) {
    tables.set(tag, stream.subarray(offset, offset + length));
    offset += length;
  }
  return tables;
}
