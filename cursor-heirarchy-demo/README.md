# Hierarchy Tool

A minimal Vite + React playground for exploring hierarchy and relationship
ideas between workspaces, projects, and threads.

- **Sidebar** — workspaces at the root, each containing loose threads and
  projects; projects contain their own threads.
- **Chat panel** — selecting a root thread shows a single chat; selecting a
  project shows the project chat with its thread list; selecting a project
  thread opens a split (project left, thread right).

Visual tokens are ported from `cursor-neue` (`src/styles/tokens.css` +
`tailwind.config.ts`), intentionally without window chrome or other shell
styling.

## Run

```bash
npm install
npm run dev
```

Sidebar content is seeded from `src/workspaces.json` — edit it to reshape the
hierarchy (`src/data.ts` loads and types it). Runtime creations (new
chats/threads) live in App state on top of the seed.
