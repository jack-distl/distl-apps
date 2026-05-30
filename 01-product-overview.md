# 01 — Product Overview: The Unstoppable Blueprint

## What it is

The Unstoppable Blueprint is a web app that produces and maintains a single visual board for each Distl client, showing exactly what their business needs to become unstoppable in its industry, scored against where they sit right now.

It has two faces over the same data:

- An **internal view** where the Distl team builds and edits each client's board, sets statuses, and fills in the detail behind every element.
- An **external (client) view** that presents the clean, read-only result the client sees.

This mirrors how Distl's other internal apps already work: a team-editable version that staff adjust, tinker with and add examples to, and a client view that is the clean visual output of that.

The app is backed by an editable **backend library** of every possible element, from which each client's board is tailored. The client never sees the full library. They see the handful that's right for them.

## The core idea, in one paragraph

The columns of the board are the outcomes a business needs to be unstoppable: Be Findable, Be There When Intent Is High, Be Known and Trusted, Be Worth Choosing, Be Remembered. Under each column sit elements written as outcomes the client cares about (for example "a Google Business Profile that owns your local map"), each carrying a green, amber or grey status. Every element opens into three fields: why we need it, what we'd recommend (the actual service and tier, shown to the client), and example inclusions. The board is built per client from the backend library, so what the client sees is a tailored strategy that is precisely them. It opens as a proposal and becomes the living artifact the team and client return to at every checkpoint.

## Why it exists (the business outcomes)

1. **A sales and proposal tool.** It lets Distl walk a prospect through "if we were in your shoes, this is exactly what we'd focus on first, and here's the potential once these are firing." It makes the breadth of Distl's in-house offer visible and concrete.
2. **A living retainer artifact.** After signing, the same board becomes the thing the client returns to. Not weekly. It is the reference point for where they're headed and what the next jump is.
3. **A retention and growth engine.** As elements move from grey to amber to green across checkpoints, the client sees momentum. The sequence of greys is the natural, honest path to more services, framed as "let's get this proven and profitable, then add the next thing."
4. **A differentiator.** Because Distl delivers every element in-house, this is something single-channel Perth competitors cannot put in front of a client.

## The sequencing narrative the product must support

The grey elements are not a pile of upsells. They are a sequence. For many clients the play is: pick the two or three things that matter most, get them proven and profitable, build trust they are working, then add the next while the first keeps running. Filling the whole board is how a business becomes unstoppable. The product should make this sequence legible: the full destination is visible from day one, alongside what we'd start with and the order it comes in.

## What this beta needs to achieve

By the end of the Claude Code build session, there should be a working beta, deployed on Vercel and backed by Supabase, that can:

1. Hold the comprehensive backend library of elements, editable by the team.
2. Create a client, set their goal, and tailor their board by selecting elements from the library.
3. Let the team set each element's status and fill the three fields.
4. Produce a clean, shareable client view of that board.
5. Be usable for a real client, not just a static mockup.

Styling, colour and presentation are out of scope for this brief. Distl has existing style and colour guides and an existing app codebase and database to align with. This brief covers how the product is used, the outcomes, the use cases, and the data and behaviour it needs.
