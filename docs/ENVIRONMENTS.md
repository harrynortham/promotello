# Two copies of the database, and which one you are touching

## The whole idea, in one picture

Right now there is **one** database. The live site reads it, and so does
everything you do while building — including the tests, which create
fake businesses and then delete them. Mostly that works. Occasionally a
test crashes before it tidies up, and a fake business is left sitting in
the real directory. That has happened: nine of them, one approved and
publicly visible, which I cleared out yesterday.

The fix is a second copy:

```
   YOUR LAPTOP                                 THE INTERNET
   ───────────                                 ────────────

   local database          ships to  ───────▶  live database
   a throwaway copy                            what customers see
   nobody can see it                           only two commands reach it
   rebuilds in seconds
```

You build against the copy. When a change is ready, you send it to the
live one on purpose, with a command that asks you to confirm.

That is the whole thing. Everything below is detail.

## What you can actually break

Worth saying plainly, because this is the bit that feels frightening.

**On your laptop: nothing.** The local database is a throwaway. Delete
every row, drop every table, pull the plug mid-write — `npm run db:reset`
rebuilds it from scratch in seconds. There is nothing in it worth
keeping and nobody else can see it. **You cannot do damage there.** Be
as careless as you like; that is what it is for.

**On the live one:** only two commands reach it, and neither can happen
by accident.

| | What it does |
| --- | --- |
| `npm run db:ship` | Shows you what it would do, then asks you to type **ship** before doing it |
| `supabase migration repair` | Writes one bookkeeping table. Cannot change a single table, column or function — see [the one-off job](#the-one-off-job-telling-the-live-database-what-it-has) |

Nothing else you run day to day can touch it. Not `npm run dev`, not the
tests, not `db:reset`.

**The one command to know and avoid** is `supabase db reset --linked`.
Plain `db reset` rebuilds your laptop's copy, which is safe and what the
npm script does. Adding `--linked` rebuilds *the remote project it is
connected to* — which would wipe it. You would have to type that flag
deliberately, and there is no reason to. Use `npm run db:reset` and the
question never comes up.

## The five commands you will use

```bash
npm run db:start      # start the local database (needs Docker running)
npm run db:reset      # rebuild it from scratch — do this freely
npm run dev           # the app, pointed at your local copy
npm run test:e2e      # the tests, now safe to run whenever
npm run db:ship       # send migrations to the live database, with a confirmation
```

That is the day-to-day. The rest of this document is setting it up once,
and the detail behind the commands.

---

## Setting it up

### 1 · Start Docker

Docker Desktop is already installed on this machine. Open it and wait
for the whale icon to settle. The local database runs inside it.

### 2 · Start the local database

```bash
supabase init         # once ever: creates supabase/config.toml
npm run db:start      # first run pulls containers and is slow; later runs are seconds
npm run db:reset      # builds the database from the migration files
```

`db:reset` replays all 110 migration files into an empty database. That
is worth understanding, because it is the quiet benefit of working this
way: **every reset re-proves that your migration files can build a
working database from nothing.** Nobody has ever checked that — the live
database was built by pasting migrations in one at a time over two
months.

If a reset fails, the migration it stops on is genuinely broken, and the
live database just never noticed. Fix the **file**, not the database,
and reset again.

Your storage buckets come with it, since
`20261022090000_sync_remote_schema.sql` creates all three.

### 3 · Point the app at it

```bash
npm run db:env
```

That prints three lines. Put them in `.env.local`, replacing the ones
that are there — and first move the current ones into
`.env.production.local`, which is gitignored, so the live values are
kept somewhere rather than lost.

Two more changes while you are in `.env.local`:

- **Delete the `RESEND_API_KEY` line.** Without it, `sendEmails` quietly
  skips everything, so nothing you do while building can email a real
  person. Sign-in emails still work: they go to a local inbox, whose
  address `npm run db:status` prints. Put the key back for an afternoon
  if you want to see a real email, then take it out.
- **Stripe is already in test mode** (`sk_test_`), so nothing to do.

Then give yourself something to look at:

```bash
node scripts/sample-data.mjs
```

**This step is the one that matters.** Until `.env.local` points at the
local copy, the tests still write to the live site, exactly as they do
today.

### 4 · Sign-in, while you are getting used to it

Email sign-in works immediately and the code arrives in the local inbox.
Google sign-in needs its own setup pointing at the local address, which
is the one genuinely fiddly thing — leave it off locally for now via
`NEXT_PUBLIC_AUTH_PROVIDERS`, and use email.

---

## The one-off job: telling the live database what it has

This is separate from the setup above, and it is the only part that
writes to the live database. It is worth doing, but it is not urgent and
it is not required for anything above to work.

### Why it is needed

Supabase keeps a list of which migrations a database has had. The live
database **has no such list** — every one of your 110 migrations was
pasted in by hand, so as far as the tooling is concerned none of them
has ever run.

That matters for one reason: `npm run db:ship` compares your files
against that list. With the list empty, it would try to send all 110
from the beginning. Most would fail on things that already exist, and
the failure would be confusing.

### Checking before changing anything

The fix is to write the list. But writing it claims that all 110 files
really have been applied — and nobody has checked. If one never was,
the list would say it had, and it would be skipped forever afterwards.

So check first. This reads the live database and writes nothing:

```bash
supabase link --project-ref owdxoarqivpoplpqiylt
supabase db diff --linked
```

It replays your files into a temporary database and compares the result
with the live one.

- **No output** — they match. Good. Carry on.
- **Output** — they disagree, and that is worth knowing. Stop and read
  it; it is the difference between what is committed and what is
  actually live. Come back to this when you have decided which is right.

### Writing the list

Only if the check was clean:

```bash
supabase migration list        # everything on the left, nothing on the right

for f in supabase/migrations/*.sql; do
  version=$(basename "$f" | cut -d_ -f1)
  supabase migration repair --status applied "$version"
done

supabase migration list        # both sides should match now
```

`migration repair` only writes that bookkeeping table. It runs none of
your SQL and **cannot change a table, a column, a function or a policy**
— the documented behaviour is to mark a migration as applied *without
re-running it*. That is why doing all 110 at once is fine.

Afterwards the live database is safer than it is today: a stray push
finds nothing pending instead of trying to replay everything.

Don't use `supabase db pull` as a shortcut. It also writes to the live
database, and the documentation warns the file it produces can contain
statements you did not expect.

---

## Sending a change to the live site

```bash
npm run db:ship
```

It prints what it would do, waits for you to type `ship`, and only then
sends it. If the list is not what you meant, press anything else and
nothing happens.

It needs `PROD_DB_URL` — the connection string from the live project's
dashboard, under Settings → Database → Connection string → URI. Put it
in `.env.production.local` and it will find it.

**Then, in this order:**

1. Ship the migration.
2. Check the thing exists — the new column, the new function.
3. Merge the pull request, which deploys the code.

The code needs the database to be ready first. That is what every
"⚠️ run the migration before merging" note in a pull request has meant.

## The short version of the rules

- **Build against your laptop's copy.** Break it as often as you like.
- **`npm run db:reset` is always safe.** Use it whenever anything looks odd.
- **Only `npm run db:ship` sends things live**, and it asks first.
- **Never type `--linked` on a reset.**
- **Never edit a migration that has already gone live.** Write a new one.
- **If a push fails, fix the file, not the database.**

## For later

### A cloud dev project

A second Supabase project in the cloud, as well as the local one. Worth
it when something is genuinely awkward locally — real Google sign-in,
real email deliverability, a URL to show someone. Not needed now.

If you do create one: same region as live, and **leave "automatic RLS"
off**. It stops new tables being readable by default, and 27 of this
project's 29 table-creating migrations rely on that default with RLS
doing the real access control. Turning it on would give you a project
where most tables exist but cannot be read.

### Replacing a database function

When changing an existing function, take its current definition from the
live database with `pg_get_functiondef` and check the md5 before
editing, rather than trusting the file. The file has differed from live
more than once — eleven characters in `claim_monthly_reports`, and five
behaviours in `claim_business_lifecycle_emails`.

### Things only the live site can test

A real Stripe webhook, real email deliverability, the actual directory.
Short list, and it should get shorter. When something genuinely needs
the live site, say so in the pull request rather than waving it through.
