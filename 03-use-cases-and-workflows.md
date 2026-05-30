# 03 — Use Cases and Workflows

How the app actually gets used, internally and externally. Build the features that serve these journeys.

## Roles

- **Team member (internal).** Distl staff: account managers, specialists, leadership. Authenticated. Builds and maintains the library and client boards.
- **Client (external).** A Distl client or prospect. No login. Views their board through a shared link. Read-only.

## Internal use cases

### A. Maintain the backend library
The team keeps the master list of elements current.
- Browse the library grouped by the five columns.
- Add a new element to a column (title, default recommend, default why, default examples, tags, order).
- Edit or retire an element.
- Create and edit industry templates: name the template, select which library elements it includes, set suggested status, phase and order.

Why it matters: the library is the comprehensive backend, like the 40-plus invoice line items. It grows over time as Distl's services evolve. Editing the library must be quick.

### B. Create a new client Blueprint (often as a proposal)
- Create the client: name, and the goal statement (the aspiration anchor, for example "tier one custom home builder in Perth").
- Optionally pick an industry template, which pre-loads a starting selection of elements onto the board.
- The board opens in `draft` or `proposal` stage.

### C. Tailor the board
- Add or remove elements so the board reflects this client only. Pull any library element on, drop ones that don't apply, or add a bespoke element.
- Reorder elements within a column.
- This is the heart of the internal work: turning the comprehensive library into a strategy that is exactly this client.

### D. Fill in the detail (the three fields) and set status
For each element on the client board:
- Set status: green, amber or grey.
- Write or adjust the three fields: why we need it, what we'd recommend (service and tier, client-facing), example inclusions.
- Optionally set a phase (now, next, later) to express sequence.
Keep this fast. Inline editing on the board is ideal. The fields pre-fill from the library defaults so the team is editing, not writing from scratch.

### E. Use it in a proposal
- Walk the prospect through the board: here's the full picture of unstoppable for your industry, here's where you sit, here's exactly what we'd focus on first, here's the order the rest comes in.
- Share the read-only client view link, or present the internal view live.

### F. Run a checkpoint (the living document)
At a strategy review (3, 6, 12 months, whenever):
- Update statuses (amber climbs to green, grey lights to amber) and refresh the fields.
- Save a checkpoint, which snapshots the board with a version and a label.
- Show the client the movement since last time.

### G. Manage sharing
- Toggle `share_enabled` on a client to turn the public link on or off.
- Set the client stage (draft, proposal, live) to reflect where the relationship is.

## External (client) use cases

### H. View the Blueprint
- Open the shared link with no login.
- See the clean board: the goal statement at the top, the five columns, the elements with their green/amber/grey status.
- The view is calm by default and focuses attention on the live priorities. Zooming out to the full board is available but it should not overwhelm. (Behaviourally: lead with the current focus, let the full picture be a deliberate step. The exact interaction is a design decision, but the principle is focus first, full map on demand.)

### I. Understand any element
- Expand an element to read the three fields: why we need it, what we'd recommend (the named service and tier), example inclusions.
- This is where the client sees the substance: not "website yes or no" but why it matters, what we'd do, and what that includes.

### J. See the journey
- Understand what's in place, what's underway, and what's next, in a way that tells the sequencing story: prove the current focus, then add the next while it keeps running. Filling the board is becoming unstoppable.
- Where checkpoints exist, optionally see what has moved since the last review.

## The two views, same data

- **Internal view** is the editor. It exposes the library, tailoring controls, inline status and field editing, phase tags, checkpoints and sharing controls. It is where the team tinkers and adds examples.
- **Client view** is the clean, read-only output of exactly that board. No editing, no library, no internal controls.

This is the same pattern as Distl's other internal apps: a team-editable version, and a clean client-facing result of it.

## Worked example (one client, end to end)

1. Account manager creates "Hale & Verge Homes", goal "tier one custom home builder in Perth", picks the builder template.
2. The board pre-loads with builder-relevant elements. Ecommerce and shopping elements are not included.
3. The manager tailors: keeps ranking pages, local map, paid social showcasing builds, brand identity, industry-leading website, organic social, content engine, email nurture. Removes a couple that don't fit.
4. Sets statuses (local map green, brand identity amber, email nurture grey) and fills the three fields, leaning on the library defaults.
5. Marks brand identity as the first focus (phase now), with a clear "why" and "what we'd recommend: brand identity refresh and guidelines, tier one".
6. Enables sharing and sends the prospect the link. The clean client view shows the strategy.
7. Three months later, after the identity work, the manager flips brand identity to green, lights the next grey to amber, saves a checkpoint, and reviews the movement with the client.
