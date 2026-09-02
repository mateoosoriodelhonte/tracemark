# Permissions review

TraceMark's permission surface is a release contract. Source configuration, generated manifests,
runtime request logic, disclosure copy, and packaged archives must agree.

## Current contract

Both packages require `activeTab`, `scripting`, `contextMenus`, and `storage`. Chrome additionally
requires `sidePanel`. Neither package has a static website host permission or static content script.
The only optional origin is `http://127.0.0.1:11434/*`. Firefox separately declares the applicable
optional data-consent categories described in [PERMISSIONS.md](../PERMISSIONS.md).

## Review sequence

1. Inspect `wxt.config.ts` and the exact generated Chrome and Firefox manifests.
2. Compare required permissions, optional origins, commands, sidebar/side-panel declarations,
   content scripts, and Firefox-specific settings.
3. Trace each permission to a user action and the smallest API call that needs it.
4. Verify optional grants are requested only from an eligible explicit gesture, checked before use,
   removable, and treated as unavailable when state is missing or unknown.
5. Check denial, revocation, partial Firefox consent, failed cleanup, reload reconciliation, and
   protected-page injection failures.
6. Update privacy, store, user, test, and troubleshooting documentation when any behavior changes.

Run the manifest tests, both builds, archive validation, and the relevant permission-flow tests.
Native browser prompts and `activeTab` gestures require the manual procedures in
[TESTING.md](../TESTING.md); extension-page automation cannot establish those grants.

## Broadening proposals

A proposed required host, `<all_urls>`, `tabs`, history, clipboard, cookie, remote origin, static
content script, or new Firefox data category needs explicit design approval. Document why existing
runtime injection or an optional narrow origin cannot meet the need, what data becomes accessible,
how the user understands and revokes access, and how both browser packages remain reviewable.

Do not broaden access to work around an unsupported browser page or a missing gesture. A fail-closed
limitation is preferable to silently changing the privacy model.
