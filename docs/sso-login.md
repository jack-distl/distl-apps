# Sign in with Microsoft or Google

The login page offers **Continue with Microsoft** and **Continue with Google**
above the email and password form. Both run through Supabase Auth, so the
session, roles and RLS policies are exactly the same as an email login.

Draft status: the app code and the database guard are in place. The two
providers still need to be registered and switched on in the Supabase
dashboard before the buttons work. Until then, hide a button with
`VITE_AUTH_PROVIDERS` (see the end of this page).

## What happens on sign-in

1. The button calls `supabase.auth.signInWithOAuth` (provider `azure` for
   Microsoft, `google` for Google) and the browser goes to the provider.
2. The provider sends the user back to Supabase, which sends them on to
   `/auth/callback` with the session.
3. `AuthCallback` picks the session up and lands on the hub.
4. If the email already belongs to a Supabase user (an invited team member),
   the Microsoft or Google identity is attached to that user. No second
   account, same `team_members` row.
5. If the email is new, Supabase creates the user. Migration 020 runs first:
   an email outside `sso_allowed_domains` is refused and the login page shows
   "That account isn't on the Distl team". An allowed one also gets a
   `team_members` row with the `seo` role, which an admin can promote.

Email and password login, invites and password resets keep working as before.

## One-time setup

### 1. Run migration 020

Run `supabase/migrations/020_sso_allowed_domains.sql` in the SQL editor. It
creates `sso_allowed_domains` (seeded with `distl.com.au`) and the two
triggers on `auth.users`. To let another domain in, insert a row; no deploy
needed.

### 2. Supabase redirect URLs

Supabase dashboard → Authentication → URL Configuration:

- **Site URL:** the production URL.
- **Redirect URLs:** add `/auth/callback` on every host the app runs on, e.g.
  `https://<production>/auth/callback`, `https://<preview>/auth/callback`,
  `http://localhost:3000/auth/callback`. Vercel preview URLs change per PR;
  a wildcard such as `https://*-jack-distl.vercel.app/auth/callback` covers
  them.

### 3. Microsoft (Entra ID)

Supabase calls this provider **Azure**.

1. [Entra admin centre](https://entra.microsoft.com) → App registrations →
   New registration. Name it "Distl Platform", **Accounts in this
   organizational directory only** (single tenant), platform **Web**.
2. Redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
   (copied from the Azure provider card in the Supabase dashboard).
3. Certificates & secrets → New client secret. Copy the **value** now.
4. Token configuration → Add optional claim → ID → `email`. Approve the
   Microsoft Graph `email` permission when prompted.
5. Supabase → Authentication → Providers → Azure: paste the **Application
   (client) ID** and the secret value, and set **Azure Tenant URL** to
   `https://login.microsoftonline.com/<Directory (tenant) ID>` so only Distl
   accounts can authenticate. Enable and save.

### 4. Google

1. [Google Cloud console](https://console.cloud.google.com) → APIs &
   Services → OAuth consent screen. User type **Internal** (Workspace only),
   app name "Distl Platform", support and developer email `hello@distl.com.au`.
2. Credentials → Create credentials → OAuth client ID → **Web application**.
   Authorised redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`.
3. Supabase → Authentication → Providers → Google: paste the client ID and
   client secret. Enable and save.

The login button passes `hd=distl.com.au` so Google's account chooser opens
on the Workspace account. That is a hint; the database trigger is the rule.

### 5. Try it

Sign in with a Distl Microsoft account, then with a personal Gmail account.
The first should land on the hub; the second should come back to the login
page with the "not on the Distl team" message and no new row in
`auth.users`.

## Environment variables (optional)

| Variable | Default | Purpose |
|---|---|---|
| `VITE_AUTH_PROVIDERS` | `microsoft,google` | Which buttons to show. Set to `microsoft` to hide Google until it is configured, or empty to show neither. |
| `VITE_AUTH_DOMAIN` | `distl.com.au` | The Google account-chooser hint. Does not change who is allowed in; edit `sso_allowed_domains` for that. |

Client IDs and secrets live in the Supabase dashboard only. Nothing new goes
in Vercel.

## Where the code is

| File | Role |
|---|---|
| `src/lib/authProviders.js` | Provider list, scopes, error messages |
| `src/components/SsoButtons.jsx` | The two buttons and the divider |
| `src/components/LoginPage.jsx` | Places the buttons above the email form |
| `src/hooks/useAuth.js` | `signInWithProvider(providerId)` |
| `src/components/AuthCallback.jsx` | Finishes the round trip, shows provider errors |
| `supabase/migrations/020_sso_allowed_domains.sql` | Domain allowlist and `team_members` provisioning |
