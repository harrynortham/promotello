import type Stripe from "stripe";
import { createStripeClient } from "@/utils/stripe/server";
import { createAdminClient } from "@/utils/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export async function POST(request: Request) {
  const stripe = createStripeClient();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing Stripe signature", { status: 400 });
  }

  // Signature verification needs the raw, unparsed body.
  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch {
    return new Response("Invalid Stripe signature", { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: alreadyProcessed, error: lookupError } = await supabase
    .from("stripe_events")
    .select("id")
    .eq("id", event.id)
    .maybeSingle();

  if (lookupError) {
    console.error("Stripe webhook: event lookup failed", lookupError);
    return new Response("Database error", { status: 500 });
  }

  if (alreadyProcessed) {
    return new Response("Already processed", { status: 200 });
  }

  try {
    await handleEvent(stripe, supabase, event);
  } catch (error) {
    // A non-2xx response makes Stripe retry the event with backoff.
    console.error(`Stripe webhook: failed to handle ${event.type} (${event.id})`, error);
    return new Response("Webhook handler failed", { status: 500 });
  }

  // Recorded only after handling succeeds, so a failed attempt is retried.
  const { error: recordError } = await supabase
    .from("stripe_events")
    .upsert({ id: event.id, type: event.type }, { ignoreDuplicates: true });

  if (recordError) {
    console.error("Stripe webhook: failed to record event", recordError);
  }

  return new Response("ok", { status: 200 });
}

async function handleEvent(
  stripe: Stripe,
  supabase: AdminClient,
  event: Stripe.Event,
) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.mode === "subscription" && session.subscription) {
        await syncSubscription(stripe, supabase, idOf(session.subscription));
      }
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await syncSubscription(stripe, supabase, event.data.object.id);
      break;

    case "invoice.paid":
    case "invoice.payment_failed": {
      const subscription =
        event.data.object.parent?.subscription_details?.subscription;
      if (subscription) {
        await syncSubscription(stripe, supabase, idOf(subscription));
      }
      break;
    }
  }
}

// Always re-fetches the subscription from Stripe rather than trusting the
// event payload, so events arriving out of order can't leave stale state.
async function syncSubscription(
  stripe: Stripe,
  supabase: AdminClient,
  subscriptionId: string,
) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const customerId = idOf(subscription.customer);

  const { data: customer, error: customerError } = await supabase
    .from("billing_customers")
    .select("business_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (customerError) {
    throw customerError;
  }

  if (!customer) {
    // Not one of ours (e.g. created by `stripe trigger`). Retrying won't help.
    console.warn(
      `Stripe webhook: no business for customer ${customerId}, skipping subscription ${subscription.id}`,
    );
    return;
  }

  const item = subscription.items.data[0];

  const { error } = await supabase.from("subscriptions").upsert(
    {
      business_id: customer.business_id,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: customerId,
      status: subscription.status,
      price_id: item?.price.id ?? null,
      current_period_end: toTimestamp(item?.current_period_end),
      cancel_at_period_end: subscription.cancel_at_period_end,
      trial_end: toTimestamp(subscription.trial_end),
      canceled_at: toTimestamp(subscription.canceled_at),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" },
  );

  if (error) {
    throw error;
  }
}

function idOf(value: string | { id: string }) {
  return typeof value === "string" ? value : value.id;
}

function toTimestamp(seconds: number | null | undefined) {
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}
