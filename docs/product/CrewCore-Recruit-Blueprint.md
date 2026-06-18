# CrewCore Recruit — Product Blueprint

**Module:** CrewCore Recruit  
**Version:** v1.0  
**Status:** Approved for design  
**Last updated:** 2026-06-17  
**Beachhead chapter:** DBOA  

---

## 1. Overview & Purpose

CrewCore Recruit is the first module in the CrewCore ecosystem. Its job is to take a sports official from first awareness to assignment-ready — structured, trackable, and chapter-controlled.

**Module mission:** Give chapters a simple, connected system to recruit prospects, route them to the right leader, guide them through onboarding, and hand them off to assignment when they're ready.

Recruit is the top of the CrewCore funnel. It does not assign games, deliver training content, or process payments. Those belong to other modules. Recruit's job is complete when an official is marked **"Ready"** and handed to the assigner.

CrewCore starts as an **overlay** on top of how chapters already operate. Chapters keep their existing systems, culture, and autonomy. Recruit adds structure and visibility without forcing a replacement.

---

## 2. Problem Statement

Dallas-area high school basketball chapters (DBOA, NTBOA, FWBOA) face four compounding problems:

**Difficulty attracting new officials**  
There is no centralized digital channel. Recruiting relies on word-of-mouth and inconsistent outreach. Chapters cannot run targeted campaigns or track what's working.

**No consistent recruiting pipeline**  
Every chapter leader manages differently. Without a shared structure, there is no standardized process from first contact to active official. What works for one recruiter doesn't transfer to the next.

**Limited visibility into prospect status**  
Chapter leaders cannot see where each recruit stands at a glance. Prospects fall through the cracks between initial interest and completed onboarding. There is no single source of truth.

**Manual follow-up and disconnected onboarding**  
Reminders are sent ad hoc via group texts and email. Onboarding steps are not tracked. The result is a slow, leaky funnel that loses promising officials before they ever work a game.

These problems compound during peak recruiting season when chapter leaders are also assigning and officiating. CrewCore Recruit addresses all four directly.

---

## 3. The Recruit Pipeline

CrewCore Recruit is organized into four sequential stages. Every prospect moves through the same pipeline. Chapters manage it; CrewCore provides the infrastructure.

### Stage 1 — Recruit
**What happens:** A prospect discovers officiating through digital outreach, a referral, or a chapter's landing page. They submit a lead-capture form.  
**Who acts:** Prospect (submits); chapter's digital presence drives inbound.  
**V1 mechanism:** A chapter-branded lead-capture form hosted by CrewCore. Captures name, contact info, sport, location, and availability signal.  
**Output:** A new lead record in the chapter's pipeline.

### Stage 2 — Connect
**What happens:** The lead is reviewed and routed to the right chapter or chapter leader. The prospect is contacted and qualified.  
**Who acts:** Recruiter (reviews, routes, contacts).  
**V1 mechanism:** Recruiter Command Center shows new leads with AI-generated lead scores. Recruiter manually routes and logs first contact.  
**Output:** A qualified lead assigned to a chapter leader, status updated to "Contacted."

### Stage 3 — Onboard
**What happens:** The prospect works through required steps — application, background check, intro call, rules exam, orientation — tracked in a checklist.  
**Who acts:** Prospect (completes steps); recruiter and chapter admin (monitor progress, follow up on stalls).  
**V1 mechanism:** An onboarding checklist tied to the prospect record. Each step is marked complete manually or by the prospect. Drop-off prediction surfaces stalled records.  
**Output:** All checklist items complete; official marked "Ready for Assignment."

### Stage 4 — Track
**What happens:** Chapter leaders have real-time visibility into the full pipeline — every prospect, every status, every follow-up need.  
**Who acts:** Chapter admin and recruiter (review; act on surfaced follow-up needs).  
**V1 mechanism:** Command Center dashboard with pipeline summary stats, status filters, and a follow-up queue.  
**Output:** Ongoing operational visibility; no prospect falls through the cracks.

---

## 4. Personas

### Prospect (new official candidate)
**Who they are:** An adult interested in officiating — often a former player, coach, or parent. Typically has no prior officiating experience. May be uncertain about the commitment.  
**Goals:** Understand what officiating involves, complete required steps without confusion, and get to their first game without bureaucratic friction.  
**What they need from Recruit:** A clear, simple path through onboarding. To know what's next at every stage. Timely reminders when they stall.  
**Key risk:** Drop-off. Prospects go cold when the process feels opaque or slow.

### Recruiter (chapter recruiter or outreach lead)
**Who they are:** A chapter member responsible for attracting and qualifying new officials. May be a part-time volunteer role. Manages multiple leads at once during peak season.  
**Goals:** Work a pipeline of leads efficiently. Know who to contact next. Get prospects to orientation without chasing them manually.  
**What they need from Recruit:** A dashboard that surfaces what needs attention. Lead quality signals to prioritize outreach. Simple status tracking without data entry overhead.  
**Key risk:** Burnout and dropped leads when volume exceeds manual capacity.

### Chapter Admin (commissioner or chapter leader)
**Who they are:** The chapter's operational decision-maker. Sets policy, approves onboarding steps, and ultimately owns the roster. May or may not do direct recruiting.  
**Goals:** Grow the active official pool. Have confidence that the pipeline is being worked. Report progress to their association.  
**What they need from Recruit:** Pipeline-level visibility (conversion rates, total prospects, where drop-off happens). Ability to configure the onboarding checklist for their chapter's requirements.  
**Key risk:** Invisible bottlenecks — not knowing the pipeline is broken until it's too late.

---

## 5. V1 Scope vs. Deferred

### In scope for v1.0

| Feature | Description |
|---|---|
| Chapter-branded lead-capture form | Hosted by CrewCore; configurable per chapter; captures contact info, sport, location, availability |
| Recruiter Command Center | Dashboard showing pipeline by stage, follow-up queue, per-prospect status |
| Prospect profile & record | Full view of a prospect's info, activity log, and checklist progress |
| Onboarding checklist | Configurable per chapter; step-by-step tracking; manually updated in v1 |
| Status state machine | Defined pipeline statuses: New Lead → Contacted → In Onboarding → Ready |
| Ready handoff | A manual "Mark Ready" action that flags the official as assignment-eligible and notifies the assigner |
| AI: lead scoring | Surfaces a quality signal on each new lead (see Section 6) |
| AI: drop-off prediction | Flags stalled prospects at risk of going cold (see Section 6) |
| Multi-chapter architecture | Data model supports multiple chapters from day one; DBOA is beachhead |

### Deferred to v1.5

| Feature | Reason deferred |
|---|---|
| Automated email/SMS sequences | Adds vendor dependency and compliance surface area; manual follow-up is sufficient for DBOA at launch |
| Intake chatbot / bot-assisted qualification | Higher complexity, lower urgency in single-chapter launch |
| AI: campaign drafting | Requires campaign infrastructure that doesn't exist yet |
| AI: chapter routing recommendations | Single-chapter beachhead makes this a non-issue for v1 |
| AI: readiness summaries | Nice-to-have; checklist completion is sufficient signal in v1 |
| Orientation scheduling integration | Calendar integrations add scope; direct link or manual scheduling works for v1 |
| Shortage-zone targeting | Requires geographic data enrichment; Phase 2 |
| Multi-channel recruiting campaigns | Deferred until pipeline is proven with DBOA |
| Prospect self-service portal | Recruiter-mediated onboarding is sufficient in v1 |

---

## 6. AI in V1

Two AI features ship in v1. All others are named and deferred.

### Lead Scoring
**What it does:** Assigns a quality signal (Low / Medium / High) to each new lead based on intake form signals.  
**Why it's in v1:** Recruiters working multiple leads need a fast way to prioritize outreach. Even a basic signal reduces cognitive load.  
**Inputs:** Sport match to chapter's shortage areas, location proximity to chapter territory, availability signal from form (e.g., "weekday evenings" vs. "unsure"), experience background.  
**Output:** A score label (Low / Medium / High) displayed on the lead record in the Command Center. Not a blocking gate — recruiter always has full control.  
**Implementation approach:** Rule-based scoring model in v1. No ML required. Weights are configurable by chapter admin.  
**Constraint:** Scoring must be explainable. Recruiter should be able to see why a lead is scored the way it is.

### Drop-Off Prediction
**What it does:** Flags prospects who are at elevated risk of going cold based on inactivity signals.  
**Why it's in v1:** Drop-off is the most damaging leak in the funnel. Surfacing stalled records directly reduces the problem the module was built to solve.  
**Inputs:** Days since last status change, days since last contact logged, current onboarding step, how many steps remain.  
**Output:** A "Needs Attention" flag on the prospect record; stalled records surface in the follow-up queue in the Command Center.  
**Implementation approach:** Rule-based threshold logic in v1 (e.g., no activity for 7 days during onboarding triggers flag). Thresholds configurable by chapter admin.  
**Constraint:** The flag surfaces a recommendation, not an automated action. Recruiter decides whether to follow up.

### Named and Deferred
- Campaign drafting (v1.5)
- Chapter routing recommendations (v1.5)
- Readiness summaries (v1.5)
- Onboarding completion probability model (v2)
- Shortage-zone targeting (v2)

---

## 7. Success Metrics

Three metrics define whether CrewCore Recruit is working. All three are measurable from pipeline data.

### Lead-to-Active-Official Conversion Rate
**Definition:** Percentage of leads who enter the pipeline and reach "Ready" status within a rolling 90-day window.  
**Baseline:** Unknown at launch; DBOA recruiter to provide historical estimate.  
**Direction:** Increase. This is the primary funnel health metric.  
**Why it matters:** A chapter that recruits 100 prospects but only activates 10 has a broken funnel. This metric makes the problem visible.

### Onboarding Completion Rate (Drop-Off Reduction)
**Definition:** Percentage of prospects who enter onboarding (status: In Onboarding) and complete all checklist steps.  
**Baseline:** Unknown at launch; estimate from DBOA.  
**Direction:** Increase. Secondary funnel health metric.  
**Why it matters:** Most drop-off happens during onboarding, not at lead capture. This metric isolates the onboarding stage specifically.

### Time to First Assignment-Ready
**Definition:** Median days from lead capture to "Ready" status for prospects who complete the pipeline.  
**Baseline:** Unknown at launch.  
**Direction:** Decrease. Operational efficiency metric.  
**Why it matters:** A faster pipeline means officials get to games sooner and are less likely to lose interest during a long wait.

---

## 8. Non-Goals & Module Boundaries

CrewCore Recruit is explicitly **not** responsible for the following. These belong to other modules and should not creep into Recruit's v1 scope.

| Out of scope | Belongs to |
|---|---|
| Game assignment and scheduling | CrewCore Exchange |
| Payment processing and payout tracking | CrewCore Payouts |
| Training content delivery and certification tracking | CrewCore Academy |
| Evaluation scoring and performance tracking | CrewCore Insights |
| Active official roster management | Core platform / chapter admin tools |
| Chapter dues and membership management | Chapter-owned systems (preserved per sovereignty principle) |

**Recruit's boundary:** The module's job ends when an official is marked **"Ready."** That action triggers a notification to the assigner. What happens next is Exchange's problem.

Any feature request that involves assigning, paying, evaluating, or training an official belongs in a later module. Recruit does not expand to absorb those workflows.

---

## 9. Chapter Sovereignty Notes

CrewCore Recruit is built as an overlay, not a replacement. The following rules govern how the module respects chapter autonomy.

**What chapters own and CrewCore does not touch:**
- Onboarding checklist content — chapters define their own required steps. CrewCore provides the framework; chapters fill it in.
- Routing and assignment decisions — the recruiter decides who to contact and how to route a lead. CrewCore surfaces signals; the human makes the call.
- Communication style and cadence — in v1, all outreach is manual. Chapters keep their voice and their relationships.
- Eligibility criteria — what makes an official "ready" is defined by the chapter, not by CrewCore.
- Existing tools — chapters that already use ArbiterSports, Google Sheets, or other systems are not forced off them. Recruit runs alongside.

**DBOA beachhead rationale:**  
DBOA is the launch chapter. The v1 build is validated against DBOA's actual workflow, terminology, and checklist requirements. The data model and architecture support multi-chapter from day one (every record is chapter-scoped), so NTBOA and FWBOA can be onboarded without re-architecture. DBOA proves the model; the others inherit a tested product.

**Multi-chapter design constraint:**  
Every prospect record, onboarding checklist, lead score configuration, and dashboard view must be scoped to a chapter. No cross-chapter data leakage. Chapter admins see only their chapter's data.

---

## 10. Open Questions

These must be resolved before user-flow design begins. Each question has a recommended default; the DBOA chapter lead should confirm or redirect.

1. **Onboarding checklist steps** — What are DBOA's actual required onboarding steps, in order? The demo shows 6 generic steps. The real checklist needs to be confirmed with the chapter before the data model is locked.

2. **"Ready" definition** — Who marks an official Ready — the recruiter, the chapter admin, or the system automatically when checklist is complete? Does it require admin approval or is it self-service?

3. **Lead capture form placement** — Where does the form live? Chapter's own website (embedded), a CrewCore-hosted landing page, or both? Does DBOA have an existing web presence to embed into?

4. **Assigner notification** — When an official is marked Ready, who gets notified and how? Email? In-app? Who is the designated assigner contact for DBOA?

5. **Contact logging** — In v1, contact activity (calls, emails) is logged manually by the recruiter. Is this acceptable, or does DBOA need email/calendar integration to auto-log outreach?

6. **Lead scoring weights** — What factors matter most to DBOA when prioritizing a new lead? Sport shortage areas, geographic proximity, prior experience? This shapes the v1 scoring model.

7. **Drop-off thresholds** — What inactivity window should trigger a "Needs Attention" flag? 7 days is the default assumption. Does DBOA have a faster or slower expected cadence?

8. **Chapter admin role** — Is there one chapter admin per chapter, or are there multiple roles (commissioner, secretary, recruiting lead)? This affects permission design.

9. **Prospect communication in v1** — If automated email/SMS is deferred, how do recruiters communicate with prospects? External email/text only? Should CrewCore log outreach even if it doesn't send it?

10. **Data migration** — Does DBOA have an existing prospect list or partial pipeline in a spreadsheet that needs to be imported at launch, or do they start fresh?
