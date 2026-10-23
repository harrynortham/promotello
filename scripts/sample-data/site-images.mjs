// Downloads the category and homepage photos into public/images.
//   node scripts/sample-data/site-images.mjs
import fs from "node:fs/promises";
import path from "node:path";

import { downloadUnsplashPhoto } from "./unsplash.mjs";

// Unsplash photo IDs (unsplash.com/photos/<id>), all under the Unsplash License.
export const siteImages = {
    "categories/food-drink": "W3SEyZODn8U",
    "categories/things-to-do": "3Z95_0rAy88",
    "categories/shopping": "2ETxtH6Ti2M",
    "categories/health-beauty": "5Io0sH2XEdk",
    "categories/services": "v-LAxH7JSzI",
    "categories/travel-stays": "0ppqZpWTkXE",
    "home/hero": "m8jmGrhhdY4",
    "home/harbourside": "erTULgoNt8g",
};

for (const [name, photoId] of Object.entries(siteImages)) {
    const isHero = name === "home/hero";
    const buffer = await downloadUnsplashPhoto(photoId, isHero ? { width: 2000, height: 1200 } : { width: 1200, height: 900 });
    const file = path.join("public/images", `${name}.jpg`);
    await fs.writeFile(file, buffer);
    console.log(`${file}  ${(buffer.length / 1024).toFixed(0)} KB  (unsplash.com/photos/${photoId})`);
}
