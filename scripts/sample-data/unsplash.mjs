import sharp from "sharp";

// Downloads a photo released under the Unsplash License and returns it as a
// cropped JPEG. Goes through the photo's download endpoint (as Unsplash asks)
// and refuses anything not served from images.unsplash.com, which rules out
// paid Unsplash+ images.
export async function downloadUnsplashPhoto(photoId, { width = 1600, height = 1000 } = {}) {
    const response = await fetch(
        `https://unsplash.com/photos/${photoId}/download?force=true`,
        { redirect: "manual" },
    );
    const location = response.headers.get("location");

    if (!location || new URL(location).host !== "images.unsplash.com") {
        throw new Error(`Unsplash photo ${photoId} is not available under the free licence`);
    }

    const url = new URL(location);
    url.searchParams.set("w", String(width * 2));
    url.searchParams.set("q", "85");
    url.searchParams.set("fm", "jpg");

    const image = await fetch(url);

    if (!image.ok) {
        throw new Error(`Downloading Unsplash photo ${photoId} failed (${image.status})`);
    }

    return sharp(Buffer.from(await image.arrayBuffer()))
        .resize(width, height, { fit: "cover", position: "attention" })
        .jpeg({ quality: 78, mozjpeg: true })
        .toBuffer();
}
