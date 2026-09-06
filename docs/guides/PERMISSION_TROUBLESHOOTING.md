# Troubleshoot browser permissions

TraceMark uses temporary webpage access for capture and anchoring, plus an optional loopback origin
for Local AI. A missing permission should stop the operation with guidance rather than trigger a
broader request.

## Capture or marking is blocked

Confirm the active tab is an ordinary HTTP(S) webpage and select text again when capturing. Invoke
the TraceMark toolbar action, **Save selection to TraceMark**, or `Alt+Shift+S` on that tab. Opening
the research library or clicking **Open source** does not independently grant `activeTab` access.

On a fresh source tab, invoke the toolbar action or command and then retry **Mark on page**. Browser
settings pages, extension stores, privileged pages, and browser-owned PDF viewers can remain
unavailable even after a gesture. Do not grant standing access to all websites as a workaround.

## Local AI cannot enable

The only optional origin should be `http://127.0.0.1:11434/*`. Chromium requests it from **Enable
local AI**. Firefox first requests optional website-content and browsing-activity consent, then
requires **Continue enabling local AI** for the separate origin prompt.

If a prompt was denied, start the explicit enable action again. If browser settings show a missing or
revoked grant, TraceMark must remain disabled. Confirm Ollama is installed and running only after the
browser permission state is correct; a running service cannot replace a denied grant.

## Cleanup is pending

After **Disable local AI**, use **Retry permission removal** when shown. Inspect TraceMark in the
browser's extension-management page and remove the loopback origin or applicable Firefox data
consent there if necessary. Reload the research library and confirm Local AI remains disabled.

Do not paste permission diagnostics containing research URLs, profile paths, or browsing data into a
public issue. For the exact contract, read [PERMISSIONS.md](../PERMISSIONS.md) and
[USER_GESTURES.md](../reference/USER_GESTURES.md).
