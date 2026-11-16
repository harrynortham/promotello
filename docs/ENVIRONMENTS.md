# Two databases, and how a change reaches the live one

Until now there has been one Supabase project. Every migration was
pasted into the dashboard by hand, and `npm run test:e2e` ran against the
same database the public site uses — which is how nine test businesses
ended up in the live directory, one of them approved and visible.

This is the way out of that, and the flow to use from then on.

## The two projects

| | What it is | Who touches it |
| --- | --- | --- |
| **Dev** | A second Supabase project, same schema, throwaway data | `npm run dev`, every e2e run, every migration first |
| **Prod** | `owdxoarqivpoplpqiylt`, the live site | Only a migration that already ran on dev |

## The order, and why it is this order

Prod is written to **once**, at step 4, and only after step 3 has proved
the write is correct. Everything before that either leaves prod alone or
only reads from it.

| Step | Prod |
| --- | --- |
| 1 · Create the dev project | untouched |
| 2 · Build dev from the migrations | untouched |
| 3 · Prove the files match prod | read only |
| 4 · Give prod its migration history | **written** — one metadata table |
| 5 · Point local at dev | untouched |

## Step 1 · Create the dev project

In the dashboard, not from here. Nothing in this step goes near prod.

1. **supabase.com/dashboard** → New project.
2. Name it `promotello-dev`. Same region as prod (London) so behaviour
   matches.
3. Generate a database password and put it in your password manager now.
   You need it for `supabase link`, and it is not shown again.
4. Free tier is fine. It is a second project on the same organisation.

## Step 2 · Build dev from the migrations

```bash
# Once, in the project root. Creates supabase/config.toml.
supabase init

supabase link --project-ref <dev-ref>

# What it would do, before it does it.
supabase db push --dry-run

supabase db push
```

That replays all 110 migrations into an empty database, which is the
first real test any of them has had as a sequence rather than one at a
time.

**If it fails**, the migration it stops on is genuinely broken in a way
prod never noticed — usually because what was pasted into the dashboard
differed from what was committed. Fix the file, never the database, and
push again.

The storage buckets come with it: `business-logos`, `offer-images` and
`profile-images` are all created in
`20261022090000_sync_remote_schema.sql`.

## Step 3 · Prove the files are what prod has

This is the step that makes step 4 safe, and it only reads.

`supabase_migrations.schema_migrations` does not exist on prod. The 110
migrations were applied by hand, so as far as the CLI is concerned
**none of them has ever run**. Step 4 fixes that by telling prod it
already has them — which is only true if the files really do describe
prod. Nobody has ever checked.

If one file was never actually applied, step 4 would record it as
applied anyway. Every future `db push` would then skip it, and prod
would be permanently missing that change while the history insisted
otherwise. A quiet, lasting problem, and the only way any of this hurts.

So prove it first:

```bash
supabase link --project-ref owdxoarqivpoplpqiylt

# Replays the migration files into a local shadow database and diffs
# the result against prod. Needs Docker running. Reads prod, writes
# nothing to it.
supabase db diff --linked
```

**Empty output is the answer you want**: the files and prod are the same
database, and step 4 is recording a fact rather than a hope.

**Output means they disagree.** Stop. Read what it says — it is the
difference between what has been committed and what prod actually has.
Decide which is right before anything is written, because step 4 freezes
whichever answer you pick.

## Step 4 · Give prod its migration history

Only once step 3 came back clean.

```bash
# Still linked to prod from step 3.
supabase migration list        # everything local, nothing remote

for f in supabase/migrations/*.sql; do
  version=$(basename "$f" | cut -d_ -f1)
  supabase migration repair --status applied "$version"
done

supabase migration list        # both columns should now match
```

`migration repair` writes one row per migration into
`supabase_migrations.schema_migrations`. It runs none of the SQL and
cannot alter a table, a column, a function or a policy — the documented
behaviour is to mark a migration applied *without re-running it*. That
is why it is safe to do in bulk, given step 3.

**Check the second `migration list` before moving on.** If any row is
local-only afterwards, stop and work out why rather than pushing.

Afterwards prod is safer than it was. A stray `supabase db push` at prod
today would try to replay all 110 from the beginning; once the history
is right, the same mistake finds nothing pending and does nothing.

**Do not reach for `supabase db pull` instead.** It writes to prod's
history too, and the documentation warns that the file it generates can
contain statements you did not expect — `DROP EXTENSION` among them.

## Step 5 · What migrations do not carry

Back to dev, and nothing here goes near prod again. A pushed schema is
not a working project: these are set in the **dev** project's dashboard,
once.

- **Google sign-in.** Authentication → Providers → Google, with its own
  OAuth client, and `http://localhost:3000/**` in the redirect allow
  list. `NEXT_PUBLIC_AUTH_PROVIDERS` controls whether the button shows.
- **Email sign-in.** On by default. The templates in
  `supabase/templates/` are applied per project.
- **Site URL** → `http://localhost:3000`.

Nothing else: `pg_cron` and `pg_net` are installed on prod but no cron
job uses them — the daily job is Vercel calling `/api/cron/daily`.

## Step 6 · Point local at dev

`.env.local` is the development environment. Replace the three Supabase
values with the dev project's, from Settings → API:

```
NEXT_PUBLIC_SUPABASE_URL=https://<dev-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<dev anon key>
SUPABASE_SERVICE_ROLE_KEY=<dev service role key>
```

Leave the rest as they are, with two deliberate exceptions:

- **`RESEND_API_KEY` — remove it.** `sendEmails` skips everything when
  it is missing, so nothing can be posted to a real person from a dev
  database. Put it back for an afternoon when you want to look at an
  email, then take it out again.
- **Stripe stays in test mode**, which it already is (`sk_test_`).

Keep the prod values in `.env.production.local`, which is already
gitignored, so a day you genuinely need them is a copy and not a hunt.

**This is the step that stops the tests writing to the live site.**
Until it is done, `npm run test:e2e` still runs against prod, exactly as
it does today — steps 1 to 4 change nothing about that.

Then seed something to look at:

```bash
node scripts/sample-data.mjs
```

## Step 7 · The flow, from here on

**Dev is the default.** `supabase link` stays pointed at dev, so every
plain `supabase db push` goes somewhere harmless.

```bash
# 1. Write the migration.
supabase migration new what_it_does

# 2. Apply it to dev.
supabase db push

# 3. Prove it. Both of these now run against dev.
npm run test:unit
npm run test:e2e

# 4. Commit the migration with the code that needs it.
```

## Step 8 · Shipping to prod

Prod is never pushed to by accident, because it is never the linked
project. It is named explicitly, every time:

```bash
# What would run. Read it.
supabase db push --dry-run --db-url "$PROD_DB_URL"

supabase db push --db-url "$PROD_DB_URL"
```

`PROD_DB_URL` is the connection string from the prod dashboard
(Settings → Database → Connection string → URI), with the password
percent-encoded. Keep it out of the repo — an environment variable in
your shell for the minute you need it, or read it from
`.env.production.local`.

**The order that matters.** The code and the migration ship together,
but the migration lands first:

1. `db push` to prod.
2. Confirm it: the function or column exists.
3. Merge the PR, which deploys the code.

Backwards and the live site calls something that is not there yet. That
is what every "⚠️ run the migration before merging" note in a PR has
been about.

## The rules

Short enough to remember, and the reason for each one is above.

- **A migration runs on dev first.** No exceptions: dev is the only
  place a migration gets tested as part of a sequence.
- **Prod is pushed to by name**, with `--db-url`, never by being linked.
- **Dry run first**, every time, on both.
- **Never edit a migration that has run on prod.** Write another one.
- **Never edit the database to fix a failed push.** Fix the file.
- **A function is replaced from its deployed definition**, not from the
  file, unless the two have been proven identical. The copy in
  `supabase/migrations/` has differed from live more than once — eleven
  characters in `claim_monthly_reports`, and five behaviours in
  `claim_business_lifecycle_emails`. Fetch it with
  `pg_get_functiondef`, check the md5, then patch.

## When something is only true of prod

Occasionally a thing cannot be tested on dev: a live Stripe webhook, a
real email, the actual directory. Those are the cases to name out loud
in a PR rather than wave through, and the list is short — it should get
shorter, not longer.
