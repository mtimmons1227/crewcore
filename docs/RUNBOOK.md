# Runbook

## Run locally

1. `cd apps/web`
2. `npm install`
3. `npm run dev`
4. Open `http://localhost:5173/`
5. Use `/` for the public lead capture form and `/command` for the staff Command Center.

### Required env keys

Create `apps/web/.env` with:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Onboard a staff recruiter

1. Have the staff person sign up at `/command`.
2. In Supabase SQL editor, run:

```sql
update person
set auth_user_id = (select id from auth.users where email = '<STAFF_EMAIL>')
where email = '<STAFF_EMAIL>';

insert into membership (person_id, chapter_id, sport_id, role, status, joined_at)
select p.id, c.id, s.id, 'recruiter', 'active', now()
from person p, chapter c, sport s
where p.email = '<STAFF_EMAIL>' and c.slug = '<CHAPTER_SLUG>' and s.name = '<SPORT_NAME>'
  and not exists (select 1 from membership m where m.person_id = p.id and m.chapter_id = c.id and m.role = 'recruiter');
```

> If the staff person never submitted a lead, insert a `person` row first.

## Pre-launch hardening checklist

- Re-enable "Confirm email" in Supabase Auth.
- Enable leaked-password protection (HaveIBeenPwned).
- Add CAPTCHA + rate-limiting to the public form.
- Add SPA fallback/rewrite so `/command` works on a static host.
- Consider disabling open sign-up and inviting staff instead.

> Note: open sign-up is not a data risk today because a new account with no recruiter membership sees zero leads, but gating it is tidier.
