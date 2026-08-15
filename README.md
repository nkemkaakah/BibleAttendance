# Study Group Attendance

Daily QR-code attendance for a small group. Each day has its own code, live from midnight until 9:00 PM. Members scan it (or type it), enter their name, and are logged. The admin gets the day's QR by email automatically and reads the register per day and per week.

## How it works

- **A code belongs to a calendar day.** It works from **00:00 until 21:00** local time, then stops. Yesterday's QR is dead today, and there is no usable code between 9:00 PM and midnight.
- **Codes create themselves.** A daily job creates the day's code and emails the QR to the admin. Loading `/admin` does the same check, so if the job ever misses, the code is there the moment she looks. Nobody presses a button.
- **`/admin`** — password-gated. Shows the current code and QR (marked *Live now*, or *Starts at midnight* if it's after 9:00 PM), the email address the daily QR goes to, and the register: weeks, each broken into days, each day expandable to its names and times.
- **Members** — scan the QR (opens `/checkin?code=XXXXXX`) or type the code on the home page, enter their name, confirm. One check-in per name per day.
- **Weekends** get codes too. Nobody uses them, so they simply stay empty.

## Setup

1. **Supabase** — create a project, open SQL Editor, paste `schema.sql`, run it. Copy the Project URL and `service_role` key from Project Settings → API.
2. **Resend** — create an account and an API key. The sender is `FROM_EMAIL` in `lib/email.ts`; Resend only accepts a domain verified in its dashboard, so `kleanselondon.co.uk` must stay verified there.
3. **Deploy** — push to GitHub, import on Vercel, add the variables from `.env.example`. After the first deploy set `APP_URL` to the real URL and redeploy, since the QR encodes it.
4. Open `/admin`, sign in, and save the email address the daily QR should go to.

## The daily job

`vercel.json` runs `/api/cron/daily` at `0 23 * * *` (UTC — Vercel crons cannot be timezone-aware). At 23:00 UTC the local clock reads 00:00 in BST and 23:00 in GMT, and the "today until 9:00 PM, then tomorrow" rule resolves both to the same upcoming day, so the seasonal shift doesn't open a gap.

`CRON_SECRET` protects the endpoint; Vercel sends it as `Authorization: Bearer …`. Set the same value in the Vercel dashboard.

## Local dev

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Notes

- Names are free-typed. The admin reads a list of names; the app doesn't try to work out that "Grace" and "Grace O." are the same person.
- `TIMEZONE` defines midnight and 9:00 PM. Set it to the group's zone (e.g. `Africa/Lagos`).
- Because a code is pinned to one day, two codes can never be live at once — it's structural, not enforced.
