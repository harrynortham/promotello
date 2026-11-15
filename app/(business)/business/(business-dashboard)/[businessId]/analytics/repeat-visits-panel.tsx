import Link from "next/link";
import { FiArrowRight, FiUsers } from "react-icons/fi";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cohort, monthsLabel, repeatVisitSentence, returnRate, type RepeatVisits } from "@/lib/repeat-visits";

// The number no loyalty app can print: first visits Promotello sent,
// and who came back. The maths is in business_repeat_visits() and the
// words are in lib/repeat-visits.ts; this is the panel.

function Figure({ value, label, hint }: { value: number | string; label: string; hint?: string }) {
    return (
        <div className="rounded-xl border border-[#17233B]/10 bg-white px-5 py-4">
            <p className="text-sm text-[#17233B]/70">{label}</p>
            <p className="mt-1 text-3xl font-semibold">{value}</p>
            {hint && <p className="mt-1 text-xs leading-5 text-[#17233B]/55">{hint}</p>}
        </div>
    );
}

export function RepeatVisitsPanel({
    report,
    businessId,
    detailed,
}: {
    report: RepeatVisits | null;
    businessId: string;
    // Everyone sees the numbers: they are the proof, and the business
    // that most needs convincing is the one not paying yet
    // (docs/LAUNCH-FUNNEL.md). Growth buys the month-by-month behind
    // them, which is the part you read once you believe it.
    detailed: boolean;
}) {
    // Who the three numbers are about: the people we sent, or — where
    // we cannot claim any of them — everybody who came in.
    const these = report ? cohort(report) : null;

    return (
        <Card className="mt-8 border-[#17233B]/10">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FiUsers aria-hidden="true" className="size-5 text-[#FF593F]" />
                    First-timers, and who came back
                </CardTitle>
            </CardHeader>

            <CardContent>
                {!report || !these ? (
                    <>
                        <p className="max-w-2xl leading-7 text-[#17233B]/70">
                            How many people came to you for the first time, how many of
                            them found you on Promotello before they walked in, and how
                            many came back. It is the one thing a loyalty app can&apos;t
                            tell you: it was never there for the first visit.
                        </p>

                        <p className="mt-3 max-w-2xl leading-7 text-[#17233B]/55">
                            Nobody has had a first visit through Promotello yet, so there
                            is nothing to count. It fills in on its own.
                        </p>
                    </>
                ) : (
                    <>
                        <p className="max-w-2xl text-lg leading-8">{repeatVisitSentence(report)}</p>

                        <dl className="mt-5 grid gap-4 sm:grid-cols-3">
                            <Figure
                                value={report.newCustomers}
                                label="First visits"
                                hint={`Their first ever visit to you, in ${monthsLabel(report.months)}.`}
                            />
                            <Figure
                                value={report.sentByPromotello}
                                label="Sent by Promotello"
                                hint="They claimed an offer or joined your card before they came in."
                            />
                            {/* Of the people above it: the three numbers
                                are about one set of customers. */}
                            <Figure
                                value={these.returned}
                                label={these.sent ? "Of those, came back" : "Came back"}
                                hint={
                                    returnRate(report) === null
                                        ? "A second visit, whenever it happened."
                                        : `${returnRate(report)}% of them, and ${these.regulars} ${these.regulars === 1 ? "is now a regular" : "are now regulars"}.`
                                }
                            />
                        </dl>

                        {detailed && report.byMonth.length > 1 && (
                            <table className="mt-6 w-full text-sm">
                                <thead>
                                    <tr className="text-left text-[#17233B]/55">
                                        <th scope="col" className="pb-2 font-medium">Month</th>
                                        <th scope="col" className="pb-2 text-right font-medium">First visits</th>
                                        <th scope="col" className="pb-2 text-right font-medium">Sent by us</th>
                                        <th scope="col" className="pb-2 text-right font-medium">Came back</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {report.byMonth.map((month) => (
                                        <tr key={month.month} className="border-t border-[#17233B]/10">
                                            <td className="py-2">
                                                {new Date(month.month).toLocaleDateString("en-GB", {
                                                    month: "long",
                                                    year: "numeric",
                                                    timeZone: "UTC",
                                                })}
                                            </td>
                                            <td className="py-2 text-right font-medium">{month.newCustomers}</td>
                                            <td className="py-2 text-right">{month.sent}</td>
                                            <td className="py-2 text-right">{month.returned}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        {!detailed && report.byMonth.length > 1 && (
                            <Link
                                href={`/business/${businessId}/billing`}
                                className="mt-6 inline-flex items-center gap-1.5 font-medium text-[#FF593F] hover:underline"
                            >
                                See it month by month on Growth
                                <FiArrowRight aria-hidden="true" className="size-4" />
                            </Link>
                        )}

                        <p className="mt-5 text-xs leading-5 text-[#17233B]/55">
                            A visit is a voucher marked used or a loyalty stamp. &ldquo;Sent
                            by Promotello&rdquo; means they claimed an offer or joined your
                            card at least an hour before their first visit — somebody
                            joining at the counter is already in the shop, so they are not
                            counted.
                        </p>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
