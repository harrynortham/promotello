import type { Metadata } from "next";

import { StatusVouchersPage } from "../status-page";

export const metadata: Metadata = {
    title: "Used vouchers",
};

export default function Page() {
    return <StatusVouchersPage status="used" />;
}
