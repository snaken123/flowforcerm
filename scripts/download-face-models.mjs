/**
 * Downloads face-api.js model weights to public/models/
 * Run once: node scripts/download-face-models.mjs
 */
import { mkdir, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

const BASE =
  "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights";

const FILES = [
  "tiny_face_detector_model-weights_manifest.json",
  "tiny_face_detector_model-shard1",
  "face_landmark_68_tiny_model-weights_manifest.json",
  "face_landmark_68_tiny_model-shard1",
  "face_recognition_model-weights_manifest.json",
  "face_recognition_model-shard1",
  "face_recognition_model-shard2",
];

const outDir = join(process.cwd(), "public", "models");

if (!existsSync(outDir)) {
  await mkdir(outDir, { recursive: true });
  console.log("Created public/models/");
}

for (const file of FILES) {
  const dest = join(outDir, file);
  if (existsSync(dest)) {
    console.log(`  skip  ${file}`);
    continue;
  }
  process.stdout.write(`  fetch ${file} … `);
  const res = await fetch(`${BASE}/${file}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${file}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
  console.log(`${(buf.length / 1024).toFixed(0)} KB`);
}

console.log("\nDone! Models saved to public/models/");
