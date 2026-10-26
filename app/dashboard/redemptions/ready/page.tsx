import type { Metadata } from "next";

import { StatusVouchersPage } from "../status-page";

export const metadata: Metadata = {
    title: "Vouchers ready to use",
};

export default function Page() {
    return <StatusVouchersPage status="ready" />;
}
