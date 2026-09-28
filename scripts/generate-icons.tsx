import fs from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og.js";

/**
 * Generates every app icon from one mark, drawn in code so there's no
 * binary source asset to keep in sync: a ring with two dots, "elsewhere,
 * same moment". Self-hosted PWA icons and the browser favicon (no Google,
 * no third-party icon generator).
 *
 * Run again (`pnpm generate-icons`) only if the mark's design changes.
 */

const ROOT = process.cwd();
const BG = "#171717"; // matches --primary (oklch(0.205 0 0)) in globals.css
const FG = "#fafafa"; // matches --primary-foreground

type MarkOptions = { size: number; ringRatio: number; strokeRatio: number; dotRatio: number };

function Mark({ size, ringRatio, strokeRatio, dotRatio }: MarkOptions) {
  const ring = size * ringRatio;
  const stroke = Math.max(2, size * strokeRatio);
  const dot = size * dotRatio;
  // Two points on the ring's circumference: "here" and "elsewhere", the
  // same moment seen from two places at once.
  const angles = [-50, 145] as const;
  const dots = angles.map((deg) => {
    const rad = (deg * Math.PI) / 180;
    const r = ring / 2;
    return { x: r + r * Math.cos(rad) - dot / 2, y: r + r * Math.sin(rad) - dot / 2 };
  });

  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: BG,
      }}
    >
      <div style={{ position: "relative", width: ring, height: ring, display: "flex" }}>
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: "50%",
            border: `${stroke}px solid ${FG}`,
          }}
        />
        {dots.map((d, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: d.x,
              top: d.y,
              width: dot,
              height: dot,
              borderRadius: "50%",
              background: FG,
            }}
          />
        ))}
      </div>
    </div>
  );
}

async function renderPng(size: number, options: Omit<MarkOptions, "size">): Promise<Buffer> {
  const res = new ImageResponse(<Mark size={size} {...options} />, { width: size, height: size });
  return Buffer.from(await res.arrayBuffer());
}

/** Wraps a single PNG image in a minimal one-entry ICO container. */
function pngToIco(png: Buffer, size: number): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // one image

  const entry = Buffer.alloc(16);
  entry.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 means 256)
  entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
  entry.writeUInt8(0, 2); // no palette
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // colour planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(png.length, 8); // image data size
  entry.writeUInt32LE(header.length + entry.length, 12); // offset

  return Buffer.concat([header, entry, png]);
}

async function main() {
  const iconsDir = path.join(ROOT, "public/icons");
  fs.mkdirSync(iconsDir, { recursive: true });

  const favicon = await renderPng(32, { ringRatio: 0.72, strokeRatio: 0.09, dotRatio: 0.22 });
  fs.writeFileSync(path.join(ROOT, "src/app/favicon.ico"), pngToIco(favicon, 32));

  const appleIcon = await renderPng(180, { ringRatio: 0.6, strokeRatio: 0.05, dotRatio: 0.16 });
  fs.writeFileSync(path.join(ROOT, "src/app/apple-icon.png"), appleIcon);

  const icon192 = await renderPng(192, { ringRatio: 0.72, strokeRatio: 0.06, dotRatio: 0.18 });
  fs.writeFileSync(path.join(iconsDir, "icon-192.png"), icon192);

  const icon512 = await renderPng(512, { ringRatio: 0.72, strokeRatio: 0.06, dotRatio: 0.18 });
  fs.writeFileSync(path.join(iconsDir, "icon-512.png"), icon512);

  // Maskable: OS masks may crop to a circle, so keep the mark inside the
  // ~80% safe zone (a smaller ring, same full-bleed background).
  const maskable512 = await renderPng(512, { ringRatio: 0.55, strokeRatio: 0.05, dotRatio: 0.14 });
  fs.writeFileSync(path.join(iconsDir, "icon-512-maskable.png"), maskable512);

  console.log("Wrote src/app/favicon.ico, src/app/apple-icon.png, public/icons/icon-{192,512,512-maskable}.png");
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
