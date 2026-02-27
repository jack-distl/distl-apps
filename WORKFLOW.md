# How This All Works (Plain English)

This is your cheat sheet for understanding how the Distl platform is built, deployed, and managed. No jargon.

---

## The Big Picture

You have three services working together:

```
GitHub                    Vercel                    Supabase
(stores the code)   →    (hosts the website)   ←   (the database)
```

- **GitHub** is like a filing cabinet for your code. It keeps every version of every file, so you can always go back.
- **Vercel** watches GitHub. When code changes, Vercel automatically rebuilds and publishes the website.
- **Supabase** is the database — it stores all the client data, OKR plans, etc. It's separate from the code.

---

## The Two Branches

Think of branches like two copies of your project:

### `main` — The live version
- This is what's actually running on your production website
- **Never edit this directly**
- Changes only get here after you've tested them

### `testing` — The safe playground
- This is where all new work happens first
- Has its own preview URL so you can check it before it goes live
- If something breaks here, no one sees it — the live site is unaffected

### How changes flow

```
Claude makes changes → testing branch → you check the preview → merge to main → live site updates
```

It's like drafting an email vs sending it. `testing` is the draft, `main` is the sent email.

---

## Working with Claude Code

When you start a Claude Code session, here's what to tell it:

### "Build me a thing" (normal work)
Just describe what you want. Claude will make changes on `testing`. You'll get a preview link to check.

### "This looks good, push it live"
Tell Claude: **"Merge testing into main"** — this moves your tested changes to the live site.

### "Undo that last change"
Tell Claude: **"Revert the last commit on testing"** — this undoes the most recent change.

### "Go back to how it was yesterday"
Tell Claude: **"Reset testing to match main"** — this throws away all testing changes and starts fresh from what's live.

### "I want to try something risky"
Tell Claude: **"Create a new branch called experiment from testing"** — this gives you a third copy to mess around with, without touching even the testing version.

---

## Vercel Setup

You should have **one** Vercel project connected to this GitHub repo.

### What Vercel does automatically:
- Push to `main` → deploys to your production URL (e.g., `distl-platform.vercel.app`)
- Push to `testing` → deploys to a preview URL (e.g., `distl-platform-testing-abc123.vercel.app`)
- Every Pull Request → gets its own temporary preview URL

### If you have two Vercel projects
You probably created a second one by accident. You only need one. To fix:
1. Go to [vercel.com/dashboard](https://vercel.com)
2. Find the Distl project(s)
3. Keep the one that's connected to `jack-distl/distl-apps`
4. Delete the other one (Settings → scroll to bottom → Delete Project)

### Setting the production branch
In Vercel project settings:
1. Go to Settings → Git
2. Set "Production Branch" to `main`
3. This ensures only `main` deploys to the real URL

---

## Common Scenarios

### "I messed up and want to start over"
Don't panic. Git keeps everything. Tell Claude Code:
> "Reset the testing branch to match main"

This wipes all testing changes and gives you a fresh start.

### "The live site is broken"
Tell Claude Code:
> "Revert the last merge to main"

This undoes the most recent change to the live site.

### "I want to see what changed"
Tell Claude Code:
> "Show me what's different between testing and main"

This shows you exactly what would change if you merged.

### "I want to clean up old branches"
Tell Claude Code:
> "Delete all branches except main and testing"

This tidies up without affecting anything.

---

## The Files That Matter

| File | What it does |
|------|-------------|
| `src/` folder | All the actual app code (pages, components, logic) |
| `supabase/migrations/` | Database setup scripts |
| `package.json` | List of dependencies (libraries the app needs) |
| `vercel.json` | How Vercel builds and serves the site |
| `CLAUDE.md` | Instructions for Claude Code (it reads this automatically) |
| `WORKFLOW.md` | This file — your reference guide |
| `.env.example` | Template for secret keys (Supabase connection) |

---

## Glossary

| Term | What it means |
|------|--------------|
| **Branch** | A separate copy of the code. Like having a "draft" and a "final" version. |
| **Commit** | A saved snapshot of changes. Like pressing "save" with a note about what you changed. |
| **Merge** | Combining one branch into another. Like accepting changes from a draft into the final. |
| **Pull Request (PR)** | A formal request to merge changes. Shows you what will change before you approve it. |
| **Revert** | Undoing a specific change. Like "ctrl+Z" but for a specific commit. |
| **Deploy** | Publishing the code as a live website. Vercel does this automatically. |
| **Preview URL** | A temporary website URL that Vercel creates so you can check changes before they go live. |

---

*Last updated: February 2026*
