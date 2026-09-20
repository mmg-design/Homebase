# Rule of 100 Quick Log

Floating outreach logger. Once you've opened the Daily Actions page (`/tracker`) today, this
extension shows a small widget in the bottom-left corner of every other tab so you can log
outreach — email, LinkedIn connect, comment, text/DM, referral, meeting, video DM — without
switching back to Ship Studio.

Logging always writes to the production tracker (`homebase-pearl.vercel.app`), so it stays in
sync with the Daily Actions page regardless of which tab or site you're on.

## Install (unpacked, for personal use)

1. Open `chrome://extensions`
2. Turn on **Developer mode** (top right)
3. Click **Load unpacked**
4. Select this `extension/` folder

## How it works

- `content-detector.js` runs only on the Daily Actions page. On load, it tells the background
  worker "the tracker was opened today."
- `background.js` remembers that for the rest of the day (Eastern time, matching the app's own
  day boundary) and is the only piece that talks to the API — this avoids CORS issues that would
  hit a content script making the same request directly from, say, linkedin.com.
- `content-widget.js` runs on every other page. It asks the background worker if today is
  "activated"; if so, it renders the floating widget in a shadow DOM (so it can't pick up or leak
  styles from the host page) and posts taps to a new `POST /api/tracker/increment` endpoint,
  which atomically bumps one field instead of overwriting the whole day's counts — so a tap here
  can't clobber a save from the open Daily Actions tab, or vice versa.
- The widget resets itself (stops appearing) a bit after midnight ET until the tracker page is
  opened again.

## Known limitations

- `/api/tracker/increment` has no auth, matching the rest of this app's API today. Anyone with
  the URL could technically POST to it. Fine for a single-user internal tool; worth revisiting if
  this app ever gets more users.
- Chrome only (uses `chrome.*` APIs and the Document-free floating-widget approach). Not tested
  in Firefox/Safari.
