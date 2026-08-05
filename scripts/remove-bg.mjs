import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const input = path.join(__dirname, "../public/NS LOGO.png");
const output = path.join(__dirname, "../public/NS LOGO.png");
const backup = path.join(__dirname, "../public/NS LOGO original.png");

const img = sharp(input);
const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });

const { width, height, channels } = info;
const pixels = new Uint8Array(data);

// Make any pixel with R>180 & G>180 & B>180 (grey/white) fully transparent
for (let i = 0; i < pixels.length; i += channels) {
  const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
  if (r > 180 && g > 180 && b > 180) {
    pixels[i + 3] = 0; // transparent
  }
}

// Save original as backup first
await sharp(input).toFile(backup);

await sharp(Buffer.from(pixels), { raw: { width, height, channels } })
  .png()
  .toFile(output + ".tmp.png");

// Replace original
import { renameSync } from "fs";
renameSync(output + ".tmp.png", output);

console.log(`Done. Background removed. Original saved to "NS LOGO original.png"`);
