import {
    CORAL,
    INK,
    QrGlyph,
    StepFrame,
} from "@/components/how-it-works-dialog";

// The step illustrations, shared by the How it works dialogs and the
// getting started guide, so a step looks the same wherever it is shown.

export function OfferWriteArt() {
    return (
        <StepFrame>
            <rect x="16" y="14" width="40" height="44" rx="6" fill="#FFFFFF" stroke={INK} strokeOpacity="0.15" />
            <rect x="16" y="14" width="40" height="16" rx="6" fill={CORAL} fillOpacity="0.18" />
            <rect x="22" y="19" width="16" height="6" rx="3" fill={CORAL} />
            <rect x="22" y="36" width="28" height="3" rx="1.5" fill={INK} fillOpacity="0.3" />
            <rect x="22" y="43" width="22" height="3" rx="1.5" fill={INK} fillOpacity="0.2" />
            <rect x="22" y="50" width="12" height="3" rx="1.5" fill={INK} fillOpacity="0.2" />
        </StepFrame>
    );
}

export function OfferListedArt() {
    return (
        <StepFrame>
            <rect x="21" y="10" width="30" height="52" rx="7" fill="#FFFFFF" stroke={INK} strokeWidth="2.4" />
            <rect x="32" y="14" width="8" height="2" rx="1" fill={INK} fillOpacity="0.3" />
            <rect x="26" y="21" width="20" height="14" rx="3" fill={CORAL} fillOpacity="0.2" />
            <rect x="29" y="25" width="9" height="4" rx="2" fill={CORAL} />
            <rect x="26" y="39" width="20" height="8" rx="3" fill={INK} fillOpacity="0.08" />
            <rect x="29" y="42" width="10" height="2.4" rx="1.2" fill={INK} fillOpacity="0.35" />
            <rect x="26" y="50" width="20" height="8" rx="3" fill={INK} fillOpacity="0.08" />
            <rect x="29" y="53" width="13" height="2.4" rx="1.2" fill={INK} fillOpacity="0.35" />
        </StepFrame>
    );
}

export function LoyaltySetUpArt() {
    return (
        <StepFrame>
            <rect x="14" y="18" width="44" height="36" rx="6" fill="#FFFFFF" stroke={INK} strokeOpacity="0.15" />
            <rect x="14" y="18" width="44" height="11" rx="6" fill={INK} />
            <rect x="20" y="22" width="18" height="3" rx="1.5" fill="#FFFFFF" fillOpacity="0.6" />
            {[0, 1, 2, 3].map((index) => (
                <circle
                    key={index}
                    cx={23 + index * 9}
                    cy={41}
                    r="4.2"
                    fill={index === 0 ? CORAL : "none"}
                    stroke={index === 0 ? CORAL : INK}
                    strokeOpacity={index === 0 ? 1 : 0.25}
                    strokeWidth="1.8"
                />
            ))}
            <rect x="20" y="49" width="20" height="2.6" rx="1.3" fill={INK} fillOpacity="0.2" />
        </StepFrame>
    );
}

export function QrPrintArt() {
    return (
        <StepFrame>
            <rect x="16" y="34" width="40" height="20" rx="5" fill={INK} />
            <rect x="24" y="12" width="24" height="26" rx="4" fill="#FFFFFF" stroke={INK} strokeOpacity="0.15" />
            <rect x="28" y="17" width="10" height="2.6" rx="1.3" fill={CORAL} />
            <QrGlyph x={29} y={22} scale={0.52} />
            <rect x="22" y="44" width="28" height="18" rx="4" fill="#FFFFFF" stroke={INK} strokeWidth="2" />
            <rect x="27" y="50" width="18" height="2.4" rx="1.2" fill={INK} fillOpacity="0.25" />
            <rect x="27" y="55" width="12" height="2.4" rx="1.2" fill={INK} fillOpacity="0.25" />
        </StepFrame>
    );
}

export function RedeemScanArt() {
    return (
        <StepFrame>
            <rect x="11" y="22" width="26" height="28" rx="4" fill="#FFFFFF" stroke={INK} strokeOpacity="0.2" />
            <QrGlyph x={16} y={27} scale={0.56} />
            <rect x="40" y="12" width="24" height="44" rx="7" fill="#FFFFFF" stroke={INK} strokeWidth="2.4" />
            <rect x="48" y="16" width="8" height="2" rx="1" fill={INK} fillOpacity="0.3" />
            <g stroke={CORAL} strokeWidth="2.2" strokeLinecap="round" fill="none">
                <path d="M45 31v-3a2 2 0 0 1 2-2h3" />
                <path d="M59 31v-3a2 2 0 0 0-2-2h-3" />
                <path d="M45 41v3a2 2 0 0 0 2 2h3" />
                <path d="M59 41v3a2 2 0 0 1-2 2h-3" />
            </g>
            <rect x="44" y="35" width="16" height="2.4" rx="1.2" fill={CORAL} />
        </StepFrame>
    );
}

export function RedeemMarkArt() {
    return (
        <StepFrame>
            <rect x="14" y="18" width="44" height="36" rx="6" fill="#FFFFFF" stroke={INK} strokeOpacity="0.15" />
            <rect x="21" y="26" width="22" height="3" rx="1.5" fill={INK} fillOpacity="0.3" />
            <rect x="21" y="34" width="14" height="3" rx="1.5" fill={INK} fillOpacity="0.2" />
            <circle cx="46" cy="44" r="13" fill={CORAL} />
            <path d="M40 44.5l4 4 8-9" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </StepFrame>
    );
}
