# 04 — Feature Scope and Acceptance Criteria

What to build for the beta, what to leave for later, and how we know it's done.

## Beta goal

A working app, deployed on Vercel and backed by Supabase, that the team can use to build a real client Blueprint and share a clean client view of it. Real, not a static mockup.

## In scope for the beta

### Backend library management (internal)
- View the library grouped by the five columns.
- Create, edit, retire library elements (title, default recommend, default why, default examples, tags, sort order).
- Create and edit industry templates and their element selections with suggested status and order.
- Seed the library and templates from the data in `05-backend-library-seed.md` on first run.

### Client and board management (internal)
- Create a client with name and goal statement.
- Optionally apply an industry template, which copies its elements onto the client's board.
- Add, remove, reorder client elements. Pull any library element onto the board, or add a bespoke element.
- Inline edit each client element: status (green/amber/grey), the three fields, optional phase.
- Set client stage (draft, proposal, live).
- Create a checkpoint that snapshots the board with a version and label.
- Toggle the public share link on or off.

### Client view (external)
- A read-only board reachable by share link without login.
- Shows the goal statement, the five columns, the elements with status colour, and the expandable three fields per element.
- Leads with the current focus, full board available without overwhelming. Exact interaction is a design choice, the principle is focus first.

### Platform
- Auth for the team via Supabase Auth.
- Row Level Security as described in the data model file: team users full access, public access only to a shared client board via token through an RPC.
- Deployed to Vercel, connected to Supabase.

## Acceptance criteria (the beta is done when)

1. A team member can log in.
2. The library and templates are seeded and visible, grouped by the five columns.
3. A team member can create a client, set a goal, apply the builder template, and see the board pre-populate.
4. They can tailor the board: add, remove, reorder elements, and add a bespoke element.
5. They can set each element's status and edit the three fields inline, with library defaults pre-filled.
6. They can enable sharing and open the client view via the share link in an incognito window with no login.
7. The client view shows the tailored board, correct statuses, and the three fields on expand. It does not expose the library, other clients, or internal controls.
8. They can save a checkpoint and see it recorded with a version and timestamp.
9. The whole thing runs on the deployed Vercel URL against Supabase, not just locally.

## Explicitly out of scope for the beta

- Visual design polish, theming, and brand styling. Build clean, accessible, functional structure. Distl will apply its design system.
- Client logins and accounts. Use share links.
- Screenshot or file uploads in example inclusions. Plain text and plain URLs only.
- Live data integrations (ad platforms, analytics, GA4). Statuses are set manually.
- Billing, invoicing, notifications, automated reminders.
- The checkpoint comparison view ("what moved since last time") is a nice-to-have. Storing snapshots is required, rendering the diff is optional for the beta.

## Suggested build order

1. Schema and seed (data model file + seed file).
2. Auth and the internal library manager.
3. Client creation, template application, board tailoring.
4. Inline status and three-field editing.
5. Share token and the public client view.
6. Checkpoints (save snapshot).
7. Deploy to Vercel, verify against the acceptance criteria.

## Non-functional notes

- Keep the editing experience fast. Inline edits, optimistic updates, minimal page reloads.
- The board must hold a comprehensive backend without the client view ever leaking the full library.
- Align with the existing repo's framework, conventions and Supabase project. If starting fresh, Next.js on Vercel with the Supabase client is the assumed stack.
