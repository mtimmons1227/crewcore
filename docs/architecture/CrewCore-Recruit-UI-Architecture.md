# CrewCore Recruit — UI Architecture

**Stack:** Vite + React + TypeScript

**App location:** pps/web

**Supabase client initialization:**
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

**Public lead-capture flow:**
1. Load chapter by slug from chapter.
2. Load sport by 
ame from sport.
3. Submit the public form via the public.submit_lead RPC.

**Notes:**
- The public app is a static-hosted Vite app in pps/web.
- The lead-capture page uses chapter display data such as 	agline, hero_text, and ccent_color.
- The public page does not write directly to person or lead; it submits through the security-definer function.
