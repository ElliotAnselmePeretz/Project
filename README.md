# Deadline Tracker

One list of everything due: ManageBac deadlines plus anything that looks like a
deadline in your Outlook mail. Each person signs in with their own Microsoft
account and sees only their own data.

See [CLAUDE.md](CLAUDE.md) for how we work in this repo together.

## How it works

| Source | Method | Notes |
| --- | --- | --- |
| ManageBac | per-user iCal subscription URL | Read-only. Covers ~1 month back to ~3 months forward. |
| Outlook | Microsoft Graph `/me/messages` | Read-only. Dates inferred from subject + preview text. |

Sign-in and Outlook access are the *same* OAuth flow, so there is no separate
account system — your Microsoft login is your account.

### Two constraints worth knowing up front

**ManageBac has no student API.** Tokens are issued under Settings → Develop →
API Manager, they are school-wide, and they grant access to *all* student and
teacher data. No school will issue one to a student. The iCal feed is the only
per-student route, which is why the app asks you to paste a URL instead of
connecting to an API.

**Outlook on a school tenant usually needs admin approval.** Most schools
disable user consent, so students see "This app requires your admin's approval"
even though `Mail.Read` is not normally an admin-restricted permission. If that
happens, your IT department has to grant consent for the app. Personal
outlook.com accounts have no such restriction.

## Setup

```bash
npm install && npm run dev
```

That is the whole setup. The app runs at http://localhost:3000 in **local mode**:
no sign-in, no configuration, ManageBac only. Add your feed URL under Settings
and press Sync now.

Outlook needs the optional Microsoft setup below. Everything else works without it.

## Optional: turn on Microsoft sign-in

Filling in the Azure credentials switches the app from a single local account to
real per-user sign-in, and enables Outlook scanning. No code changes needed —
the app detects the credentials at boot.

### 1. Register the Azure app

1. Go to [Azure Portal → App registrations](https://portal.azure.com) → **New registration**
2. Name it, and under **Supported account types** pick the option matching your school tenant
3. Add a **Redirect URI** of type *Web*: `http://localhost:3000/api/auth/callback/microsoft-entra-id`
4. From **Overview**, copy the *Application (client) ID* and *Directory (tenant) ID*
5. Under **Certificates & secrets** → **New client secret**, copy the **Value** (not the ID)
6. Under **API permissions** → **Add a permission** → Microsoft Graph → Delegated:
   add `Mail.Read`, `Calendars.Read`, `offline_access`

### 2. Configure the app

```bash
cp .env.example .env
```

Fill in the Azure values, then generate the two secrets:

```bash
openssl rand -base64 32
```

Use one for `AUTH_SECRET` and another for `ENCRYPTION_KEY`.

### 3. Restart

```bash
npm run dev
```

The local-mode banner disappears and a **Sign in with Microsoft** button replaces it.

> On a school tenant expect *"This app requires your admin's approval"* — most
> schools disable user consent, and only IT can clear it. Local mode keeps
> working meanwhile.

## Tests

```bash
npm test
```

Covers the email date-extraction heuristic, which is the only part of the app
that guesses.

## Security notes

- The ManageBac feed URL is a **bearer secret** — anyone holding it can read
  your calendar. It is encrypted at rest (AES-256-GCM) and never returned to
  the browser.
- Graph tokens live in the encrypted session cookie and are read server-side
  only, never exposed to client JavaScript.
- Only `bodyPreview` (~255 chars) is read from each email, never full bodies.
- Deadlines derived from email are marked *suggested* with a confidence score.
  They are guesses and the UI says so.

## Deploying

`DATABASE_URL` points at a local SQLite file in development. Vercel's filesystem
is ephemeral, so for a real deployment point it at a hosted
[Turso](https://turso.tech) database (`libsql://…` plus `DATABASE_AUTH_TOKEN`) —
no code changes needed. Remember to add the production callback URL to the Azure
app registration.
