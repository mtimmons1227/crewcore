# CrewCore Pathway — User Manual

**Product:** CrewCore Pathway (RefNet officiating ecosystem)
**Owner:** Timmons Sport Technologies
**Audience:** Officials & recruits (Part A) and board members & chapter admins (Part B)
**About this manual:** This is a plain-language guide to using CrewCore Pathway. It covers every
screen, what it does, and the steps to complete common tasks. No technical background is needed.

> **A note on the demo/test environment.** While CrewCore is being tested, some actions are
> simulated (for example, dues payment runs on Stripe *test* mode, and a "Load state steps"
> button can stand in for the live state-record import). Those spots are called out where they
> appear. In everyday live use, the flow is the same but the actions are real.

---

# Part A — For Officials & Recruits

This part is for the person going through the process of joining a chapter and becoming a cleared
official.

## A1. What CrewCore Pathway is

CrewCore Pathway is your guided checklist for joining a local officials' chapter (for example,
DBOA) and getting cleared to work games. It walks you through every requirement — application and
dues, state registration, background check, training, books, the state test, and camp — and shows
you exactly what's done, what's next, and what's waiting on someone else. You don't have to keep
track of the paperwork; the Pathway does.

## A2. Getting started — the interest form

If you're brand new, you'll start on the **public interest page** (the home page). You fill in a
short form with your name, email, and basic details, and submit it. That tells the chapter you're
interested and starts your record.

After you're in the system, you receive a **personal link** to your Pathway. This link is unique
to you — treat it like your account. Open it any time to see your progress. (If you lose it, the
chapter can re-send it.)

## A3. Your Pathway timeline (the recruit menu)

Opening your personal link brings you to your **Pathway timeline** — your home base. Here you'll
see:

- **A progress meter** down the side showing every step and where you are.
- **A fees strip** summarizing what you owe or have paid.
- **A "Make the Call" card** if you still need to choose your chapter (see A4).
- **Your step checklist** — each requirement, with its status.

**Important — the placement gate.** Until you've chosen your chapter (Make the Call), your
checklist stays locked and the one thing you can do is Make the Call. Once you confirm a chapter,
the full checklist unlocks. This keeps you from doing work for the wrong chapter.

## A4. Make the Call — choosing your chapter

"Make the Call" is a short guided wizard that helps you land in the chapter that fits you best.

1. From your timeline, open the **Make the Call** card.
2. Choose a path: **Guided** (answer questions and get a recommendation) or **Compare** (look at
   chapters side by side).
3. Answer up to **12 short questions**, organized into three groups — **The Situation**, **The
   Facts**, and **The Call**. A "Why we ask" panel explains the purpose of each question.
4. Review the recommendation and the **chapter directory**.
5. When you're ready, choose **Continue with [chapter]** to confirm.

Confirming your chapter unlocks your full checklist and takes you back to your timeline.

## A5. Completing your steps

Your checklist follows your chapter's requirements. For DBOA, the steps are:

1. **Chapter application & dues** — pay your local chapter dues (due within 7 days). *In testing,
   payment uses Stripe test mode.*
2. **THSBOA state registration & dues** — handled with the state. When the state record comes in
   through the Arbiter import, this step (and the background check) complete automatically — you
   don't re-enter anything.
3. **Background check & abuse-prevention training** — completes from the state record.
4. **DBOA new-officials training** — attend the session and check in (see A6). *New members only.*
5. **Purchase uniform** — *new/transfer members only.*
6. **Attend 6 general session meetings** — check in at each; the Pathway counts them for you.
7. **Receive NFHS Rulebook & Case Book** — acknowledge receipt.
8. **Receive NFHS Mechanics Manual** — acknowledge receipt.
9. **THSBOA state test** — your score sets your clearance (see A7).
10. **DBOA training camp** — attend and check in ($75 fee).
11. **Required off-season training** — *for new, second-year, and Division IV–V officials.*

Some steps depend on others (for example, most steps open up only after your state registration is
in). The checklist shows a step as locked until its prerequisites are met, so you always know what
you *can* do right now.

> **Demo/testing note.** In the test environment, a **"Load state steps"** button (with an amber
> "Demo mode" banner) can mark the state steps complete so you can walk the flow end-to-end. In
> live use, those steps complete from the real state import instead.

## A6. Checking in at training and meetings

Attendance is done with a **QR code** shown on a screen at the venue (the kiosk).

1. At the session, open your Pathway link on your phone (or the check-in link provided).
2. **Scan the QR code** on the kiosk screen. It refreshes periodically for security, so scan the
   current one.
3. That records your **check-in**. When the session runs a **check-out**, scan again to check out.

Your attendance is automatically credited toward the matching step (for example, one of your six
general meetings).

## A7. Getting cleared

Your **clearance level** is set automatically from your THSBOA state-test score:

- **70% or higher → regular clearance.**
- **90% or higher → playoff clearance.**

Once your required steps are complete and you're cleared, you're ready to be assigned games
through your chapter's assignment software. (The hand-off that turns you on in the assignment
system is part of the ecosystem's assigner integration.)

## A8. If something looks stuck

- **A step is locked.** It's waiting on a prerequisite (often your state registration). Do the
  steps that are open; the locked ones unlock automatically.
- **You paid but it's not checked off.** Payment confirmation can take a moment; refresh your
  timeline. If it persists, contact your chapter.
- **You lost your link.** Ask your chapter to re-send your personal Pathway link.

---

# Part B — For Board Members & Chapter Admins

This part is for the people running the chapter: managing recruits, verifying steps, and running
training sessions.

> **Staff access.** Staff screens are currently protected by a shared staff passcode
> (`dboa2026`) while the system is in testing. This is a temporary measure; real staff sign-in is
> a go-live item. Don't share the passcode outside your staff.

## B1. The Command Center

**Where:** the `/command` screen. **What it's for:** your working roster of recruits.

- See every recruit and their status at a glance.
- **Expand a recruit** to see a detail panel with their steps, progress, and history.
- **Board smart signals** highlight who needs attention (for example, stalled recruits or steps
  waiting on staff).

Use the Command Center day to day to see who's moving and who's stuck.

## B2. The Board Dashboard

**Where:** the `/board` screen. **What it's for:** a board-level overview of recruit progress
across the chapter.

This view shows recruit names, contact info, and progress, so it contains personal information —
keep it to authorized board members. (Locking this behind real sign-in is a go-live item.)

## B3. Board Verify — approving steps and issuing books

**Where:** the `/board/verify` screen. **What it's for:** the actions only staff can take.

- **Verification queue.** Steps that require staff confirmation (most of the checklist) show up
  here. Review each and **mark it verified** (or reject it). This is how recruits actually move
  forward — without it, staff-verified steps can't be completed.
- **Book issuance.** Record when you've handed out the **Rulebook / Case Book** or the **Mechanics
  Manual** to a recruit.
- **Outstanding books.** See who still owes a book so nothing falls through the cracks.

## B4. Running a training session

Running attendance has three screens that work together.

### B4.1 Session Admin — set up the session

**Where:** the `/sessions/admin` screen.

- **Create a session** (title, date/time, location, and which step it satisfies).
- **Edit or manage** existing sessions from the list.

### B4.2 The Kiosk — run check-in at the venue

**Where:** the `/kiosk/[session]` screen, shown on a screen or tablet at the door.

1. Open the kiosk link for your session and enter the staff passcode.
2. The kiosk shows a **large QR code** that **refreshes on a countdown** (for security), the
   session title, and a live **attendance count**.
3. Officials scan the QR to **check in**. The tally updates automatically.
4. Use **"Switch to Check-Out"** to flip the kiosk into check-out mode at the end; officials scan
   again to check out. Use **"Return to Check-In"** to switch back.
5. When the session is over, choose **Close Attendance** and confirm. Closing stops further
   check-ins/outs and flags anyone who checked in but never checked out for staff review.

### B4.3 Session Attendance — review the detail

**Where:** the `/sessions/[session]/attendance` screen. Review exactly who checked in and out for
a given session.

## B5. Bringing in state records (Arbiter)

State-authority steps — state registration & dues, background check, and the state test/score —
are designed to complete automatically when the official's record comes in from **Arbiter**. Staff
don't hand-enter these; the import ticks them off and records the evidence. A **manual override**
(Board Verify) is always available if a record is late or missing, so a recruit is never stuck
waiting on the feed.

> **Demo/testing note.** A **"Load THSBOA record (demo)"** button can simulate that state import
> for demonstrations. It's demo-only and is removed/locked before real recruits use the system.

## B6. Troubleshooting

**The kiosk shows "TypeError: Failed to fetch."** This means the kiosk device briefly lost its
internet connection — the request never reached the server (it is *not* a data problem). Fix:
check the venue Wi-Fi, **reload the kiosk page**, re-enter the passcode, and try again. Because a
training kiosk sits open for hours, keep the device awake and on stable Wi-Fi. (Friendlier error
messaging and auto-reconnect are planned improvements.)

**A recruit can't do anything but "Make the Call."** That's expected — their checklist is locked
until they confirm a chapter. Once they Make the Call, everything unlocks.

**A recruit is marked "stalled."** A step passed its due date without being completed. Open their
detail in the Command Center to see which step and follow up.

**A step won't complete for a recruit.** If it's a staff-verified step, someone needs to approve it
in **Board Verify**. If it's a state step, it completes from the Arbiter import (or a manual
override).

---

# Appendix — Screen reference & glossary

## Screen reference

| Screen | Who uses it | What it does |
|---|---|---|
| Interest page (home) | Recruits | Public sign-up form |
| Pathway timeline | Recruits | Personal checklist, progress, fees |
| Make the Call | Recruits | Choose your chapter |
| Check-In | Recruits | Scan-to-check-in at sessions |
| Command Center | Staff | Recruit roster + detail + signals |
| Board Dashboard | Board | Chapter-wide progress overview |
| Board Verify | Staff | Approve steps, issue books |
| Session Admin | Staff | Create/manage sessions |
| Kiosk | Staff | Run venue check-in (QR + counts) |
| Session Attendance | Staff | Per-session check-in/out detail |

## Glossary

- **Clearance level** — how far an official can be assigned, set from the state-test score:
  regular (≥70%) or playoff (≥90%).
- **Placement gate** — the rule that locks a recruit's checklist until they confirm a chapter via
  Make the Call.
- **Member type** — the recruit's category (new, transfer, returning, etc.); it determines which
  steps apply to them.
- **Stalled** — a step is past its due date and not complete.
- **Staff-verified step** — a step a staff member must approve in Board Verify.
- **Kiosk** — the venue screen that displays the rotating check-in QR code.

---

*End of User Manual.*
