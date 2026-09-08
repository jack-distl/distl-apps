# Claude Code prompt — SEO Foundations module for the Distl Hub

Paste everything below the line. Put the two reference files somewhere in the repo first (e.g. `/reference/seo-foundations/`) and fix the paths if you move them.

---

I want to add an **SEO Foundations** module to the Hub. There is a working standalone prototype that defines the functionality exactly; your job is to port that functionality into this codebase using the Hub's own design system, data layer and conventions — not to copy its visuals.

## Reference files

- `reference/seo-foundations/seo-foundations-tool-mockup-v2.html` — the prototype. Open it in a browser and read the source. Every feature in it is in scope unless listed under "out of scope" below. The Hammond Legal data in it is sample data only.
- `reference/seo-foundations/Example - Sitemap Import.csv` — the exact CSV our WordPress build imports. The module's export must produce this format byte-for-byte in structure.

## Step 1 — before writing any code

Read the prototype and the existing codebase, then come back to me with:

1. How the prototype's data model (one page tree; each page has name, url, status, template, keywords with one primary, title, meta, h1; versions that layer performance data over the tree) maps onto our existing entities. Tell me what already exists in the Hub that this should reuse — client record, projects, file uploads, versioning, editable fields, tables — and what has to be new.
2. Which Hub design components you'll use for each part of the prototype (cards, tabs, side panel, tables, pill buttons, chips, modal, editable fields). The prototype's colours, fonts and layout are irrelevant; the Hub's design rules win.
3. Anything in the prototype that conflicts with how the Hub works, and your recommendation.
4. Questions. Don't guess on anything structural.

Wait for my answers before building.

## What the module does

**Client context comes from the Hub.** Client name, project, "prepared by" and anything else the Hub already knows are pulled from the client record, never entered here. The prototype hard-codes these — ignore that.

**One data model, everything derives from it.** A single page tree per client. Pages have: name, URL, status (keep / add / opportunity / functional), template, a keyword cluster with exactly one primary keyword and any number of supporting keywords each with monthly volume, title tag, meta description, recommended H1. Templates are a separate list (id, name, description, wireframe blocks). Menus are a separate list (see export).

**Four tabs**, all rendered from that one tree:
- **Sitemap** — with a Tree / Table toggle. Tree is the top-down view: home card, trunk, one silo per top-level page with children stacked beneath, functional pages in their own column. Table is the same pages left-to-right: page (indented by depth), URL, primary keyword, supporting keywords, then either volume/status/template (planning) or position/change/clicks (review). Clicking a page in either view opens the detail panel.
- **Keyword Research** — one card per page that has keywords: cluster name, combined volume, the keyword rows with the primary starred, and a link back to the page.
- **URL Architecture** — flat table of URL, page, template.
- **Templates** — one card per template: name, code, description, wireframe block diagram, chips for every page using it (chips click through to the page).

**Detail panel** (side panel, opens on page click): status chip, page name, URL, template (click jumps to the Templates tab and highlights it), then on review versions a performance block (avg position, clicks with change, keyword rankings table with position and change, Search Console queries table with an anonymous-clicks row so totals reconcile), then keyword cluster table with combined volume, then title tag (with 60-char counter), meta description (160-char counter), H1. Every field is editable in place and edits write back to the model and re-render dependent views.

**Versions.** Two types. *Planning* versions show statuses and volumes. *Review* versions ("6 Month Review", "1 Year Review") layer performance data over the same tree: position of the primary keyword on each card, colour-coded 1–3 / 4–10 / 11–20 / 21+, change since the previous version, clicks. Users switch versions via pills; the whole UI re-renders. Legend changes with version type. A "source strip" shows which uploads fed a review version and when.

**New version modal.** Name the version, upload a Search Console performance export, a rank-tracking export (Ahrefs or SEMrush), and optionally a refreshed volumes file. Matching rules: GSC rows match pages by URL path; ranking rows match keywords exactly; unattributed GSC clicks roll into an anonymous row per page; anything unmatched is listed for review before the version is created — nothing silently dropped. Snapshot is frozen once the version is shared.

**Review cadence** — an editable field on the module header (Quarterly / Annual / etc). Just a field for now.

**Share with client** — hook into whatever the Hub already does for client-facing shares.

## The Hub rule that matters most: template in, then fully editable

This is how everything in the Hub works and this module must follow it. Nothing is authored by hand from scratch and nothing is locked.

- **Landing.** We upload the SEO Foundations source documents for a client (keyword research, proposed sitemap, metadata sheet — you'll need to tell me what formats you can parse and I'll confirm what we actually produce) and the module populates the entire tree from them so the four tabs and detail panels land fully filled, exactly as they'd look if typed in. Same for reviews: upload the exports, the version lands complete.
- **Then everything is editable.** After landing, every page, keyword, field, template and version can be edited, added or removed in place. Simple affordances: an × on anything removable (page, keyword, version, template, upload), inline editing on every text field, add buttons where lists live. No separate "edit mode", no locking after import, no re-upload to make a change.
- **One-way insertion.** Imports populate; they never overwrite edits unless the user explicitly chooses to replace. If the same document is uploaded again, show a diff / confirm, don't silently clobber.
- Every edit persists through the Hub's normal data layer, and the export below always reflects the current edited state, not the imported state.

## Export for WordPress

A button on the module header downloads `<client-slug>-sitemap-import.csv`. Format is fixed by the example file — columns `post_title,parent_title,slug,template,menu,menu_uid,post_type`, three blocks in one file:

1. **Menus** — one row per menu, `post_type=menu`, `menu_uid` = 1..n in order. Default menu set: Primary Navigation, Footer Navigation, Controls Navigation, Legal Navigation, Above Primary Navigation. Editable list.
2. **Templates** — one row per template, `post_type=template`, `menu_uid` = template number that page rows reference.
3. **Pages** — one row per page in tree order, functional pages last. `parent_title` = parent page name (blank for top level), `slug` = last URL segment (blank for home), `template` = template number, `menu` blank (matches the example; keep a flag to populate it), `menu_uid` = 1-based order among siblings — home shares the root numbering with top-level pages, children restart at 1 under each parent. `post_type` = page (or post where the page is flagged as a post).

The prototype's `buildWordPressRows()` implements this and its output has been checked against the example file — port the logic, then run the sample tree through it and diff against `Example - Sitemap Import.csv` structure to prove parity.

Parent for the export and for table indentation is derived from the URL path (so `/about/our-people/` nests under `/about/` even if the tree stores it flat).

## Out of scope for this pass

- Generating a sitemap *from* a bare keyword list (the reverse direction). Later.
- GEO / AI-search visibility. Later layer.
- Live API pulls from GSC or Ahrefs — uploads only for now.
- Any visual styling from the prototype.

## How to work

Step 1 first, wait for me. Then build in this order, checking in after each: data model and persistence → import/landing → Sitemap tab (tree + table) and detail panel with full editing → remaining tabs → versions and review modal → WordPress export with parity test → share. Keep each step small enough to review in one sitting.
