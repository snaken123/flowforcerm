import sharp from "sharp";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const src = join(root, "public", "icons", "icon-512-original.png");

// Save original once as backup source
import { copyFileSync, existsSync } from "fs";
if (!existsSync(src)) {
  copyFileSync(join(root, "public", "icons", "icon-512.png"), src);
}

async function makeCircularIcon(size, outName) {
  const circle = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" /></svg>`
  );
  await sharp(src)
    .resize(size, size)
    .composite([{ input: circle, blend: "dest-in" }])
    .png()
    .toFile(join(root, "public", "icons", outName));
  console.log(`✓ ${outName} written`);
}

await makeCircularIcon(512, "icon-512.png");
await makeCircularIcon(192, "icon-192.png");
await makeCircularIcon(180, "apple-touch-icon.png");

console.log("✓ apple-touch-icon.png written");
