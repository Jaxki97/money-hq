# CLAUDE.md — Helpmebudget project context

Read this first. It's the condensed state of the project so a new chat can pick
up without re-deriving everything. (User-facing overview lives in `README.md`.)

## What this is

**Helpmebudget** (formerly "Money HQ") — a personal budgeting PWA, pure
client-side, no backend. Runs entirely in the browser; works offline after
first load.

- Live: https://jaxki97.github.io/money-hq/
- Repo: https://github.com/Jaxki97/money-hq (public, GitHub Pages: main/root)
- Current build: `v10` (`window.APP_BUILD` in index.html, `CACHE_NAME` in sw.js —
  **keep these in sync**).
- User's main device: Mac mini, Safari "Add to Dock" web app. A separate
  "training log" app (repo `Jaxki97/My-Training-Log`) lives on their phone and
  shares the `jaxki97.github.io` origin.

## ⚠️ Privacy — the thing to never get wrong

The public repo must ship with **zero real financial data**. Real data (≈624
txns, 7 months, real names/employer) lives ONLY in:
`../money-hq-private-data.json` (one level up from the repo, gitignored, the
sole copy) and in backup JSON the user keeps locally.

- `BAKED_RAW` in index.html is stripped to empty: `{"months":[],
  "monthly_category_net":{},"monthly_txns":{}}`. `personalRules` ships empty too.
- Real data enters the live app only at runtime via backup restore / CSV import.
- `.gitignore` blocks `*private*.json`, `*backup*.json`, `money-hq-backup-*.json`,
  `*.csv`. **Before any publish/commit, grep the actual file contents** for
  names/amounts, not just filenames. (This repo already leaked once via
  `BAKED_RAW`; it was fully deleted/recreated and stripped.)

## Architecture / data model

- **Two independent data streams** (don't confuse them):
  - `TXNS` — imported transactions, keyed by `YYYY-MM` month → feed **Overview**.
  - `payHistory` — logged paycheque splits → feed **History**. An empty History
    is normal, not a bug.
- `storage-shim.js` exposes `window.storage`: writes every value to BOTH
  IndexedDB (DB `money-hq-db`, store `kv`) and localStorage (keys prefixed
  `mhq:`); reads fall back between stores. This dual-store exists because Safari
  web apps evict IndexedDB between launches. `navigator.storage.persist()` is
  requested on init.
- Vendored libs, **no CDN**: `chart.umd.min.js` (Chart.js 4.4.1),
  `papaparse.min.js` (PapaParse 5.4.1). CDN+SRI was failing to load in Safari and
  a blocked Chart.js made `new Chart()` throw inside `buildOverview()`.
- `sw.js` is **network-first** with cache fallback (never cache-first — an old
  cache-first worker pinned stale/leaked data). Activate deletes all caches whose
  name ≠ `CACHE_NAME`, so bumping `CACHE_NAME` is what forces a purge.

## Hard-won gotchas (these caused real bugs)

1. **Month-field crash** — baked/backup txn records carry NO per-record `month`
   field. On reload, month must be derived from `r.date.slice(0,7)` in
   `mergeTxnsIntoState`; `monthShort`/`monthLabel` are hardened against non-string
   input. Without this, Overview crashes only on restart (worked after a fresh
   restore because MONTHS came from `backup.months`).
2. **Safari stale service worker** — deleting/re-adding the Dock app does NOT
   clear the worker (it lives in Safari's website data for the origin). Recovery:
   in-app **Accounts → "Refresh app & clear cache"**, or load `reset.html` (not
   cached, so a stale SW fetches it fresh — it unregisters workers + clears Cache
   Storage but NOT data), or Safari → Manage Website Data → remove the origin.
3. **Tabs fail loud** — `activateTab` wraps each tab's build in try/catch and
   renders an error card (showing build version, Chart-loaded status, stack)
   instead of silently refusing to open.

## v10 changes (shipped)

- **Own-account transfers are visible, not hidden.** The old `Own-name transfer
  (excluded)` category is renamed `Transfer to/from my accounts` (constant
  `OWN_TRANSFER_CAT`) with a `CAT_GROUPS.ownTransfers` group kept OUT of
  `spendKeys` and `income` (never double-counted). Overview has a "Money moved to
  my accounts" card (per-month out/in/net + per-recipient breakdown). A one-time
  load/restore migration (`migrateOwnTransferCategory`) rewrites stored txns,
  overrides and learned rules from the legacy label; it's a no-op once nothing
  carries it. `KNOWN_CATEGORIES` makes every category pickable by hand even when
  no txn uses it yet.
- **Standard pay persists on edit.** `pct-router-standardpay` is written on every
  edit (debounced on input, immediate on change) via `onStdPayInput`, not only on
  log. `#payAmt` placeholder + bucket $ amounts derive from standard pay
  (`updateBucketValues` falls back to it as the basis when the pay field is
  empty). "This pay period" has an editable `Standard pay: $X · edit` line; a
  non-destructive "Recalculate percentages from targets?" prompt shows only when a
  real target's implied % drifts. Reset to defaults resets buckets only, keeps pay.
- **CSV import.** `Groceries` category (Ontario grocers) checked BEFORE gas so
  warehouse fuel isn't misread; Costco stays Groceries even for its gas bar. More
  gas keywords. Uber stays one category (CIBC truncates ride vs Eats — see code
  comment). `parseCsvText` gives genuine same-day duplicates a per-file `#2`/`#3`
  id suffix (first occurrence keeps the bare id so re-uploads still dedupe), and
  returns `{records, skippedCount, skippedSamples}` so the upload preview reports
  unreadable rows instead of dropping them silently.
- **Note on restore + the test harness:** a browser-pane *synthetic* file-input
  `change` event migrates the data correctly but does NOT complete the post-restore
  `rebuildAll()` auto-switch to Overview — pristine v9 behaves identically, so it's
  a harness artifact of the synthetic event, not a bug. Real native file-pick
  restore rebuilds fine.

## Features added earlier (all shipped)

- Buckets: expand/collapse chevron; fixed-vs-flexible summary in the "This pay
  period" card; take-home field renamed (dropped ", net amount") with an "i"
  tooltip; manual-contribution savings goals with filling progress bars.
- Branding: coin `logo.svg` as favicon/tab icon; app renamed to Helpmebudget.
- Backup export/restore includes `personalRules` and `savingsGoals`.

## Deploy workflow

Edit → commit → push to `main`; GitHub Pages redeploys. Network-first means
routine edits reach users on next online load without a bump. Bump `CACHE_NAME`
(and keep `APP_BUILD` in sync) only when purging matters: renamed/deleted files
or anything sensitive. Commit trailer in use:
`Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## Related memory notes

`audit-contents-before-publishing`, `money-hq-data-lives-outside-repo`,
`money-hq-two-data-streams`, `money-hq-storage-and-safari-gotchas`.
