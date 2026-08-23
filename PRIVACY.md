# TraceMark Privacy Policy

Effective date: August 22, 2026

TraceMark is a local-first browser extension. It has no TraceMark account, telemetry, advertising,
analytics, cloud sync, or application backend.

## Data TraceMark handles

When the user saves a selection, TraceMark records the selected quotation and source metadata
needed for the research workflow. A saved record can include:

- quotation text and nearby prefix, suffix, heading, or page context;
- page title, source URL, canonical URL when present, and source hostname;
- the collection, tags, and note supplied by the user; and
- timestamps and internal identifiers.

TraceMark also stores collections and any local-AI output the user explicitly requests. It stores
the selected theme, AI provider, and model preference separately.

## Where data is stored

Research records, collections, and saved AI results are stored in the extension's IndexedDB
database in the current browser profile. Theme and AI preferences are stored in
`browser.storage.local`. TraceMark does not use browser sync storage.

Data remains subject to the browser and operating system. Clearing extension data, removing a
browser profile, browser cleanup, disk failure, or uninstall behavior can make local data
unavailable. TraceMark does not create automatic backups. The user can download JSON backups and
Markdown exports and is responsible for protecting those files.

## Webpage access

TraceMark has no static content scripts and no standing host permission for websites. After a
qualifying user gesture, it uses `activeTab` and `scripting` to inject a capture or anchor script
into the active page. The script reads the current selection or attempts to find the exact saved
quotation, then returns its result to the extension. This access is limited by the browser and does
not work on some protected pages, including browser-internal pages, store pages, and browser-owned
PDF viewers.

See [docs/PERMISSIONS.md](docs/PERMISSIONS.md) for the complete permission rationale.

## Optional Ollama processing

Local AI is disabled by default. Enabling it requires a separate browser prompt for the only
optional origin, `http://127.0.0.1:11434/*`. For a requested AI action, TraceMark sends only the
stored internal highlight ID, quotation, title, source URL, tags, and note belonging to the saved
highlights the user has selected. It sends them to the Ollama chat API at
`http://127.0.0.1:11434/api/chat` and stores the validated result in extension IndexedDB.

Loopback HTTP traffic is local to the device but is not encrypted. TraceMark does not establish
the trustworthiness of Ollama, a model, the operating system, browser extensions, or other local
software. Users should assess those components before enabling local AI. An Ollama model or local
configuration may itself contact other services; that behavior is outside TraceMark's control.

Disabling local AI changes the stored provider to `none` and asks the browser to remove the
optional origin permission. Browser settings remain the authoritative place to inspect or revoke
extension permissions.

## Data sharing and sale

TraceMark does not sell user data. TraceMark does not send research to a TraceMark-operated service
because no such service exists. The only network destination implemented by TraceMark for research
content is the optional, explicitly permissioned loopback Ollama endpoint described above.

## User control

Users can edit or delete saved quotations, manage collections, export JSON or Markdown, import a
validated JSON backup, disable local AI, and remove the optional Ollama permission. Removing local
data is subject to the browser's extension-data controls.

## Changes and questions

Privacy-affecting changes should be described in the repository and reviewed with the permission
and trust-boundary documentation. For questions, open a GitHub issue that contains no sensitive
research or security details. For vulnerabilities, follow [SECURITY.md](SECURITY.md).
