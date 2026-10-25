# Google and Apple sign-in

The app shows "Continue with Google" and "Continue with Apple" on sign-in, sign-up and business registration for each provider listed in `NEXT_PUBLIC_AUTH_PROVIDERS`. Switch a provider on only once it's set up below, or its button will lead to an error.

Supabase handles the sign-in. Everyone comes back through `/auth/callback`, then goes where they were heading (an offer, onboarding or their dashboard). A new email creates an account; an email that already has one signs in to it.

The Supabase callback URL used below is:

```
https://owdxoarqivpoplpqiylt.supabase.co/auth/v1/callback
```

## 1. Supabase redirect URLs (once, for both)

Supabase dashboard → **Authentication → URL Configuration**:

- **Site URL:** `https://www.promotello.com`
- **Redirect URLs:** add
  - `https://www.promotello.com/auth/callback`
  - `http://localhost:3000/auth/callback`
  - `https://*-harrynortham.vercel.app/auth/callback` (Vercel previews; adjust to your team's preview domain)

## 2. Google (free)

1. In [Google Cloud console](https://console.cloud.google.com/), create a project (e.g. "Promotello").
2. **APIs & Services → OAuth consent screen** (Google Auth Platform):
   - User type **External**; app name **Promotello**; support email; logo.
   - App domain `https://www.promotello.com`, privacy policy `https://www.promotello.com/legal/privacy`, terms `https://www.promotello.com/legal/terms`.
   - Authorised domains: `promotello.com` and `owdxoarqivpoplpqiylt.supabase.co`. (Google rejects plain `supabase.co`, which is a public suffix.)
   - Google's sign-in screen will say "continue to owdxoarqivpoplpqiylt.supabase.co" until Supabase has a custom domain (a paid add-on, e.g. `auth.promotello.com`). Then add that domain here and use its callback URL instead.
   - Scopes: `openid`, `email`, `profile` (the defaults).
   - **Publish** the app, so anyone can sign in, not just test users.
3. **Credentials → Create credentials → OAuth client ID**, type **Web application**:
   - Authorised JavaScript origins: `https://www.promotello.com`, `http://localhost:3000`
   - Authorised redirect URI: the Supabase callback URL above.
4. Copy the **Client ID** and **Client secret** into Supabase → **Authentication → Sign In / Providers → Google**, and enable it.
5. Set `NEXT_PUBLIC_AUTH_PROVIDERS=google` in Vercel (Production and Preview) and `.env.local`, then redeploy.

## 3. Apple (later: not switched on yet)

Promotello uses Google only for now. The Apple button is built and appears once `apple` is added to `NEXT_PUBLIC_AUTH_PROVIDERS`. It needs the Apple Developer Program, about £79 a year.

1. [Apple Developer](https://developer.apple.com/account) → **Certificates, Identifiers & Profiles → Identifiers**:
   - Create an **App ID** (e.g. `com.promotello.app`) with **Sign in with Apple** ticked.
   - Create a **Services ID** (e.g. `com.promotello.web`). This is the client ID for the website. Tick **Sign in with Apple → Configure**:
     - Primary App ID: the App ID above
     - Domains: `www.promotello.com`, `owdxoarqivpoplpqiylt.supabase.co`
     - Return URL: the Supabase callback URL above
2. **Keys → +**: create a key with **Sign in with Apple**, linked to the App ID. Download the `.p8` file (only once) and note the **Key ID** and your **Team ID** (top right of the developer site).
3. Supabase → **Authentication → Sign In / Providers → Apple**: enable it, enter the Services ID as the client ID, and generate the secret from the `.p8` file, Key ID and Team ID (Supabase's Apple guide has a generator).
   - **The secret expires after 6 months.** Put a reminder in your calendar to generate a new one, or Apple sign-in stops working.
4. **Hide My Email:** people can share a private relay address (`…@privaterelay.appleid.com`). Apple only forwards mail to it from registered senders: **Certificates, Identifiers & Profiles → Services → Sign in with Apple for Email Communication**, add your sending domain and the `EMAIL_FROM` address (the domain needs SPF set up).
5. Add Apple: `NEXT_PUBLIC_AUTH_PROVIDERS=google,apple` in Vercel and `.env.local`, then redeploy.

## Checking it works

- `npm run test:e2e -- tests/e2e/social-login.spec.ts` checks the hand-off to Supabase for each switched-on provider and the "cancelled" message.
- Then sign in for real on the live site with a Google account and, on an iPhone or Mac, with Apple.
