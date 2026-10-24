// Downloads the category, homepage and business marketing photos into
// public/images. Pass a prefix to download only some, e.g. "marketing/".
//   node scripts/sample-data/site-images.mjs [prefix]
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
    // Business marketing pages: the sample café "Harbour Grind" and other
    // kinds of business. Same photos as the sample offers.
    "marketing/harbour-grind-cafe": "N76Cadq2wQs",
    "marketing/harbour-grind-beans": "TD4DBagg2wE",
    "marketing/pastry-counter": "n49BjsFf5dI",
    "marketing/barber": "CMt1rgM5Y0I",
    "marketing/yoga": "2G2nlUR9VrU",
    "marketing/pizza": "MQUqbmszGGM",
    "marketing/plants": "dDVU6D_6T80",
    "marketing/pub": "vt0O0Av96R4",
    "marketing/beauty": "91dmB8SHiWc",
    "marketing/dog-grooming": "LpK2xddrElI",
};

const only = process.argv[2] ?? "";

for (const [name, photoId] of Object.entries(siteImages)) {
    if (!name.startsWith(only)) continue;

    await fs.mkdir(path.dirname(path.join("public/images", name)), { recursive: true });
    const isHero = name === "home/hero";
    const buffer = await downloadUnsplashPhoto(photoId, isHero ? { width: 2000, height: 1200 } : { width: 1200, height: 900 });
    const file = path.join("public/images", `${name}.jpg`);
    await fs.writeFile(file, buffer);
    console.log(`${file}  ${(buffer.length / 1024).toFixed(0)} KB  (unsplash.com/photos/${photoId})`);
}
