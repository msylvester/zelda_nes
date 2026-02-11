#!/usr/bin/env npx tsx
/**
 * prep-sprite - Prepare an image for use as an NES sprite in the Zelda game.
 *
 * Usage:
 *   npx tsx tools/prep-sprite.ts <image.png> [--size 16] [--threshold 240] [--out ~/nes_images]
 *
 * What it does:
 *   1. Removes the background (white/near-white pixels → transparent)
 *   2. Trims transparent padding around the sprite
 *   3. Downscales to NES sprite size (default 16x16)
 *   4. Saves the result as a transparent PNG to ~/nes_images/
 */

import sharp from "sharp";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

// ── CLI argument parsing ────────────────────────────────────────────

function parseArgs(argv: string[]) {
  const args = argv.slice(2); // skip node + script
  let inputPath: string | undefined;
  let size = 16;
  let threshold = 240; // pixels with R,G,B all >= threshold are treated as background
  let outDir = path.join(os.homedir(), "nes_images");

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--size" && args[i + 1]) {
      size = parseInt(args[++i]!, 10);
    } else if (arg === "--threshold" && args[i + 1]) {
      threshold = parseInt(args[++i]!, 10);
    } else if (arg === "--out" && args[i + 1]) {
      outDir = args[++i]!.replace(/^~/, os.homedir());
    } else if (!arg!.startsWith("--")) {
      inputPath = arg;
    }
  }

  if (!inputPath) {
    console.error(
      "Usage: npx tsx tools/prep-sprite.ts <image.png> [--size 16] [--threshold 240] [--out ~/nes_images]"
    );
    process.exit(1);
  }

  return { inputPath: path.resolve(inputPath), size, threshold, outDir: path.resolve(outDir) };
}

// ── Background removal ──────────────────────────────────────────────

async function removeBackground(
  inputBuffer: Buffer,
  threshold: number
): Promise<Buffer> {
  // Get raw RGBA pixel data
  const image = sharp(inputBuffer).ensureAlpha();
  const { data, info } = await image
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  const { width, height, channels } = info;

  // Make white/near-white pixels transparent
  for (let i = 0; i < width * height * channels; i += channels) {
    const r = pixels[i]!;
    const g = pixels[i + 1]!;
    const b = pixels[i + 2]!;

    if (r >= threshold && g >= threshold && b >= threshold) {
      pixels[i + 3] = 0; // set alpha to 0
    }
  }

  return sharp(Buffer.from(pixels.buffer), {
    raw: { width, height, channels: 4 },
  })
    .png()
    .toBuffer();
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  const { inputPath, size, threshold, outDir } = parseArgs(process.argv);

  // Validate input exists
  if (!fs.existsSync(inputPath)) {
    console.error(`Error: File not found: ${inputPath}`);
    process.exit(1);
  }

  console.log(`Input:      ${inputPath}`);
  console.log(`Sprite size: ${size}x${size}`);
  console.log(`BG threshold: ${threshold}`);
  console.log(`Output dir: ${outDir}`);
  console.log();

  // Ensure output directory exists
  fs.mkdirSync(outDir, { recursive: true });

  // Read input
  const inputBuffer = fs.readFileSync(inputPath);

  // Get original dimensions for reporting
  const originalMeta = await sharp(inputBuffer).metadata();
  console.log(
    `Original size: ${originalMeta.width}x${originalMeta.height} (${originalMeta.format})`
  );

  // Step 1: Remove background
  console.log("Removing background...");
  const transparentBuffer = await removeBackground(inputBuffer, threshold);

  // Step 2: Trim transparent padding
  console.log("Trimming transparent padding...");
  const trimmedBuffer = await sharp(transparentBuffer)
    .trim()
    .png()
    .toBuffer();

  const trimmedMeta = await sharp(trimmedBuffer).metadata();
  console.log(`After trim: ${trimmedMeta.width}x${trimmedMeta.height}`);

  // Step 3: Resize to NES sprite dimensions
  console.log(`Resizing to ${size}x${size}...`);
  const resizedBuffer = await sharp(trimmedBuffer)
    .resize(size, size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: sharp.kernel.nearest, // preserve pixel-art look
    })
    .png()
    .toBuffer();

  // Step 4: Save
  const baseName = path.basename(inputPath, path.extname(inputPath));
  const outputPath = path.join(outDir, `${baseName}_${size}x${size}.png`);

  fs.writeFileSync(outputPath, resizedBuffer);
  console.log();
  console.log(`Saved: ${outputPath}`);

  // Also report final pixel stats
  const finalMeta = await sharp(resizedBuffer).metadata();
  console.log(`Final size: ${finalMeta.width}x${finalMeta.height}`);
  console.log("Done!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
