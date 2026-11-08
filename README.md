# Helpmebudget — personal budgeting PWA

A standalone budgeting app that runs entirely in your browser. No servers, no
accounts, no cloud — all data lives in your own browser storage. Once loaded,
it works fully offline.

- **Live:** https://jaxki97.github.io/money-hq/
- **Repo:** https://github.com/Jaxki97/money-hq (public — ships with **no**
  financial data; see "Privacy" below)
- **Main device:** Mac mini, installed as a Safari "Add to Dock" web app.

## What it does

- **Overview** — charts and monthly category breakdowns from imported
  transactions (CSV import via PapaParse).
- **Buckets** — fixed vs flexible expenses for the pay period, with a
  "This pay period" card and an info tooltip on the take-home field.
- **Savings goals** — manual contributions tracked against a target, shown as
  a filling progress bar ("🎯 Target achieved" when reached).
- **History** — logged paycheque splits (separate from imported transactions).
- **Accounts** — backup/restore, storage diagnostics, and app-refresh controls.

## Storage & durability

All data (buckets, paycheque history, transactions, accounts, learned
categorization rules, savings goals) is saved **twice** — to IndexedDB **and**
mirrored to localStorage — because Safari web apps were evicting IndexedDB
between launches. Reads fall back between the two stores. The app also calls
`navigator.storage.persist()` to request eviction protection.

**Still back up occasionally.** Accounts → "Backup your data" downloads a full
JSON snapshot. Do it after a big CSV import or before clearing browser data.
This is the only copy that survives clearing site data or switching devices.

## If the app looks stale or a tab won't open

Safari can pin an old cached version. Fix, easiest first:

1. In the app: **Accounts → "Refresh app & clear cache"**.
2. Visit **https://jaxki97.github.io/money-hq/reset.html** — clears the stale
   service worker and cache **without touching your data**, then reloads.
3. Last resort: Safari → Settings → Privacy → Manage Website Data → remove
   `jaxki97.github.io`, then quit and reopen Safari. (Your data survives if
   you've kept a backup; this step can clear it, so back up first.)

The Accounts tab shows a storage diagnostic (build version, which stores hold
data, whether persistence was granted, and how many records loaded).

## Privacy

The public repo ships **empty** — no real transactions, names, or employers.
Real data only ever lives in your browser and in backup JSON files you keep
locally. Backups, private data exports, and CSVs are gitignored so they can't
be committed by accident. **Never commit a file containing real financial
data.**

## Files

| File | Purpose |
|---|---|
| `index.html` | The whole app |
| `storage-shim.js` | Dual-store (IndexedDB + localStorage) persistence layer |
| `sw.js` | Service worker — network-first, offline fallback, cache versioning |
| `reset.html` | Clears a stale worker/cache without touching data |
| `manifest.json` | PWA metadata (name, icons, colors) |
| `logo.svg` | Coin logo (tab icon / favicon) |
| `icon-192.png`, `icon-512.png` | PWA install icons |
| `chart.umd.min.js` | Self-hosted Chart.js (no CDN) |
| `papaparse.min.js` | Self-hosted PapaParse CSV parser (no CDN) |

## Deploying

Already deployed via GitHub Pages (main branch, root). To update: edit, commit,
push to `main` — Pages redeploys automatically. For changes that must purge the
old cache (renamed/deleted files, or anything sensitive), bump `CACHE_NAME` in
`sw.js`. See `CLAUDE.md` for the full technical context and gotchas.
