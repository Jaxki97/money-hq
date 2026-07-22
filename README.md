# Money HQ — PWA version

This is the standalone version of Money HQ, converted from the Claude artifact
to run entirely in your browser using **IndexedDB** for storage instead of
Claude's storage API. Nothing here depends on Anthropic's servers — once it's
loaded once, it works fully offline.

## What's different from the Claude version

- **Storage**: all your data (buckets, paycheque history, transactions,
  accounts, learned categorization rules) is saved in IndexedDB, a real
  database built into your browser. It survives closing the tab, restarting
  your Mac, everything short of you explicitly clearing browser data for
  this site.
- **Installable**: this is a PWA (Progressive Web App) — you can "Add to
  Dock" / "Install app" from your browser, and it opens like a normal app
  window with its own icon, no browser chrome.
- **Offline-capable**: a service worker caches the app shell so it loads
  even without internet after the first visit.
- **Backup/restore**: the Accounts tab has a "Backup your data" card —
  download a full JSON snapshot any time, and restore from it on any device
  or browser. Do this occasionally, especially before clearing browser data
  or switching computers.

## Deploying to GitHub Pages (same pattern as your training log)

1. Create a new GitHub repo (e.g. `money-hq`), or a folder inside an
   existing one.
2. Copy these 6 files into it:
   - `index.html`
   - `storage-shim.js`
   - `manifest.json`
   - `sw.js`
   - `icon-192.png`
   - `icon-512.png`
3. Push to GitHub.
4. In the repo settings → Pages, set the source to your main branch
   (root folder), same as `jaxki97.github.io/My-Training-Log`.
5. Visit `https://jaxki97.github.io/money-hq/` (or whatever repo name you
   used) — it should load, and your browser will offer to install it.

## First-time setup after deploying

Your Claude artifact's data does **not** automatically transfer — it lived
in Claude's storage, this version uses your browser's storage instead.
Two ways to get your data in:

**Option A — start fresh**: just use it normally from today. Nothing
carries over, but nothing's broken either — same defaults as when the
Claude version first launched.

**Option B — bring your data over** (recommended, since you've already
logged real paycheques and uploaded real CSVs):
1. In the **Claude artifact**, go to Accounts → "Download full backup
   (.json)"
2. Open the **new PWA version** (this one)
3. Go to Accounts → click "Restore from backup" → select that file
4. Everything — buckets, history, transactions, accounts, learned rules —
   loads in

## Ongoing safety habit

Since this now lives only on your device (no cloud backup from Anthropic
to fall back on), it's worth downloading a backup every so often —
especially after a big CSV upload or before doing anything that clears
browser storage. The file is small (plain JSON) and easy to keep in
whatever folder you already use for financial records.

## Files in this package

| File | Purpose |
|---|---|
| `index.html` | The app itself |
| `storage-shim.js` | IndexedDB-backed replacement for Claude's storage API |
| `manifest.json` | PWA metadata (name, icons, colors) |
| `sw.js` | Service worker — enables offline use and installability |
| `icon-192.png`, `icon-512.png` | App icons (placeholders — swap for your own anytime) |
