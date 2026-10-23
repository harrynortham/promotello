import { redirect } from "next/navigation";

// No customer stories yet; send visitors to the business home page until
// there are real ones to show.
export default function TestimonialsPage() {
    redirect("/business");
}
