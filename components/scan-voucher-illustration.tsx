// A phone scanning the QR code on a customer's voucher, for the
// redemptions page. Decorative: the QR pattern isn't a real code.
export function ScanVoucherIllustration({ className = "" }: { className?: string }) {
    const ink = "#17233B";
    const coral = "#FF593F";

    return (
        <svg
            viewBox="0 0 164 148"
            role="img"
            aria-label="A phone camera scanning the QR code on a customer's voucher"
            className={className}
        >
            {/* The customer's voucher, held behind the phone. */}
            <g transform="rotate(-8 44 74)">
                <rect x="10" y="30" width="72" height="92" rx="10" fill="#FFF8F0" stroke={ink} strokeOpacity="0.15" />
                <rect x="22" y="42" width="34" height="5" rx="2.5" fill={ink} fillOpacity="0.25" />
                <rect x="22" y="53" width="22" height="5" rx="2.5" fill={coral} fillOpacity="0.45" />

                {/* QR glyph: three finders and a scattering of modules. */}
                <g transform="translate(22 68)">
                    <rect width="48" height="48" rx="4" fill="#FFFFFF" stroke={ink} strokeOpacity="0.12" />
                    {[
                        [5, 5],
                        [32, 5],
                        [5, 32],
                    ].map(([x, y]) => (
                        <g key={`${x}-${y}`}>
                            <rect x={x} y={y} width="11" height="11" rx="2" fill="none" stroke={ink} strokeWidth="2.5" />
                            <rect x={x + 4} y={y + 4} width="3" height="3" fill={ink} />
                        </g>
                    ))}
                    {[
                        [21, 7],
                        [25, 11],
                        [21, 15],
                        [7, 21],
                        [11, 25],
                        [21, 25],
                        [29, 21],
                        [36, 25],
                        [40, 21],
                        [21, 33],
                        [25, 29],
                        [29, 36],
                        [36, 33],
                        [40, 40],
                        [25, 40],
                        [32, 40],
                    ].map(([x, y]) => (
                        <rect key={`${x}-${y}`} x={x} y={y} width="3.4" height="3.4" fill={ink} fillOpacity="0.8" />
                    ))}
                </g>
            </g>

            {/* The phone, held over it. */}
            <g transform="rotate(6 112 74)">
                <rect x="78" y="14" width="74" height="120" rx="14" fill="#FFFFFF" stroke={ink} strokeWidth="2.5" />
                <rect x="104" y="21" width="22" height="4" rx="2" fill={ink} fillOpacity="0.35" />
                <rect x="86" y="32" width="58" height="94" rx="8" fill={ink} fillOpacity="0.04" />

                {/* Viewfinder brackets around what the camera sees. */}
                <g stroke={coral} strokeWidth="3" strokeLinecap="round" fill="none">
                    <path d="M96 56v-8a4 4 0 0 1 4-4h8" />
                    <path d="M134 56v-8a4 4 0 0 0-4-4h-8" />
                    <path d="M96 96v8a4 4 0 0 0 4 4h8" />
                    <path d="M134 96v8a4 4 0 0 1-4 4h-8" />
                </g>

                {/* The scan line. */}
                <rect x="94" y="74" width="42" height="3" rx="1.5" fill={coral} />
                <rect x="94" y="68" width="42" height="14" rx="4" fill={coral} fillOpacity="0.12" />
            </g>

            {/* A tick: the voucher is recognised. */}
            <g transform="translate(133 110)">
                <circle cx="14" cy="14" r="14" fill={coral} />
                <path d="M8 14.5l4 4L20 10" stroke="#FFFFFF" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </g>
        </svg>
    );
}
