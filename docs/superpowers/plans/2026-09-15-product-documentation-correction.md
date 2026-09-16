# Product Documentation Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Stratis's active documentation accurately describe its approved
decision-facilitation scope, app-first public focus, and currently undecided
commercial model.

**Architecture:** A single approved product-direction specification becomes the
source for current product copy. Current repositories link to that source and
replace conflicting claims. Dated beta and closeout records remain intact but
gain a prominent archive boundary so they are not mistaken for current policy.

**Tech Stack:** Markdown documentation in the Stratis web repository, the native
desktop repository, and the historical media directory.

**Spec:** `docs/superpowers/specs/2026-09-15-product-documentation-direction.md`

## Global Constraints

- Use the exact canonical product statement from the specification.
- Never call Stratis a generic meeting tool, transcription product, or note taker.
- Describe transcription as evidence for facilitation, not the product outcome.
- State that the native app is public focus; the website is the controlled beta
  MVP and later app-download/home page.
- State that the app is free for now with voluntary donations; no donation link
  exists yet.
- Do not state or imply prices, subscriptions, plan gates, usage caps, upgrades,
  or decided paid features.
- Preserve dated closeout `.docx` files and historical implementation plans.
- Do not change website frontend or backend code in this work.
- Do not commit or push.

---

### Task 1: Establish the active product source of truth

**Files:**
- Create: `Stratis/docs/context/00-current-direction.md`
- Modify: `Stratis/docs/context/README.md`
- Modify: `Stratis/docs/context/01-core-product.md`
- Modify: `Stratis/docs/context/05-corrections.md`

**Interfaces:**
- Consumes: approved specification at `Stratis/docs/superpowers/specs/2026-09-15-product-documentation-direction.md`.
- Produces: one current product document linked from the context index; all
  existing product rules defer to it without contradiction.

- [ ] **Step 1: Add the active-direction document**

Write the approved canonical statement, decision loop, terminology, app/website
relationship, free/donation state, pricing evidence gap, and explicit exclusions
from the specification. Its first paragraph must state that it is the current
source of truth for product direction and commercial claims.

- [ ] **Step 2: Update the context index**

Add `00-current-direction.md` as the first item in the context-library table and
tell contributors to read it before making customer-facing or product-policy
changes.

- [ ] **Step 3: Replace retired product and pricing rules**

In `01-core-product.md`, replace the subscription, Free/Pro/Beta, gate, cap, and
Thai-market-pricing sections with links to the new source and the approved
current policy. In `05-corrections.md`, add a dated correction recording that
the subscription model, paid feature decisions, and website-first framing are
superseded.

- [ ] **Step 4: Inspect for contradictions**

Run:

```powershell
rg -n -i "subscription|monthly/yearly|free is capped|\bpro\b|paid feature|upgrade|pricing tier|per-seat|meeting tool|note taker" Stratis/docs/context
```

Expected: remaining matches are either explicit historical correction entries or
clear statements that the claim is retired; no current rule presents it as policy.

### Task 2: Correct current web-repository documentation

**Files:**
- Modify: `Stratis/README.md`
- Modify: `Stratis/PRODUCT.md`
- Modify: `Stratis/DESIGN.md`
- Modify: `Stratis/docs/context/02-ux-ui.md`
- Modify: `Stratis/docs/context/03-engineering.md`
- Modify: `Stratis/docs/context/04-environment.md`
- Modify: `Stratis/docs/demo-script-15min.md`

**Interfaces:**
- Consumes: `Stratis/docs/context/00-current-direction.md`.
- Produces: repo-entry, product, design, UX, engineering, environment, and demo
  documentation that separates beta implementation facts from public policy.

- [ ] **Step 1: Replace scope copy in the entry and product documents**

Use this lead copy in `README.md`, `PRODUCT.md`, and `DESIGN.md`:

```markdown
Stratis is an AI decision facilitator for teams. It works around meetings to
help people leave aligned on what was decided, what remains open, who owns the
next step, and why.
```

Immediately explain that live transcription is evidence for this outcome rather
than Stratis's category. Link to `docs/context/00-current-direction.md`.

- [ ] **Step 2: Retire commercial-policy references in supporting docs**

Replace UX references to locked Pro behavior with a rule not to imply commercial
tiers while pricing is unvalidated. In engineering and environment documents,
label existing billing/entitlement or deployment details as beta implementation
facts where they remain useful, not public commercial commitments. Resolve
conflicting deployment assertions only from checked source configuration; if no
source establishes the live host, write `verify before deployment` rather than
guessing.

- [ ] **Step 3: Rewrite the demo's pricing scenario**

Keep the script's transcript and decision-testing purpose, but change the
scenario from a chosen Free/Pro tier to an explicitly unresolved pricing
decision. It must reflect free app access, voluntary donations without a link,
and the insufficient three-team usage evidence.

- [ ] **Step 4: Inspect customer-facing claims**

Run:

```powershell
rg -n -i "co-facilitator|meeting tool|note taker|subscription|\bpro\b|upgrade|pricing tier|30 นาที|unlimited meeting" Stratis/README.md Stratis/PRODUCT.md Stratis/DESIGN.md Stratis/docs
```

Expected: the current documents use the approved decision-facilitator language;
old commercial language survives only in explicitly historical records.

### Task 3: Establish the app-first documentation boundary

**Files:**
- Create: `stratis-desktop/docs/CURRENT-PRODUCT-DIRECTION.md`
- Modify: `stratis-desktop/README.md`
- Modify: `stratis-desktop/docs/specs/2026-09-11-desktop-app-design.md`
- Modify: `stratis-desktop/docs/specs/2026-09-13-everything-to-build.md`

**Interfaces:**
- Consumes: the approved specification in the web repository.
- Produces: a native-app entry point that is current, while prior design specs
  remain usable as dated implementation records.

- [ ] **Step 1: Add a local pointer document**

Create the desktop document with the canonical product statement and a relative
link to `../../Stratis/docs/context/00-current-direction.md`. State that the
desktop app is the public-product focus and that the website is the beta MVP and
later download/home surface.

- [ ] **Step 2: Update the desktop README**

Replace its one-line generic description with app-first positioning and links to
both the local pointer document and the active web-repository source of truth.
Do not alter build, packaging, or sign-in instructions.

- [ ] **Step 3: Add a dated-current-scope notice to old desktop specs**

At the top of the two listed design specs, add a short notice that their
technical and UX decisions are dated, and current product/commercial direction
lives in `CURRENT-PRODUCT-DIRECTION.md`. Do not alter planned implementation
steps or the user's uncommitted redesign work.

- [ ] **Step 4: Inspect the app documentation**

Run:

```powershell
rg -n -i "public product|website|beta|pricing|subscription|\bpro\b|decision facilitator" stratis-desktop/README.md stratis-desktop/docs
```

Expected: README and pointer document agree on app-first focus; prior specs are
visibly dated rather than silently treated as current scope.

### Task 4: Preserve and label historical closeout material

**Files:**
- Create: `stratis-media/Stratis-closeout-docs/README.md`
- Modify: `stratis-media/Stratis-closeout-docs/CHANGES.md`
- Modify: `stratis-media/Stratis-closeout-docs/PRESENT-DATABASE.md`

**Interfaces:**
- Consumes: current source at `Stratis/docs/context/00-current-direction.md`.
- Produces: an archive index that separates July beta/closeout records from
  current product and technical documentation.

- [ ] **Step 1: Create the archive index**

State that the directory contains dated beta/closeout deliverables, including
the `.docx` files; they must not be used for current product scope, pricing,
deployment, database, or credential decisions. Link to the active product source
and `Stratis/backend/src/db/schema.sql` for current schema facts.

- [ ] **Step 2: Add archive banners**

Add a concise top-of-file banner to both database Markdown files: they are
historical snapshots, not current schema/deployment authority; direct readers to
the schema source and archive index. Preserve all existing body text.

- [ ] **Step 3: Protect historical artifacts**

Do not edit `TOR.docx`, `TEST-REPORT.docx`, `KNOWN-ISSUES.docx`,
`SETUP-GUIDE.docx`, or `LINKS.docx`. The archive index must identify them as
historical. It must not repeat any credentials that may appear in them.

- [ ] **Step 4: Inspect archive boundaries**

Run:

```powershell
rg -n -i "historical|archive|current source|source of truth" stratis-media/Stratis-closeout-docs
```

Expected: every Markdown entry point makes the historical/current distinction
before asserting a schema or deployment fact.

### Task 5: Final documentation verification

**Files:**
- Verify: all files changed in Tasks 1–4.

**Interfaces:**
- Consumes: completed documentation changes.
- Produces: evidence that all current entry points agree and no product code was
  changed.

- [ ] **Step 1: Review the documentation diff**

Run:

```powershell
git -C Stratis diff --check
git -C Stratis diff -- docs README.md PRODUCT.md DESIGN.md
git -C stratis-desktop diff --check
git -C stratis-desktop diff -- README.md docs
```

Expected: no whitespace errors; all changes are documentation-only. Review the
media directory with `git diff --no-index` only if it is initialized as a Git
repository; otherwise list changed files directly.

- [ ] **Step 2: Scan for retired claims outside intentional history**

Run:

```powershell
rg -n -i "workspace-based subscription|Free is capped|everything in Free|\bPro\b sells|pricing tier.*launch|30 นาทีต่อเดือน|unlimited meeting" Stratis stratis-desktop stratis-media
```

Expected: matches are limited to deliberately preserved historical plans,
closeout artifacts, or explicit archive/correction explanations; none occurs in
the current source-of-truth or repo entry documents.

- [ ] **Step 3: Report verification limits**

Report the files changed and scan results. Do not claim website/frontend/backend
behavior changed or run application tests: this plan changes documentation only.

