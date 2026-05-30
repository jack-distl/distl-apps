# 06 — Principles and Guardrails

These keep the build on the direction we set. Read before making product decisions. If a choice would break one of these, stop and flag it.

## Terminology (use these exact terms in code and UI)

- **Board** / **Blueprint**: the full visual for one client.
- **Column** / **Domain**: one of the five outcome areas across the top.
- **Element**: one outcome card under a column.
- **Library** / **backend library**: the comprehensive master set of elements the team can edit and add to.
- **Client element**: an element placed on a specific client's board, with that client's status and fields.
- **Status**: green, amber or grey.
- **The three fields**: why we need it, what we'd recommend, example inclusions.
- **Checkpoint**: a saved version of a client's board at a point in time.
- **Goal / aspiration anchor**: the client's target position (for example "tier one custom home builder in Perth").

## The five columns (fixed set, editable in backend, but this is the default)

1. Be Findable
2. Be There When Intent Is High
3. Be Known and Trusted
4. Be Worth Choosing
5. Be Remembered

Do not add a "Be In Control" or "Strategy and Reporting" column. Strategy and reporting is baked into every service, and the strategy is the Blueprint itself.

## Hard rules

1. **Comprehensive backend, tailored client view.** The library holds everything. Each client board shows only the selected subset. This is the central architecture, modelled on Distl's invoicing (40-plus possible line items, a client sees a few). Never show the full library on a client board.

2. **Elements are outcomes, not service names.** The card headline is the outcome the client cares about ("an industry-leading website that earns instant credibility"), not "Web design". The service name lives in the "what we'd recommend" field.

3. **"What we'd recommend" is client-facing.** It names the actual service and tier (for example "SEO retainer, tier one"). It is shown to the client, not hidden.

4. **Status is green / amber / grey only.** No red. Green is in place and competitive. Amber is happening but can be pushed further. Grey is not started yet.

5. **The three fields are low-effort.** Why we need it, what we'd recommend, example inclusions. Keep inputs simple and fast for the team and the proposal process. Example inclusions may contain plain text and at most plain URLs. No screenshot uploads or heavy asset management in the beta.

6. **Industry-agnostic.** The product is not built for any one industry. Builders, law firms, hospitality, e-commerce, trades, professional services all use it. The backend library spans all of them. Industry templates pre-load a likely starting selection, then the team tailors.

7. **Every element is judged against the client's goal.** "A website" is meaningless. "An industry-leading website" measured against "tier one builder in Perth" is the unit. The goal statement is set per client and frames every status.

8. **The sequence is honest, not pushy.** Grey elements are a planned order of play, not random upsells. The product should let the team express "prove this first, then add the next."

## Out of scope for this brief

- Visual styling, colour, typography, layout polish. Distl has its own style and colour guides and an existing app to align with. Build functional, clean, accessible structure and let Distl's design system dress it.
- Billing, invoicing, time tracking.
- Client logins with passwords (use shareable read-only links for the beta, see the data model file).
- Automated data pulls from ad platforms or analytics. Statuses and fields are set by the team for now.

## Tone of any default copy you generate

If you seed any default text (element descriptions, starter "why" text), follow Distl's voice: candid, plain, direct, Australian English, no em dashes, no jargon like "leverage" or "utilise", no hype. Write like clear advice, not marketing fluff. The team will edit it anyway, so keep defaults short and honest.
