# Unstoppable Blueprint — Build Brief

This folder is the complete brief for building the Unstoppable Blueprint app: a per-client visual strategy board Distl uses as a proposal tool and a living retainer artifact. It is a research-preview brief for the Claude Code build team. Read the files in order.

## What we're building (one line)

A web app, deployed on Vercel and backed by Supabase, with an internal team-editable backend and a clean read-only client view, that produces a tailored "unstoppable" strategy board for each client from a comprehensive backend library.

## Files, in reading order

1. `01-product-overview.md` — what it is, why it exists, the outcomes, what the beta must achieve.
2. `02-data-model-and-schema.md` — entities, relationships, Postgres/Supabase DDL, access model.
3. `03-use-cases-and-workflows.md` — roles and the internal and external journeys.
4. `04-feature-scope-and-acceptance.md` — beta scope, acceptance criteria, build order.
5. `05-backend-library-seed.md` — the comprehensive element library, industry templates, and a JSON seed to load.
6. `06-principles-and-guardrails.md` — terminology and hard rules that keep the build on direction.
7. `PROMPT-for-claude-code.md` — the prompt to paste into Claude Code to start the build.

## The non-negotiables (full detail in file 06)

- Five fixed columns: Be Findable, Be There When Intent Is High, Be Known and Trusted, Be Worth Choosing, Be Remembered.
- Comprehensive backend library, tailored client board. The client only ever sees their selected subset.
- Elements are outcomes, not service names. The service and tier live in the "what we'd recommend" field, which is client-facing.
- Status is green, amber, grey only. No red.
- Three fields per element: why we need it, what we'd recommend, example inclusions. Low effort to fill.
- Two views over one dataset: internal editor, external clean read-only board.
- Industry-agnostic.
- Styling is out of scope. Distl applies its own design system.

## Tech

Vercel plus Supabase. Align with Distl's existing app repo, conventions and Supabase project. If starting fresh, Next.js plus the Supabase client is the assumed stack.

## Definition of done for the beta

The acceptance criteria in `04-feature-scope-and-acceptance.md` all pass, on the deployed Vercel URL against Supabase. The team can build and share a real client Blueprint.
