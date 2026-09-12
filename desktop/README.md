# Sahayata desktop (Windows .exe)

A thin Electron shell around your deployed Sahayata site — a real native
window with its own icon and taskbar entry, installable as a normal
Windows program. It's not a reimplementation: it loads your live URL, so
auth, Realtime updates, and payments all work exactly as they do in a
browser tab.

This has to be built on your own machine — it needs `npm install` to pull
Electron's ~120MB binary from npm, which the sandbox that generated this
project has no network access to do.

## Build it (Windows, macOS, or Linux — cross-compiles fine)

1. Install [Node.js](https://nodejs.org) (18+) if you don't have it.
2. Deploy Sahayata first (see the main project's deploy guide) so you have
   a live URL like `https://sahayata-yourname.vercel.app`.
3. Edit `config.json` in this folder and set `"url"` to that address.
4. From this `desktop/` folder:
   ```bash
   npm install
   npm run dist:win
   ```
5. Find the output in `desktop/dist/`:
   - `Sahayata Setup <version>.exe` — a normal installer (Start Menu
     shortcut, uninstaller, the works)
   - `Sahayata <version>.exe` — a portable single-file version, no
     installation needed

`npm run dist:mac` / `npm run dist:linux` build the equivalent for those
platforms from the same source, if you ever want them.

## Why a shell instead of bundling the whole app

Sahayata is a server-rendered Next.js app — it needs `npm run build` +
`npm start` (or a host like Vercel) running somewhere reachable, because
pages are rendered per-request and Supabase Realtime needs a live
connection. Bundling that server *inside* the desktop app is possible
(Electron can spawn a local Node process), but it means every user runs
their own copy of your backend logic locally, which doesn't fit an app
whose entire point is one shared, publicly auditable ledger and pool. The
thin-shell approach — one deployed app, everyone's desktop client points
at it — is the right shape for this specific app, not a limitation worth
working around.

## Customizing

- **Icon**: replace `build/icon.ico` (multi-resolution .ico) to rebrand.
- **Window size**: `main.js`, the `BrowserWindow` constructor options.
- **External links**: payment gateway popups (Stripe/PayPal/etc.) open in
  the user's default browser rather than a second app window — that's the
  `setWindowOpenHandler` in `main.js`, not something to remove lightly,
  since some gateways' hosted pages don't expect to run inside an
  embedded webview.
