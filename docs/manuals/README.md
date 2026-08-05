# CrewCore — Documentation Index

**Owner:** Timmons Sport Technologies · **Updated:** current session

This is the front door to CrewCore's documentation. The four manuals below are the current,
authoritative set; the existing `docs/` subfolders hold the underlying working documents.

## The core manuals (current)

| Document | What it covers | Read it if you… |
|---|---|---|
| **User Manual** | Every screen, both audiences — officials/recruits (interest form → Pathway → Make the Call → steps → check-in → clearance) and board/admins (Command Center, Board Verify, Session Admin, Kiosk). Includes troubleshooting + glossary. | …operate the app or onboard a user |
| **Architecture & Design Manual** | Stack, frontend/backend architecture, data model, the workflow engine, the pluggable-adapter integration design, security model, and design decisions. | …need to understand how it's built |
| **Operations & Go-Live Runbook** | Environments, deployment, config/secrets reference, the consolidated go-live checklist, and incident playbooks. | …deploy, operate, or fix it |
| **SDLC Documentation (compiled, current)** | The eight-phase lifecycle (Planning → Future Releases) reflecting the current build and roadmap. | …want the lifecycle overview |

**Formats & locations.** Each manual is delivered as Word + PDF (in OneDrive `AI Project\RefNet`)
and as markdown in the repo under `docs/manuals/` (the SDLC compilation lives in `docs/sdlc/` and
`docs/artifacts/`).

## Related working documents (existing)

- `docs/sdlc/00–08` — the original eight-phase SDLC snapshot (superseded on differences by the
  current compilation).
- `docs/architecture/` — data-model and UI-architecture working notes.
- `docs/product/` — blueprints, user flows, slice scope docs.
- `docs/decisions/` — ADRs (`ADR-001` is a placeholder to formalize).
- `CLAUDE.md` — the authoritative current-state reference for the repo.
- In OneDrive `AI Project\RefNet`: the integration/adapters spec, go-live checklist, ecosystem
  context, schema-additions spec, scope doc, and the founder/marketing/legal materials.

## Maintenance

Treat the four manuals as living documents. When a slice ships or a go-live item closes, update the
relevant manual (and this index). The markdown copies in the repo are the source of truth; the
Word/PDF in RefNet are generated from them for sharing.
