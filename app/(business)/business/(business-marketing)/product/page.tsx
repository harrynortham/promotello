import { permanentRedirect } from "next/navigation";

// Old link: the product tour lives on the features page.
export default function ProductPage() {
    permanentRedirect("/business/features");
}
