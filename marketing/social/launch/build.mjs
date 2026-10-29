// Builds the launch-pack social graphics as HTML, then renders each one
// to a PNG at the size its platform wants. Run: node marketing/social/launch/build.mjs
// Output: marketing/social/launch/out/*.png (and src/posts.html to preview).
import { chromium } from "@playwright/test";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";

const here = path.dirname(new URL(import.meta.url).pathname);
const root = path.resolve(here, "../../..");
const photo = (name) => `file://${root}/public/images/${name}`;

const svgLogo = fs.readFileSync(`${root}/public/brand/promotello-horizontal-primary.svg`, "utf8");
const svgLogoWhite = fs.readFileSync(`${root}/public/brand/promotello-horizontal-white.svg`, "utf8");
const logo = (width, white = false) =>
    `<div class="logo" style="width:${width}px">${(white ? svgLogoWhite : svgLogo).replace(/<title[^>]*>.*?<\/title>/, "")}</div>`;
// The P mark on its own, cropped from the horizontal logo.
const mark = (size, white = false) =>
    `<div class="logo" style="width:${size}px">${(white ? svgLogoWhite : svgLogo)
        .replace(/<title[^>]*>.*?<\/title>/, "")
        .replace(/viewBox="[^"]*"/, 'viewBox="26 10 306 346"')
        .replace(/ width="\d+" height="\d+"/, "")}</div>`;

const qr = await QRCode.toString("https://www.promotello.com/business/demo", {
    type: "svg",
    margin: 0,
    color: { dark: "#17233B", light: "#0000" },
});

const NAVY = "#17233B";
const CORAL = "#FF593F";
const CREAM = "#FFF8F0";

const check = (size = 34, colour = "#fff") =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${colour}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;
const gift = (size = 34, colour = CORAL) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${colour}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/></svg>`;

// ---------------------------------------------------------------------------
// Product mock-ups
// ---------------------------------------------------------------------------

function loyaltyCard(stamps = 6, scale = 1) {
    const dots = Array.from({ length: 10 }, (_, i) =>
        i === 9
            ? `<div class="stamp reward">${gift(36 * scale)}</div>`
            : i < stamps
              ? `<div class="stamp done">${check(32 * scale)}</div>`
              : `<div class="stamp"></div>`,
    ).join("");
    return `<div class="card loyalty" style="--s:${scale}">
        <p class="eyebrow">Harbour Grind coffee card</p>
        <p class="card-title">Buy 9 coffees, get the 10th free</p>
        <div class="stamps">${dots}</div>
        <p class="muted">${stamps} of 9 stamps</p>
    </div>`;
}

function voucher() {
    return `<div class="card voucher">
        <p class="eyebrow">Your voucher · Harbour Grind</p>
        <p class="card-title">Free pastry with your coffee</p>
        <div class="qr">${qr}</div>
        <p class="code">HG7K 2M4P</p>
        <p class="muted">Show this at the till</p>
    </div>`;
}

function poster(width = 520) {
    return `<div class="poster" style="width:${width}px">
        ${logo(width * 0.42)}
        <p class="poster-title">Scan for a free pastry with your coffee</p>
        <div class="qr">${qr}</div>
        <p class="muted">Harbour Grind · on Promotello</p>
    </div>`;
}

function scanned() {
    return `<div class="card scanned">
        <div class="scan-frame"><div class="qr">${qr}</div><div class="scan-line"></div></div>
        <div class="toast-ok">${check(30)} <span>Stamp added: 7 of 9</span></div>
    </div>`;
}

function emailPreview() {
    return `<div class="card email">
        <p class="muted small">From: Harbour Grind via Promotello</p>
        <p class="card-title small-title">New offer: two for one on Monday afternoons</p>
        <p class="muted">You follow Harbour Grind, so you're the first to hear…</p>
    </div>`;
}

const toast = (title, detail) => `<div class="toast"><div class="toast-dot">${gift(30, "#fff")}</div><div><p class="toast-title">${title}</p><p class="muted small">${detail}</p></div></div>`;

const phone = (content, width = 470) => `<div class="phone" style="width:${width}px"><div class="phone-screen">${content}</div></div>`;

const pills = (items, dark = false) =>
    `<div class="pills">${items.map((item) => `<span class="pill ${dark ? "dark" : ""}">${check(26, CORAL)} ${item}</span>`).join("")}</div>`;

const url = (dark = false) => `<p class="url ${dark ? "dark" : ""}">promotello.com/business</p>`;

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

const frames = [];
const add = (name, width, height, html, cls = "") => frames.push({ name, width, height, html, cls });

const SIZES = {
    feed: [1080, 1350], // Instagram and Facebook feed, carousels, LinkedIn
    wide: [1600, 900], // X and Facebook link posts
    story: [1080, 1920], // Stories, Reels, TikTok and Shorts covers
};

// 1. Introduction ------------------------------------------------------------

add(
    "01-intro-feed",
    ...SIZES.feed,
    `<div class="pad col">
        ${logo(300)}
        <p class="eyebrow big-gap">For independent local businesses</p>
        <h1>Turn first-time visitors into <span class="coral">regulars.</span></h1>
        <p class="lede">Loyalty cards, QR posters and offers your customers claim on their phone.</p>
        ${pills(["Free to start", "No app to download", "No hardware"])}
        <div class="photo-stack">
            <div class="photo" style="background-image:url(${photo("marketing/harbour-grind-cafe.jpg")})"></div>
            <div class="stack-phone">${phone(loyaltyCard(6, 0.82), 380)}</div>
        </div>
    </div>`,
);

add(
    "01-intro-wide",
    ...SIZES.wide,
    `<div class="split">
        <div class="pad col center-y" style="width:56%">
            ${logo(260)}
            <h1 class="wide-h1 big-gap">Turn first-time visitors into <span class="coral">regulars.</span></h1>
            <p class="lede">Loyalty cards, QR posters and offers your customers claim on their phone.</p>
            ${pills(["Free to start", "Set up in 15 minutes"])}
        </div>
        <div class="photo side" style="background-image:url(${photo("marketing/harbour-grind-cafe.jpg")})">
            <div class="side-phone">${phone(loyaltyCard(6, 0.82), 380)}</div>
        </div>
    </div>`,
);

add(
    "01-intro-story",
    ...SIZES.story,
    `<div class="pad col story-pad">
        ${logo(320)}
        <h1 class="story-h1 big-gap">Turn first-time visitors into <span class="coral">regulars.</span></h1>
        <p class="lede">Loyalty cards, QR posters and offers your customers claim on their phone.</p>
        ${pills(["Free to start", "No app to download"])}
        <div class="story-visual">
            <div class="photo rounded" style="background-image:url(${photo("marketing/harbour-grind-cafe.jpg")})"></div>
            <div class="story-phone">${phone(loyaltyCard(6, 0.85), 400)}</div>
        </div>
        ${url()}
    </div>`,
);

// 2. How it works carousel ---------------------------------------------------

const step = (n, title, body, visual) => `<div class="pad col">
    <div class="step-head"><span class="step-n">${n}</span><span class="muted">of 4</span></div>
    <h2>${title}</h2>
    <p class="lede">${body}</p>
    <div class="visual">${visual}</div>
    <div class="foot">${logo(220)}<span class="muted">Swipe →</span></div>
</div>`;

add(
    "02-how-1-cover",
    ...SIZES.feed,
    `<div class="pad col">
        ${logo(260, true)}
        <p class="eyebrow big-gap">How Promotello works</p>
        <h1 class="cover-h1">From first visit to regular, in four steps.</h1>
        <div class="cover-cards">${toast("Jo claimed your free pastry offer", "2 min ago")}${toast("Sam earned a free coffee", "Just now")}</div>
        <div class="foot"><span></span><span class="swipe">Swipe →</span></div>
    </div>`,
    "dark",
);
add("02-how-2", ...SIZES.feed, step(1, "Put up your poster.", "Print a QR poster for your window, your till or your tables. Each one counts its own scans.", poster(500)));
add("02-how-3", ...SIZES.feed, step(2, "Customers claim on their phone.", "They scan, sign up in seconds and get their own voucher. No app to download.", phone(voucher(), 440)));
add("02-how-4", ...SIZES.feed, step(3, "Staff scan at the till.", "Your team uses their own phone camera. No card reader, no training, and nobody can stamp their own card.", phone(scanned(), 440)));
add(
    "02-how-5",
    ...SIZES.feed,
    step(4, "They keep coming back.", "A loyalty card that lives on their phone, and an email to followers whenever you post a new offer.", `<div class="duo">${loyaltyCard(7, 0.8)}${emailPreview()}</div>`),
);
add(
    "02-how-6-cta",
    ...SIZES.feed,
    `<div class="pad col">
        ${logo(260, true)}
        <h1 class="cover-h1 big-gap">Free to start.<br><span class="coral">Live in 15 minutes.</span></h1>
        ${pills(["Free plan with no time limit", "30-day free trial on Pro", "Cancel any time"], true)}
        <div class="cta-block"><span class="button">Start free</span>${url(true)}</div>
    </div>`,
    "dark",
);

// 3. Loyalty card feature ----------------------------------------------------

add(
    "03-loyalty-feed",
    ...SIZES.feed,
    `<div class="pad col">
        <p class="eyebrow">Digital loyalty cards</p>
        <h1 class="mid-h1">The stamp card that never gets lost in a coat pocket.</h1>
        <div class="visual">${phone(loyaltyCard(6), 480)}</div>
        <div class="foot">${logo(220)}${url()}</div>
    </div>`,
);
add(
    "03-loyalty-wide",
    ...SIZES.wide,
    `<div class="split">
        <div class="pad col center-y" style="width:58%">
            <p class="eyebrow">Digital loyalty cards</p>
            <h1 class="wide-h1">The stamp card that never gets lost in a coat pocket.</h1>
            <p class="lede">Customers keep it on their phone. Staff stamp it by scanning, so nobody can stamp their own.</p>
            <div class="foot-inline">${logo(200)}</div>
        </div>
        <div class="side-plain">${phone(loyaltyCard(6, 0.85), 400)}</div>
    </div>`,
);

// 4. Ideas carousel ----------------------------------------------------------

const ideas = [
    ["Cafés and bakeries", "Buy 9 coffees, get the 10th free", "marketing/pastry-counter.jpg", ["Loyalty card"]],
    ["Hair and barbers", "Your 6th cut half price", "marketing/barber.jpg", ["Loyalty card"]],
    ["Pubs and bars", "A free drink for new followers on quiz night", "marketing/pub.jpg", ["Offer", "Follower email"]],
    ["Restaurants", "Two courses for £15, Monday to Wednesday, 5 to 7pm", "marketing/pizza.jpg", ["Quiet-hours offer"]],
    ["Fitness, yoga and classes", "First class free, then a stamp every visit", "marketing/yoga.jpg", ["Offer", "Loyalty card"]],
    ["Beauty, nails and spas", "10% off a first treatment, and a birthday treat", "marketing/beauty.jpg", ["Offer", "Birthday email"]],
    ["Pets, services and repairs", "Every 5th groom free", "marketing/dog-grooming.jpg", ["Loyalty card"]],
];

add(
    "04-ideas-0-cover",
    ...SIZES.feed,
    `<div class="pad col">
        ${logo(260, true)}
        <p class="eyebrow big-gap">Loyalty and offer ideas</p>
        <h1 class="cover-h1">One idea for every kind of local business.</h1>
        <p class="lede light">Steal one for yours. Each takes about a minute to set up.</p>
        <div class="foot"><span></span><span class="swipe">Swipe →</span></div>
    </div>`,
    "dark",
);
ideas.forEach(([type, example, img, tools], i) =>
    add(
        `04-ideas-${i + 1}`,
        ...SIZES.feed,
        `<div class="idea-photo" style="background-image:url(${photo(img)})"><span class="idea-n">${i + 1}/${ideas.length}</span></div>
        <div class="pad col idea-body">
            <p class="eyebrow">${type}</p>
            <p class="idea-quote">“${example}”</p>
            <div class="tools"><span class="muted">Set it up as:</span>${tools.map((t) => `<span class="tool">${t}</span>`).join("")}</div>
            <div class="foot">${logo(200)}<span class="muted">Swipe →</span></div>
        </div>`,
    ),
);
add(
    `04-ideas-${ideas.length + 1}-cta`,
    ...SIZES.feed,
    `<div class="pad col">
        ${logo(260, true)}
        <h1 class="cover-h1 big-gap">Set up yours in 15 minutes.</h1>
        <p class="lede light">Offers and loyalty cards your customers keep on their phone. Free to start.</p>
        <div class="cta-block"><span class="button">Start free</span>${url(true)}</div>
    </div>`,
    "dark",
);

// 5. Founding member offer ---------------------------------------------------

const founding = (layout) => `
    <p class="eyebrow">Founding member price</p>
    <p class="price"><span class="coral">£19</span><span class="per">/month</span></p>
    <p class="locked">Locked in for as long as you stay subscribed.</p>
    <p class="lede light">For the first 50 businesses on Pro (usually £24). Starts with a 30-day free trial, and you can cancel any time.</p>
    ${layout === "wide" ? "" : `<ul class="features">${["Unlimited offers", "Digital loyalty cards", "A QR poster for every spot", "Followers emailed about every new offer"].map((f) => `<li>${check(30, CORAL)} ${f}</li>`).join("")}</ul>`}`;

add("05-founding-feed", ...SIZES.feed, `<div class="pad col">${logo(260, true)}<div class="big-gap">${founding("feed")}</div><div class="cta-block"><span class="button">Claim a founding place</span>${url(true)}</div></div>`, "dark");
add("05-founding-wide", ...SIZES.wide, `<div class="split"><div class="pad col center-y" style="width:64%">${logo(240, true)}<div class="big-gap">${founding("wide")}</div><div class="cta-row"><span class="button">Claim a founding place</span></div></div><div class="side-plain">${phone(loyaltyCard(6, 0.8), 380)}</div></div>`, "dark");
add("05-founding-story", ...SIZES.story, `<div class="pad col story-pad">${logo(320, true)}<div class="big-gap">${founding("story")}</div><div class="cta-block"><span class="button">Claim a founding place</span>${url(true)}</div></div>`, "dark");

// 6. Video covers and YouTube thumbnail -------------------------------------

const cover = (kicker, title, visual, dark = false) => `<div class="pad col story-pad">
    <p class="eyebrow">${kicker}</p>
    <h1 class="story-h1">${title}</h1>
    <div class="cover-visual">${visual}</div>
    ${logo(260, dark)}
</div>`;

add("06-video-1-cover", ...SIZES.story, cover("Paper vs phone", "Your paper stamp cards are <span class='coral'>in the wash.</span>", phone(loyaltyCard(6), 600)));
add("06-video-2-cover", ...SIZES.story, cover("Set-up in real time", "A digital loyalty card in <span class='coral'>15 minutes.</span>", poster(720), true), "dark");
add(
    "06-video-3-cover",
    ...SIZES.story,
    cover(
        "Quiet hours",
        "3 offers to fill your <span class='coral'>quiet afternoons.</span>",
        `<div class="photo rounded tall" style="background-image:url(${photo("marketing/harbour-grind-beans.jpg")})"></div>`,
    ),
);
add(
    "06-youtube-thumbnail",
    1280,
    720,
    `<div class="split">
        <div class="pad col center-y yt" style="width:62%">
            <h1 class="yt-h1">Digital loyalty card in <span class="coral">15 minutes</span></h1>
            ${logo(220, true)}
        </div>
        <div class="side-plain yt-phone">${phone(loyaltyCard(7, 0.72), 420)}</div>
    </div>`,
    "dark",
);

// 7. Profile images ----------------------------------------------------------

add("07-avatar", 1080, 1080, `<div class="avatar">${mark(560, true)}</div>`, "coral-bg");
// Cover photos. One design at 1546×423 (YouTube's always-visible area),
// scaled into the part of each platform's cover that's never cropped or
// covered by the profile picture.
const coverDesign = `<div class="cover-design">
    <div class="cover-circle"></div>
    <div class="cover-copy">
        ${logo(300)}
        <p class="cover-line">Turn first-time visitors into <span class="coral">regulars.</span></p>
        <p class="cover-sub">Loyalty cards, offers and QR posters for independent businesses. Free to start.</p>
    </div>
    <div class="cover-collage">
        <div class="collage-poster">${poster(300)}</div>
        <div class="collage-card">${loyaltyCard(6, 0.8)}</div>
        <div class="collage-toast">${toast("Jo claimed your free pastry offer", "2 min ago")}</div>
    </div>
</div>`;
// safe: the box (x, y, width) the design is scaled into.
const coverPhoto = (name, width, height, [x, y, safeWidth]) =>
    add(name, width, height, `<div class="cover-dots"></div><div class="cover-safe" style="left:${x}px;top:${y}px;transform:scale(${safeWidth / 1546})">${coverDesign}</div>`);
// X: the profile picture covers the bottom-left and phones crop the top and bottom.
coverPhoto("07-cover-x", 1500, 500, [300, 95, 1120]);
// Facebook: phones show only the middle of the cover.
coverPhoto("07-cover-facebook", 1640, 624, [255, 155, 1130]);
// YouTube: only the middle 1546×423 shows on every device.
coverPhoto("07-cover-youtube", 2560, 1440, [507, 508, 1546]);

// Apple Business Connect cover: 1600×1040 minimum at 1.54:1. Maps shows only
// a 2.5:1 band across the middle, so everything sits in that band. Apple
// rejects promotional text, so it's the product on its own, no slogan.
add(
    "07-cover-apple",
    1600,
    1040,
    `<div class="cover-dots"></div><div class="apple-cover">
        <div class="apple-circle"></div>
        <div class="apple-poster">${poster(300)}</div>
        <div class="apple-card">${loyaltyCard(6, 0.8)}</div>
        <div class="apple-toast">${toast("Jo claimed your free pastry offer", "2 min ago")}</div>
    </div>`,
);

// Instagram story highlight covers (shown as a circle).
const icons = {
    start: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    loyalty: '<circle cx="12" cy="8" r="6"/><path d="M8.2 13.4 7 22l5-3 5 3-1.2-8.6"/>',
    offers: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
    posters: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 17h3v3h-3z"/>',
    pricing: '<path d="M17 5.5A5 5 0 0 0 9 9.5V20M6 13h8M6 20h12"/>',
    faq: '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>',
};
Object.entries(icons).forEach(([key, path]) =>
    add(
        `08-highlight-${key}`,
        1080,
        1920,
        `<div class="highlight"><svg width="420" height="420" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${path}</svg></div>`,
        "coral-bg",
    ),
);

// ---------------------------------------------------------------------------
// Styles and rendering
// ---------------------------------------------------------------------------

const css = `
* { box-sizing: border-box; margin: 0; }
body { background: #ccc; font-family: 'Plus Jakarta Sans', sans-serif; color: ${NAVY}; }
.frame { position: relative; overflow: hidden; background: ${CREAM}; margin: 40px; }
.frame.dark { background: ${NAVY}; color: #fff; }
.frame.coral-bg { background: ${CORAL}; }
.logo svg { display: block; width: 100%; height: auto; }
.pad { padding: 88px; height: 100%; }
.story-pad { padding: 150px 90px 170px; }
.col { display: flex; flex-direction: column; }
.center-y { justify-content: center; }
.big-gap { margin-top: 72px; }
.coral { color: ${CORAL}; }
.eyebrow { color: ${CORAL}; font-weight: 700; font-size: 30px; letter-spacing: .06em; text-transform: uppercase; }
h1 { font-size: 92px; line-height: 1.04; letter-spacing: -.035em; font-weight: 800; margin-top: 22px; }
h2 { font-size: 76px; line-height: 1.06; letter-spacing: -.03em; font-weight: 800; margin-top: 28px; }
.wide-h1 { font-size: 80px; }
.mid-h1 { font-size: 80px; }
.story-h1 { font-size: 104px; }
.cover-h1 { font-size: 100px; }
.yt-h1 { font-size: 92px; margin: 0 0 48px; }
.lede { font-size: 36px; line-height: 1.4; color: #45506a; margin-top: 28px; font-weight: 500; }
.dark .lede, .lede.light { color: #c9cfdb; }
.muted { color: #6b7387; font-size: 26px; font-weight: 500; }
.dark .muted { color: #c9cfdb; }
.dark .card .muted, .dark .poster .muted, .dark .phone .muted { color: #6b7387; }
.small { font-size: 22px; }
.pills { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 36px; }
.pill { display: inline-flex; align-items: center; gap: 10px; background: #fff; border: 2px solid #f0e4d6; border-radius: 999px; padding: 14px 26px 14px 20px; font-size: 27px; font-weight: 700; }
.pill.dark { background: rgba(255,255,255,.08); border-color: rgba(255,255,255,.14); color: #fff; }
.url { font-size: 30px; font-weight: 700; margin-top: 28px; }
.url.dark { color: #fff; }
.foot { margin-top: auto; display: flex; justify-content: space-between; align-items: center; }
.foot .url { margin: 0; }
.foot-inline { margin-top: 56px; }
.swipe { font-size: 30px; font-weight: 700; color: ${CORAL}; }
.button { display: inline-block; background: ${CORAL}; color: #fff; font-weight: 800; font-size: 38px; padding: 30px 56px; border-radius: 999px; }
.cta-block { margin-top: auto; display: flex; flex-direction: column; align-items: flex-start; gap: 4px; }
.cta-row { margin-top: 56px; display: flex; align-items: center; gap: 40px; }
.cta-row .url { margin: 0; }

.photo { background-size: cover; background-position: center; }
.photo.rounded { border-radius: 40px; }
.photo-stack { position: relative; margin-top: auto; height: 560px; }
.photo-stack .photo { position: absolute; inset: 60px 230px 0 0; border-radius: 36px; }
.stack-phone { position: absolute; right: 0; bottom: -170px; }
.split { display: flex; height: 100%; }
.photo.side { flex: 1; position: relative; }
.side-phone { position: absolute; left: -40px; top: 130px; }
.side-plain { flex: 1; display: flex; align-items: center; justify-content: center; padding-top: 140px; }
.story-visual { position: relative; margin-top: 64px; height: 760px; }
.story-visual .photo { position: absolute; inset: 0 180px 120px 0; }
.story-phone { position: absolute; right: 0; top: 60px; }
.cover-visual { margin: 80px 0 auto; display: flex; justify-content: center; }
.cover-visual .poster-title { font-size: 58px; }
.cover-visual .loyalty .card-title { font-size: 46px; }
.cover-visual .loyalty .eyebrow { font-size: 26px; }
.photo.tall { width: 100%; height: 900px; }

.phone { background: ${NAVY}; border-radius: 64px; padding: 16px; box-shadow: 0 40px 80px rgba(23,35,59,.25); }
.dark .phone { background: #0b1222; box-shadow: 0 40px 80px rgba(0,0,0,.4); border: 2px solid rgba(255,255,255,.12); }
.phone-screen { background: ${CREAM}; border-radius: 50px; padding: 70px 24px 80px; color: ${NAVY}; }
.card { background: #fff; border: 2px solid #efe6db; border-radius: 34px; padding: 34px; color: ${NAVY}; }
.card .eyebrow { font-size: 21px; letter-spacing: .04em; }
.card-title { font-size: 36px; font-weight: 800; line-height: 1.18; margin-top: 12px; letter-spacing: -.02em; }
.small-title { font-size: 30px; }
.loyalty { font-size: calc(var(--s) * 1px); }
.stamps { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; margin: 28px 0 22px; }
.stamp { aspect-ratio: 1; border-radius: 50%; border: 3px dashed #e3d7c8; display: flex; align-items: center; justify-content: center; }
.stamp.done { background: ${CORAL}; border: none; }
.stamp.reward { border: 3px solid ${CORAL}; background: #fff1ec; }
.voucher { text-align: center; }
.voucher .qr { width: 260px; margin: 30px auto 20px; }
.qr svg { display: block; width: 100%; height: auto; }
.code { font-family: ui-monospace, Menlo, monospace; font-size: 34px; font-weight: 700; letter-spacing: .12em; margin-bottom: 8px; }
.poster { background: #fff; border-radius: 30px; padding: 48px 44px; text-align: center; box-shadow: 0 30px 70px rgba(23,35,59,.18); color: ${NAVY}; margin: 0 auto; }
.poster .logo { margin: 0 auto; }
.poster-title { font-size: 44px; font-weight: 800; line-height: 1.12; letter-spacing: -.02em; margin: 30px 0; }
.poster .qr { width: 62%; margin: 0 auto 26px; }
.scanned { padding: 26px; }
.scan-frame { position: relative; background: #e9e3da; border-radius: 26px; padding: 70px; }
.scan-frame .qr { opacity: .85; }
.scan-line { position: absolute; left: 40px; right: 40px; top: 50%; height: 5px; background: ${CORAL}; box-shadow: 0 0 22px ${CORAL}; border-radius: 4px; }
.toast-ok { margin-top: 22px; background: #0f7a4a; color: #fff; border-radius: 20px; padding: 22px 24px; font-size: 26px; font-weight: 700; display: flex; align-items: center; gap: 12px; white-space: nowrap; }
.email { margin-top: 18px; }
.duo { width: 640px; }
.duo .email { margin-left: 100px; margin-top: -24px; position: relative; box-shadow: 0 30px 60px rgba(23,35,59,.16); }
.toast { display: flex; gap: 22px; align-items: center; background: #fff; color: ${NAVY}; border-radius: 28px; padding: 28px 32px; box-shadow: 0 30px 60px rgba(0,0,0,.25); }
.toast .muted { color: #6b7387; }
.toast-dot { width: 64px; height: 64px; border-radius: 50%; background: ${CORAL}; display: flex; align-items: center; justify-content: center; flex: none; }
.toast-title { font-size: 30px; font-weight: 800; }
.cover-cards { margin-top: auto; margin-bottom: 70px; display: flex; flex-direction: column; gap: 22px; width: 760px; }
.cover-cards .toast:last-child { margin-left: 120px; }
.visual { flex: 1; display: flex; align-items: center; justify-content: center; margin: 40px 0; min-height: 0; }
.step-head { display: flex; align-items: baseline; gap: 16px; }
.step-n { width: 84px; height: 84px; border-radius: 50%; background: ${CORAL}; color: #fff; font-size: 44px; font-weight: 800; display: flex; align-items: center; justify-content: center; }
.idea-photo { height: 760px; background-size: cover; background-position: center; position: relative; }
.idea-n { position: absolute; top: 40px; right: 40px; background: rgba(23,35,59,.8); color: #fff; font-weight: 700; font-size: 26px; padding: 10px 22px; border-radius: 999px; }
.idea-body { height: 590px; padding-top: 64px; }
.idea-quote { font-size: 64px; font-weight: 800; line-height: 1.1; letter-spacing: -.03em; margin-top: 20px; }
.tools { display: flex; gap: 12px; align-items: center; margin-top: 30px; flex-wrap: wrap; }
.tool { background: #fff1ec; color: #c43a22; font-weight: 700; font-size: 26px; padding: 10px 22px; border-radius: 999px; }
.price { font-size: 220px; font-weight: 800; letter-spacing: -.05em; line-height: 1; margin-top: 18px; }
.per { font-size: 64px; letter-spacing: -.02em; color: #fff; margin-left: 10px; }
.locked { font-size: 40px; font-weight: 700; margin-top: 12px; }
.features { list-style: none; padding: 0; margin-top: 48px; display: grid; gap: 22px; }
.features li { font-size: 34px; font-weight: 600; display: flex; gap: 18px; align-items: center; }
.yt .coral { display: inline; }
.yt-phone { align-items: flex-start; padding-top: 90px; }
.avatar { height: 100%; display: flex; align-items: center; justify-content: center; }
.cover-dots { position: absolute; inset: 0; background-image: radial-gradient(#ecdccb 3px, transparent 3.5px); background-size: 44px 44px; opacity: .7; }
.cover-safe { position: absolute; width: 1546px; height: 423px; transform-origin: top left; }
.cover-design { position: relative; width: 100%; height: 100%; display: flex; align-items: center; }
.cover-circle { position: absolute; right: -60px; top: 50%; width: 760px; height: 760px; margin-top: -380px; border-radius: 50%; background: ${CORAL}; }
.cover-copy { position: relative; width: 800px; }
.cover-line { font-size: 70px; font-weight: 800; letter-spacing: -.035em; line-height: 1.05; margin-top: 30px; }
.cover-sub { font-size: 28px; font-weight: 500; color: #45506a; margin-top: 18px; line-height: 1.4; max-width: 700px; }
.cover-collage { position: relative; flex: 1; height: 100%; }
.collage-poster { position: absolute; left: 10px; top: -10px; transform: rotate(-7deg) scale(.82); transform-origin: top left; }
.collage-poster .poster-title { font-size: 26px; margin: 16px 0; }
.collage-poster .muted { display: none; }
.collage-card { position: absolute; left: 250px; top: -30px; width: 470px; transform: rotate(4deg); box-shadow: 0 30px 60px rgba(23,35,59,.25); border-radius: 34px; }
.collage-toast { position: absolute; left: 0; bottom: -40px; width: 520px; }
.collage-toast .toast { padding: 20px 24px; }
.collage-toast .toast-title { font-size: 24px; }
.apple-cover { position: absolute; left: 0; top: 0; width: 1600px; height: 1040px; }
.apple-circle { position: absolute; left: 520px; top: 200px; width: 640px; height: 640px; border-radius: 50%; background: ${CORAL}; }
.apple-poster { position: absolute; left: 330px; top: 250px; transform: rotate(-7deg) scale(.85); transform-origin: top left; }
.apple-poster .poster-title { font-size: 26px; margin: 16px 0; }
.apple-poster .muted { display: none; }
.apple-card { position: absolute; left: 640px; top: 290px; width: 470px; transform: rotate(4deg); box-shadow: 0 30px 60px rgba(23,35,59,.25); border-radius: 34px; }
.apple-toast { position: absolute; left: 860px; top: 650px; width: 470px; }
.apple-toast .toast { padding: 20px 24px; }
.apple-toast .toast-title { font-size: 24px; }
.highlight { height: 100%; display: flex; align-items: center; justify-content: center; }
`;

const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=block" rel="stylesheet">
<style>${css}</style></head><body>
${frames.map((f) => `<section class="frame ${f.cls}" data-name="${f.name}" style="width:${f.width}px;height:${f.height}px">${f.html}</section>`).join("\n")}
</body></html>`;

fs.mkdirSync(`${here}/src`, { recursive: true });
fs.mkdirSync(`${here}/out`, { recursive: true });
fs.writeFileSync(`${here}/src/posts.html`, html);

const only = process.argv[2];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 2700, height: 1600 } });
await page.goto(`file://${here}/src/posts.html`, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);

for (const frame of frames) {
    if (only && !frame.name.startsWith(only)) continue;
    await page.locator(`[data-name="${frame.name}"]`).screenshot({ path: `${here}/out/${frame.name}.png` });
}
await browser.close();
console.log(`Rendered ${only ? frames.filter((f) => f.name.startsWith(only)).length : frames.length} images to ${path.relative(root, here)}/out`);
