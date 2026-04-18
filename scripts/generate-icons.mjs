import sharp from "sharp";
import { mkdirSync, copyFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const source = join(root, "public", "logotehn.png");

async function generate() {
  // 1. favicon (icon.png) — 32x32
  await sharp(source)
    .resize(32, 32, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(join(root, "app", "icon.png"));
  console.log("✓ app/icon.png (32x32)");

  // 2. apple-icon.png — 180x180
  await sharp(source)
    .resize(180, 180, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(join(root, "app", "apple-icon.png"));
  console.log("✓ app/apple-icon.png (180x180)");

  // 3. favicon-16x16
  await sharp(source)
    .resize(16, 16, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(join(root, "public", "favicon-16x16.png"));
  console.log("✓ public/favicon-16x16.png (16x16)");

  // 4. favicon-32x32
  await sharp(source)
    .resize(32, 32, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(join(root, "public", "favicon-32x32.png"));
  console.log("✓ public/favicon-32x32.png (32x32)");

  // 5. android-chrome-192x192
  await sharp(source)
    .resize(192, 192, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(join(root, "public", "android-chrome-192x192.png"));
  console.log("✓ public/android-chrome-192x192.png (192x192)");

  // 6. android-chrome-512x512
  await sharp(source)
    .resize(512, 512, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(join(root, "public", "android-chrome-512x512.png"));
  console.log("✓ public/android-chrome-512x512.png (512x512)");

  // 7. mstile-150x150
  await sharp(source)
    .resize(150, 150, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(join(root, "public", "mstile-150x150.png"));
  console.log("✓ public/mstile-150x150.png (150x150)");

  // 8. OG image logo — 512x512 (for social sharing)
  await sharp(source)
    .resize(512, 512, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile(join(root, "public", "logo-512.png"));
  console.log("✓ public/logo-512.png (512x512)");

  // 9. Copy to public/images/logo.png
  await sharp(source)
    .resize(400, 400, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(join(root, "public", "images", "logo.png"));
  console.log("✓ public/images/logo.png (400x400)");

  console.log("\nAll icons generated!");
}

generate().catch(console.error);
