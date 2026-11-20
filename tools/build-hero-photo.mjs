// Builds the homepage hero photo (issue #100) from the Unsplash original
// "Long dining table with festive flowers" by M F (photo fb0_wj2MZk4).
// Usage: node tools/build-hero-photo.mjs <source.jpg>
// Download the source from https://unsplash.com/photos/fb0_wj2MZk4 (Unsplash
// License). Any 3:2 export of at least 3000 x 2000 px gives the same crops.
// Desktop files use the left two thirds of the frame, so the table's
// vanishing point sits about 70% across and the dark chairs sit behind the
// copy. The phone files use a tighter 3:2 crop centered on the table. The
// wine bottle's label is blurred so no brand is legible.
import sharp from "sharp";
import { resolve } from "node:path";

const [, , source] = process.argv;
if (!source) throw new Error("Pass the path to the 3:2 source JPEG");

const meta = await sharp(source).metadata();
if (Math.abs(meta.width / meta.height - 1.5) > 0.01) throw new Error("Source must be 3:2");
const scale = meta.width / 3000;
// Crops in 3000 x 2000 source pixels.
const desktopCrop = { left: 0, top: 330, width: 2000, height: 1333 };
const labelArea = { left: 1300, top: 1120, width: 110, height: 220 };
const phoneCrop = { left: 300, top: 300, width: 2100, height: 1400 };

const outputs = [
  { file: "event-hero-1440.webp", width: 1440, crop: desktopCrop, quality: 56 },
  { file: "event-hero-960.webp", width: 960, crop: desktopCrop, quality: 66 },
  { file: "event-hero-480.webp", width: 480, crop: desktopCrop, quality: 70 },
  { file: "event-hero-mobile-780.webp", width: 780, quality: 70, crop: phoneCrop },
  { file: "event-hero-mobile-480.webp", width: 480, quality: 68, crop: phoneCrop },
];

const scaled = (area) => Object.fromEntries(Object.entries(area).map(([k, v]) => [k, Math.round(v * scale)]));
// Soften the label through a feathered mask so the blur has no hard edge.
const pad = Math.round(45 * scale);
const label = scaled(labelArea);
const area = { left: label.left - pad, top: label.top - pad, width: label.width + 2 * pad, height: label.height + 2 * pad };
const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${area.width}" height="${area.height}">
  <filter id="f"><feGaussianBlur stdDeviation="${pad / 2.5}"/></filter>
  <rect x="${pad * 0.7}" y="${pad * 0.7}" width="${area.width - pad * 1.4}" height="${area.height - pad * 1.4}" rx="${pad / 2}" fill="#fff" filter="url(#f)"/></svg>`);
const softened = await sharp(source).extract(area).blur(7 * scale)
  .composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
const master = await sharp(source).composite([{ input: softened, left: area.left, top: area.top }]).toBuffer();

for (const output of outputs) {
  let image = sharp(master);
  if (output.crop) {
    const c = scaled(output.crop);
    image = image.extract(c);
  }
  const info = await image
    .modulate({ brightness: 1.0, saturation: 0.95 })
    .toColorspace("srgb")
    .resize(output.width, Math.round(output.width / 1.5), { kernel: "lanczos3" })
    .sharpen({ sigma: 0.5 })
    .webp({ quality: output.quality, effort: 6, smartSubsample: true })
    .toFile(resolve("dist/assets", output.file));
  console.log(`${output.file} ${info.width}x${info.height} ${Math.round(info.size / 1024)} KB`);
}
