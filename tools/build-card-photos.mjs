// Builds the six event-format card photos (issue #99) from owner-supplied
// originals. Usage: node tools/build-card-photos.mjs <source-dir> [--preview <dir>]
// Each source is cropped to the shared 5:4 card frame around a hand-picked
// focal window, lightly graded toward the site's warm ivory/gold palette, and
// written as 1200x960 and 700x560 WebP files in dist/assets/event-photos/.
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const [, , sourceDir, flag, previewDir] = process.argv;
if (!sourceDir) throw new Error("Pass the folder that holds 1.jpg … 6.jpg");

// crop: left/top/width/height in source pixels, always 5:4.
// tone: small per-photo corrections so the six read as one set.
export const photos = [
  { source: "1.jpg", name: "rooftop-social", crop: { left: 150, top: 0, width: 1405, height: 1124 }, quality: 72, tone: { brightness: 1.0, saturation: 0.96 } },
  { source: "2.jpg", name: "live-at-night", crop: { left: 40, top: 0, width: 1666, height: 1333 }, tone: { brightness: 1.02, saturation: 0.94 } },
  { source: "3.jpg", name: "private-occasion", crop: { left: 200, top: 0, width: 1666, height: 1333 }, quality: 62, tone: { brightness: 1.0, saturation: 0.95 } },
  { source: "4.jpg", name: "supper-club", crop: { left: 0, top: 0, width: 1666, height: 1333 }, tone: { brightness: 1.0, saturation: 0.95 } },
  { source: "5.jpg", name: "tasting-table", crop: { left: 250, top: 0, width: 1666, height: 1333 }, tone: { brightness: 1.0, saturation: 0.97 } },
  { source: "6.jpg", name: "corporate-social", crop: { left: 40, top: 0, width: 1833, height: 1466 }, tone: { brightness: 1.03, saturation: 0.96 } },
];

const outDir = resolve("dist/assets/event-photos");
mkdirSync(outDir, { recursive: true });
if (flag === "--preview") mkdirSync(previewDir, { recursive: true });

for (const photo of photos) {
  const { width, height } = photo.crop;
  if (Math.abs(width / height - 1.25) > 0.002) throw new Error(`${photo.name} crop is not 5:4`);
  const base = sharp(resolve(sourceDir, photo.source))
    .extract(photo.crop)
    .modulate({ brightness: photo.tone.brightness, saturation: photo.tone.saturation })
    .toColorspace("srgb");
  for (const [w, h, defaultQuality] of [[1200, 960, 78], [700, 560, 76]]) {
    const quality = Math.min(defaultQuality, photo.quality ?? defaultQuality);
    const file = resolve(outDir, `${photo.name}-${w}.webp`);
    const info = await base.clone().resize(w, h, { kernel: "lanczos3" }).sharpen({ sigma: 0.6 })
      .webp({ quality, effort: 6, smartSubsample: true }).toFile(file);
    console.log(`${photo.name}-${w}.webp ${Math.round(info.size / 1024)} KB`);
  }
  if (flag === "--preview") {
    await sharp(resolve(sourceDir, photo.source)).extract(photo.crop).resize(500, 400).jpeg({ quality: 80 })
      .toFile(resolve(previewDir, `${photo.name}.jpg`));
  }
}
