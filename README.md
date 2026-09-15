# Studybase

A study dashboard for IB students: deadlines, subjects, and one list of everything due — ManageBac deadlines plus anything that looks like a
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

## Optional: read ManageBac emails from Gmail

For students who forward school email to a personal Gmail. The app reads the
ManageBac notifications in it and shows them as **Class updates** —
announcements, grades, comments, changed due dates. It does not add deadlines
on its own (the ManageBac calendar feed already does that); a task email that
is not in Deadlines yet gets an "Add to deadlines" button instead.

Access is read-only (`gmail.readonly`). Only a short snippet of each email is
stored, never the full message. The refresh token is encrypted like the
ManageBac feed URL.

### 1. Create the Google app

1. [console.cloud.google.com](https://console.cloud.google.com) → create a project.
2. **APIs & Services → Library** → enable **Gmail API**.
3. **APIs & Services → OAuth consent screen** → User type **External**. Fill in
   the app name and your email. Add the scope
   `https://www.googleapis.com/auth/gmail.readonly`.
4. Under **Test users**, add the Gmail address of everyone who will use it.
5. **APIs & Services → Credentials → Create credentials → OAuth client ID** →
   type **Web application**. Add the authorized redirect URI
   `http://localhost:3000/api/gmail/callback` (and your deployed
   `https://…/api/gmail/callback` later).

### 2. Configure and connect

Add the client ID and secret to `.env`:

```
GOOGLE_CLIENT_ID="…apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="…"
```

Restart `npm run dev`, then **Settings → Gmail → Connect Gmail**, and **Sync**.

### Limits worth knowing

- **Testing mode signs you out weekly.** While the Google app is in "Testing",
  Google expires access after about 7 days. The app notices and shows
  **Connect again** in Settings.
- **Up to 100 test users.** Fine for a class. Publishing the app for everyone
  requires Google's security assessment for Gmail access, which is paid.
- **Classification is keyword-based.** ManageBac's email wording is not
  documented, so anything unrecognised shows as a generic "Update" rather than
  being dropped. See `lib/class-updates.ts`.

## Deploying

The app runs free on Vercel (Hobby) with a Turso database. Every push to `main`
redeploys automatically.

### 1. Database

Turso's free tier is far more than this needs. Create a database, then copy its
URL and an auth token:

```bash
turso db create studybase
turso db show studybase --url        # libsql://...
turso db tokens create studybase
```

No migration step: the app creates its tables on first use.

### 2. Sign-in is required in production

Locally the app runs with no sign-in. **A deployment cannot** — local mode is
disabled in production builds on purpose, because a shared fake session on a
public URL would hand every visitor the same account and the same data.

So a deploy needs a working Azure app registration. If your school blocks
consent, register the app for **personal Microsoft accounts** instead
("Accounts in any organizational directory and personal Microsoft accounts")
and sign in with an outlook.com account. Sign-in and per-user data then work
without involving school IT; only Outlook scanning is affected, since it would
read that personal mailbox rather than the school one. ManageBac is unaffected.

Add the deployed callback URL to the registration:

```
https://<your-app>.vercel.app/api/auth/callback/microsoft-entra-id
```

### 3. Environment variables on Vercel

| Variable | Value |
| --- | --- |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_URL` | `https://<your-app>.vercel.app` |
| `ENCRYPTION_KEY` | a *different* `openssl rand -base64 32` |
| `DATABASE_URL` | the `libsql://...` URL from Turso |
| `DATABASE_AUTH_TOKEN` | the Turso token |
| `AUTH_MICROSOFT_ENTRA_ID_ID` | Application (client) ID |
| `AUTH_MICROSOFT_ENTRA_ID_SECRET` | client secret **Value** |
| `AUTH_MICROSOFT_ENTRA_ID_TENANT_ID` | `common` for personal accounts |

`ENCRYPTION_KEY` must not change once set: it decrypts stored ManageBac feed
URLs, and a new key makes existing ones unreadable.

### 4. Deploy

Import the repo at [vercel.com/new](https://vercel.com/new), paste the
variables, deploy. After that, pushing to `main` is the deploy.

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
