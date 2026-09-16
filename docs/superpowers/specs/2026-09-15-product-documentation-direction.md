# Stratis Product Documentation Direction

**Status:** Approved 2026-09-15

## Purpose

Make every current Stratis document describe the product that is being built and
marketed now, without rewriting dated beta or closeout material as if it were
current.

## Canonical product statement

> **Stratis is an AI decision facilitator for teams. It works around meetings to
> help people leave aligned on what was decided, what remains open, who owns the
> next step, and why.**

Stratis is not a generic meeting tool, transcription product, or note taker.
Meetings are the setting in which it operates. Transcription is an evidence
layer: it lets Stratis follow the discussion, surface unresolved questions, and
retain the reasoning behind a decision. A transcript alone is a record; decision
clarity, ownership, and follow-through are the outcome.

## Product model

- The core loop is **meeting → decision → action**, while retaining the reasoning
  that connects those stages.
- Stratis augments human facilitation; it does not make decisions for the team.
- A question is an unresolved decision input. A decision is the chosen outcome.
  These terms must not be used interchangeably.
- The public product is the native Stratis app.
- The website remains a controlled MVP for beta teams. Later, it becomes the
  download and home page for the app. It is not the public product focus.

## Commercial model

- The app is free for now and may accept voluntary donations.
- There is no donation link yet.
- No paid plans, feature gates, prices, usage caps, subscriptions, or upgrade
  promises are decided or may be presented as current product policy.
- Ten beta teams were invited, but only three produced usable meeting records.
  That is not enough evidence to price the product. Pricing will be decided only
  after broader app usage makes costs and usage patterns measurable.

## Documentation taxonomy

| Class | Treatment |
|---|---|
| Current product and contributor docs | Replace retired positioning and commercial claims with this specification. |
| Current technical docs | Keep code facts, but distinguish an existing beta implementation from public-product policy. |
| Design and implementation plans | Keep as dated records; add a clear pointer when a reader could mistake them for current scope. |
| Closeout deliverables and `.docx` files | Preserve as dated historical records. Do not rewrite their claims. Add an archive index and banner pointing to current documentation. |

## Out of scope

- Changing the website frontend or backend, including current billing, pricing,
  entitlement, or landing-page code.
- Adding a donation mechanism or choosing a price.
- Rewriting historical beta/closeout documents to conceal what they said at the
  time.

