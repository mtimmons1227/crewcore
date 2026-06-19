# UI Architecture

## Command Center

- Two main routes:
  - `/` — public Lead Capture page for prospective officials.
  - `/command` — staff Command Center page for authenticated recruiter/chapter admin users.

- Authentication flow:
  - Uses Supabase email/password auth.
  - Supports sign in and sign up on `/command`.
  - Session state is managed with `supabase.auth.getSession()` and `supabase.auth.onAuthStateChange()`.
  - Users can sign out to clear the session and return to the auth form.

- Command Center lead list:
  - Displays leads as per-lead cards.
  - Each card shows:
    - Lead name
    - Email
    - Phone
    - Sport
    - Stage
    - Received timestamp
  - If there are no visible leads, the page displays a friendly empty state: “No leads yet”.

- Security dependency:
  - The Command Center depends on recruiter RLS.
  - A logged-in user only sees leads for chapters where they hold a `recruiter` or `chapter_admin` membership.
  - This ensures the staff console respects chapter membership scope and prevents cross-chapter lead visibility.
