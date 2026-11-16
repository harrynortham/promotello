# Where the database lives while you work

Until now there has been one Supabase project. Every migration was
pasted into the dashboard by hand, and `npm run test:e2e` ran against
the same database the public site reads — which is how nine test
businesses ended up in the live directory, one of them approved and
visible, and why full test runs have been avoided rather than used.

This is the way out, and the flow afterwards.

## The three places

| | What it is | When |
| --- | --- | --- |
| **Local** | The whole Supabase stack in Docker on your machine | `npm run dev`, every test run, every migration first |
| **Cloud dev** | A second Supabase project. Optional, and later | Only when something needs to be prod-shaped: real Google sign-in, real deliverability, a link to show somebody |
| **Prod** | `owdxoarqivpoplpqiylt`, the live site | A migration that has already run locally, pushed by name |

Local is the default because it costs nothing, resets in seconds, and
cannot reach a customer. Docker is already installed on this machine
(28.0.4); it just needs to be running.

## What touches prod, and when

Prod is written to **once** in this whole document, at step 4, and only
after step 3 has proved the write is correct.

| Step | Prod |
| --- | --- |
| 1 · Start the local stack | untouched |
| 2 · Point the app at it | untouched |
| 3 · Prove the files match prod | read only |
| 4 · Give prod its migration history | **written** — one metadata table |

## Step 1 · Start the local stack

```bash
# Once. Creates supabase/config.toml, which is how the local stack is
# configured: auth providers, ports, email.
supabase init

# First run pulls containers and takes a while. After that, seconds.
supabase start

# Replays all 110 migrations into an empty database, then runs
# supabase/seed.sql if there is one.
supabase db reset
```

`db reset` is the part worth noticing. It rebuilds from the migration
files every time, so **every reset re-proves that the 110 files produce
a working database from nothing** — which nobody has ever checked,
because prod was built one hand-pasted migration at a time.

**If a reset fails**, the migration it stops on is genuinely broken in a
way prod never noticed, usually because what was pasted into the
dashboard differed from what was committed. Fix the file, never the
database, and reset again.

The storage buckets come with it: `business-logos`, `offer-images` and
`profile-images` are all created in
`20261022090000_sync_remote_schema.sql`.

### Never pass `--linked` to `db reset`

`supabase db reset --linked` resets **the linked project**: it drops
everything and replays the migrations. Against prod that is the whole
business. The default is `--local`, so the only way to do it is to type
`--linked` deliberately. Don't.

## Step 2 · Point the app at it

`supabase status` prints the local URL and keys, and will print them in
the shape `.env.local` wants:

```bash
supabase status -o env \
  --override-name api.url=NEXT_PUBLIC_SUPABASE_URL \
  --override-name auth.anon_key=NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY \
  --override-name auth.service_role_key=SUPABASE_SERVICE_ROLE_KEY
```

Put those three in `.env.local`, and keep the prod values in
`.env.production.local`, which is already gitignored, so the day you
genuinely need them is a copy and not a hunt.

Two deliberate changes while you are in there:

- **Remove `RESEND_API_KEY`.** `sendEmails` skips everything when it is
  missing, so nothing from a development database can reach a real
  person. Supabase's own sign-in emails go to the local inbox either
  way, whose address `supabase status` prints. Put the key back for an
  afternoon when you want to see a real email, then take it out again.
- **Stripe stays in test mode**, which it already is (`sk_test_`). The
  webhook listener in CLAUDE.md is unchanged.

Then something to look at:

```bash
node scripts/sample-data.mjs
```

**This is the step that stops the tests writing to the live site.**
Until it is done, `npm run test:e2e` still runs against prod exactly as
it does today.

### Google sign-in

Email sign-in works locally with no setup and its code goes to the local
inbox. Google needs an OAuth client pointed at the local callback and
its id and secret in `config.toml` — the one thing genuinely easier on a
cloud project. Until then, `NEXT_PUBLIC_AUTH_PROVIDERS` decides whether
the button shows.

## Step 3 · Prove the files are what prod has

The step that makes step 4 safe. It only reads.

`supabase_migrations.schema_migrations` does not exist on prod. The 110
migrations were applied by hand, so as far as the CLI is concerned
**none of them has ever run**. Step 4 fixes that by telling prod it
already has them — which is only true if the files really do describe
prod. Nobody has ever checked.

If one file was never actually applied, step 4 would record it as
applied anyway. Every future `db push` would skip it, and prod would be
permanently missing that change while the history insisted otherwise. A
quiet, lasting problem, and the only way any of this hurts.

```bash
supabase link --project-ref owdxoarqivpoplpqiylt

# Replays the migration files into a shadow database and diffs the
# result against prod. Reads prod, writes nothing to it.
supabase db diff --linked
```

**Empty output is the answer you want**: the files and prod are the same
database, and step 4 records a fact rather than a hope.

**Output means they disagree.** Stop and read it — that is the
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
is what makes it safe in bulk, given step 3.

**Check the second `migration list` before moving on.** If any row is
local-only afterwards, stop and work out why.

Afterwards prod is safer than it is now. A stray `supabase db push` at
prod today would try to replay all 110 from the beginning; once the
history is right, the same mistake finds nothing pending and does
nothing.

**Do not reach for `supabase db pull` instead.** It writes to prod's
history too, and the documentation warns that the file it generates can
contain statements you did not expect — `DROP EXTENSION` among them.

### Afterwards, the link is still pointed at prod

`supabase/.temp/` holds it, and every `--linked` command means prod
until it changes. Nothing in the daily flow below needs a linked project
at all, which is the point: the only commands that reach prod are the
ones that name it.

## Step 5 · The flow, day to day

```bash
supabase start                 # if it is not already up

# 1. Write the migration.
supabase migration new what_it_does

# 2. Rebuild from nothing, which proves the whole sequence again.
#    It takes seconds.
supabase db reset

# 3. Prove it. Both of these now run against local.
npm run test:unit
npm run test:e2e

# 4. Commit the migration with the code that needs it.
```

## Step 6 · Shipping to prod

Prod is named explicitly every time rather than being the linked
project:

```bash
# What would run. Read it.
supabase db push --dry-run --db-url "$PROD_DB_URL"

supabase db push --db-url "$PROD_DB_URL"
```

`PROD_DB_URL` is the connection string from the prod dashboard
(Settings → Database → Connection string → URI) with the password
percent-encoded. Keep it out of the repo: an environment variable in
your shell for the minute you need it, or read from
`.env.production.local`.

**The order matters.** The code and the migration ship together, but the
migration lands first:

1. `db push` to prod.
2. Confirm it — the function or column exists.
3. Merge the PR, which deploys the code.

Backwards and the live site calls something that is not there yet. That
is what every "⚠️ run the migration before merging" note in a PR has
been about.

## The rules

- **A migration runs locally first.** `db reset` is the only place the
  files are tested as a sequence rather than one at a time.
- **Prod is pushed to by name**, with `--db-url`, never by being linked.
- **Never `--linked` on `db reset`.**
- **Dry run first**, every time.
- **Never edit a migration that has run on prod.** Write another one.
- **Never edit the database to fix a failed push.** Fix the file.
- **A function is replaced from its deployed definition**, not from the
  file, unless the two have been proven identical. The copy in
  `supabase/migrations/` has differed from live more than once — eleven
  characters in `claim_monthly_reports`, five behaviours in
  `claim_business_lifecycle_emails`. Fetch it with `pg_get_functiondef`,
  check the md5, then patch.

## A cloud dev project, if you want one later

Worth adding when something is genuinely awkward locally: real Google
sign-in, real deliverability, a URL to show somebody. Same shape —
create `promotello-dev` in the dashboard, same region as prod,
`supabase link --project-ref <dev-ref>`, `supabase db push`.

**Leave "automatic RLS" off when creating it.** It stops a new table in
`public` being granted to `anon` and `authenticated` by default, and 27
of this project's 29 table-creating migrations rely on that implicit
grant with RLS doing the access control. Prod is on the old behaviour,
so turning it on would give you a dev project where most tables exist
but cannot be read. If that posture is wanted later it is a deliberate
change to both projects at once, not a checkbox at creation time.

## When something is only true of prod

A few things cannot be tested anywhere else: a live Stripe webhook, real
deliverability, the actual directory. Those are the cases to name out
loud in a PR rather than wave through, and the list should get shorter,
not longer.
