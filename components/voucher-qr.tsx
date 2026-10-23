"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

// QR code for a claimed voucher. Staff scan it with their phone camera to
// open /redeem/<code> and mark the voucher used.
export function VoucherQr({ code, className = "" }: { code: string; className?: string }) {
    const [svg, setSvg] = useState("");

    useEffect(() => {
        QRCode.toString(`${window.location.origin}/redeem/${code}`, {
            type: "svg",
            errorCorrectionLevel: "M",
            margin: 1,
            color: { dark: "#17233B", light: "#FFFFFF" },
        })
            .then(setSvg)
            .catch(() => setSvg(""));
    }, [code]);

    return (
        <div
            role="img"
            aria-label="Voucher QR code for staff to scan"
            className={`rounded-xl bg-white p-2 [&>svg]:h-full [&>svg]:w-full ${className}`}
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    );
}
