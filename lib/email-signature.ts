import { companyDisclosure } from "@/lib/legal";

// Harry's signature, the same one Gmail puts on a letter written by
// hand. Outreach is a person writing to a shop, so the email they get
// from the app should look like the one they would have got from him.
//
// The HTML is the content of marketing/email/signature.html, inlined
// rather than read at run time: a file read from the repo is not
// something a server bundle can be relied on to carry, and this is
// static. The file stays the thing a person edits, and a unit test
// fails if the two drift apart.
// Whose name is on it. The signature prints it in full and the sign-off
// above uses the first name, so they come from here rather than being
// typed twice and drifting.
export const SIGNED_BY = "Harry Northam";

export const SIGNATURE_HTML = `<div
  style="
    font-family: Arial, Helvetica, sans-serif;
    font-size: 14px;
    color: #17233b;
  "
>
  <div style="line-height: 18px">Harry Northam<br />Founder</div>
  <div><br /></div>
  <div>
    <img
      src="https://lh3.googleusercontent.com/d/1Z61OQsd9M19qB7i4gOm_waLL77CJ1HUV"
      width="200"
      height="52"
      alt="Promotello"
      style="width: 200px; height: 52px; display: inline-block"
    />
  </div>
  <div><br /></div>
  <div style="line-height: 18px">
    <b>Promotello</b><br />Local offers, real customers<br /><a
      href="https://www.promotello.com"
      style="text-decoration: none; color: #ff593f"
      ><b>www.promotello.com</b></a
    >
  </div>
  <div><br /></div>
  <div>
    <a
      href="https://www.instagram.com/promotello/"
      style="text-decoration: none"
    >
      <img
        src="https://lh3.googleusercontent.com/d/1sN6_u5XNO3oMw8Wv-WzhZBLlQiwUia4y"
        width="24"
        height="24"
        alt="Instagram"
        style="width: 30px; height: 30px; border: 0; display: inline-block"
      />
    </a>
    &nbsp;
    <a
      href="https://www.facebook.com/promotello/"
      style="text-decoration: none"
    >
      <img
        src="https://lh3.googleusercontent.com/d/1XXYCMpJz_WnleYmDue-RKIxI0wuxmh6e"
        width="24"
        height="24"
        alt="Facebook"
        style="width: 30px; height: 30px; border: 0; display: inline-block"
      />
    </a>
    &nbsp;
    <a href="https://www.x.com/promotello/" style="text-decoration: none">
      <img
        src="https://lh3.googleusercontent.com/d/1-bBUvr4V-5--zDYSNhNY0ycEg7bME6z8"
        width="24"
        height="24"
        alt="X"
        style="width: 30px; height: 30px; border: 0; display: inline-block"
      />
    </a>
    &nbsp;
    <a href="https://www.youtube.com/@promotello" style="text-decoration: none">
      <img
        src="https://lh3.googleusercontent.com/d/1dfpHVWZ3deB7hylC9nLukiUQ6NXvRSam"
        width="24"
        height="24"
        alt="Youtube"
        style="width: 30px; height: 30px; border: 0; display: inline-block"
      />
    </a>
    &nbsp;
    <a href="https://www.tiktok.com/@promotello" style="text-decoration: none">
      <img
        src="https://lh3.googleusercontent.com/d/1dsLLXin1gXLdHrLUO9kO_hAXO0xMOsXI"
        width="24"
        height="24"
        alt="TikTok"
        style="width: 30px; height: 30px; border: 0; display: inline-block"
      />
    </a>
  </div>
  <div><br /></div>
  <div style="font-size: x-small; line-height: 16px">
    Promotello Ltd, registered in England and Wales, company number 17546946.<br />
    Registered office: 71-75 Shelton Street, Covent Garden, London, WC2H 9JQ,
    United Kingdom.
  </div>
</div>`;

// The same thing for the plain-text part, which real mail clients still
// show and which no amount of HTML reaches. Images and social icons do
// not survive the trip, so it says the words instead.
export function signatureText() {
    return [
        SIGNED_BY,
        "Founder",
        "",
        "Promotello — Local offers, real customers",
        "www.promotello.com",
        "",
        companyDisclosure(),
    ].join("\n");
}
