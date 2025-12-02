# Salesforce Permission Inspector

A small Chrome extension that inspects Profile and Permission Set permissions for Salesforce metadata (custom fields, objects, Apex classes/pages, flows).

Quick overview
- The extension injects a small floating button onto Salesforce pages that have an accessible `sid` session cookie. Clicking the button opens the Auditor UI (`inspector.html`) which runs SOQL queries against the Salesforce REST API and renders results split between Profiles and Permission Sets.

Key files
- `manifest.json` — extension manifest (permissions: `cookies`, `activeTab`, `scripting`, `tabs`; `host_permissions` for `*.salesforce.com` / `*.force.com`).
- `background.js` — service worker. Locates Salesforce tabs, reads the `sid` cookie, and returns a session object to the inspector. Also handles messages from the content script (cookie checks and preferred origin behavior).
- `contentScript.js` — injected into Salesforce pages. Calls the background `checkCookie` API and shows a floating button on pages that can provide a session cookie. Clicking it opens the inspector and records the origin to prefer that session.
- `inspector.html` + `inspector.js` — UI and logic, calls `runQuery(session, query)` and renders tables (`profileTable` and `psTable`).
- `style.css` — UI styling, dark/light theme via `data-theme` on `<html>`.
- `getData.js` — (helper; check project for usage).
- `tableRender.js` — (helper; check project for usage).

How it works
- Floating button appears only on pages that can provide an `sid` cookie (content script asks background via `checkCookie`).
- Clicking the floating button records the tab origin as `preferredOrigin`, opens `inspector.html` and causes `getSession()` to prefer that origin when returning a session to the inspector.
- The inspector performs REST API calls against `${session.apiUrl}/services/data/v60.0/query?q=...` with `Authorization: Bearer ${session.sessionId}`.

Development & debugging
1. Install / reload during development:
   - Open `chrome://extensions/` and enable "Developer mode".
   - Click "Load unpacked" and point to the repository root.
   - After edits, click "Reload" for the extension.
2. Background (service worker) logs:
   - In `chrome://extensions/` find the extension, click "Service worker" -> "Inspect" to open its DevTools console.
   - Useful messages are logged by `background.js` for `checkCookie`, `preferredOrigin`, and `getSession` steps.
3. Inspector UI:
   - Click the floating button on the Salesforce tab you want to use (or click the extension action to open `inspector.html`).
   - Use the inspector UI to enter an API Name and metadata type, then click "Search Permissions".
   - If a request fails, the inspector will show a clear error in the status bar (e.g., INVALID_SESSION_ID). Check the background service worker console for cookie and origin logs.

Common troubleshooting
- If the inspector returns `INVALID_SESSION_ID` (401):
  - Ensure you clicked the floating button on the Salesforce tab you want to use (this sets the preferred origin).
  - Refresh the Salesforce page and click the floating button again (session may have rotated or expired).
  - If necessary, log out and log back in to the Salesforce tab to re-establish a fresh session cookie.
- If the floating button doesn't appear:
  - Confirm you're on a page that matches `https://*.salesforce.com/*` or `https://*.force.com/*` and that a session cookie is present. Check the background console logs for the `checkCookie` result.

Security & privacy notes
- The extension reads the `sid` cookie from the browser to call the Salesforce REST API. It does not persist session tokens to disk. Avoid logging session tokens to public logs. The current code prefers logging only origins and cookie domains, not the cookie value.

Acknowledgements
- A huge thanks to tprouvot's code from github, because some implementation idea (How to get sid) and patterns were adapted from Salesforce-Inspector-reloaded (https://github.com/tprouvot/Salesforce-Inspector-reloaded) while writing this extension.
- AI assistance is used to implement and refactor some portions of the code during development.
- AI assistance is used to create the UI for the same.