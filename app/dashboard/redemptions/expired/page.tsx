import type { Metadata } from "next";

import { StatusVouchersPage } from "../status-page";

export const metadata: Metadata = {
    title: "Expired vouchers",
};

export default function Page() {
    return <StatusVouchersPage status="expired" />;
}
