"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

import { brandQrSvg } from "@/lib/qr";

// QR code for a loyalty card. Staff scan it to open /stamp/<code> and add
// a stamp. Rendered in the browser, so a preview can show one too.
export function StampQr({ code }: { code: string }) {
    const [svg, setSvg] = useState("");

    useEffect(() => {
        QRCode.toString(`${window.location.origin}/stamp/${code}`, {
            type: "svg",
            errorCorrectionLevel: "H",
            margin: 1,
            color: { dark: "#17233B", light: "#FFFFFF" },
        })
            .then((markup) => setSvg(brandQrSvg(markup)))
            .catch(() => setSvg(""));
    }, [code]);

    return <span className="block size-full" dangerouslySetInnerHTML={{ __html: svg }} />;
}
