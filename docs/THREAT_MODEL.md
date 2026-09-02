# Threat Model

TraceMark’s security model is privacy-first and local-first: research stays in the browser profile
unless the user exports it or explicitly requests optional local AI assistance. The extension
reduces exposure at its boundaries; it does not make webpages, browsers, local services, exported
files, or a compromised device trustworthy.

## Assets to protect

The primary assets are saved quotations; nearby source context; page titles and URLs; collection,
tag, and note metadata; derived search data; saved AI results; and theme/AI preferences. A source
URL and quotation can reveal sensitive interests or research. JSON backups and Markdown exports
can contain the same material and leave the extension’s storage boundary. Optional local-AI
requests additionally disclose selected stored fields to the local Ollama service.

## Boundaries and threats

**Webpages and page content.** A page’s DOM, selection, URL, and text are untrusted. A malicious or
unexpected page can provide hostile-looking text, malformed capture data, or content that changes
after capture. TraceMark has no static content scripts or standing host permissions. It injects
capture or anchor code at runtime only following a qualifying `activeTab` gesture. Returned data is
schema-validated; saved text is rendered as inert Svelte text rather than executable HTML. Anchoring
requires an exact quote plus context and refuses missing or ambiguous matches instead of guessing.
These controls reduce broad website access and markup execution risk; they do not validate the
truthfulness of a source or guarantee that a captured quote remains meaningful in changed context.

**Extension messages and local storage.** The privileged background router accepts messages only
from the current extension ID and validates request data. Domain schemas validate captures, stored
records, preferences, messages, and AI output. IndexedDB and `browser.storage.local` are protected
by browser extension isolation, but they are not encryption against someone who controls the browser
profile, operating system, or device.

**Imported backups.** Backup JSON is untrusted input. TraceMark limits size, strictly parses its
versioned envelope, requires a canonical Inbox, checks uniqueness and references, normalizes
records, and merges in one IndexedDB transaction. A valid backup can still intentionally add or
update research, so validation cannot establish provenance or user intent. Import only a file you
chose and retain a known-good backup.

**Optional Ollama service.** Local AI begins disabled and needs the exact optional loopback origin
`http://127.0.0.1:11434/*`; Firefox also needs optional website-content and browsing-activity data
consent. TraceMark checks the applicable grants before every request, restricts the request to user
selected stored highlights, omits credentials, rejects redirects, applies a 30-second timeout and
one-megabyte response limit, and validates model output before storage. Those safeguards constrain
TraceMark’s own request path. They do not make loopback HTTP confidential, identify the listening
process, or control models and other local software.

## Out of scope and user responsibilities

TraceMark does not defend against a compromised browser, browser profile, operating system, device,
or another process that can read the user’s files or intercept local traffic. It cannot protect a
downloaded backup once the browser creates it, provide automatic cloud recovery, or guarantee the
availability of browser-protected pages. It also does not assess Ollama’s model behavior, local
configuration, or any network behavior that Ollama or another local component may initiate.

Users should protect their browser profile and downloaded backups, review the browser’s optional
permissions, enable local AI only when they trust their local Ollama setup, and keep a tested
recovery backup. [ARCHITECTURE.md](ARCHITECTURE.md), [PERMISSIONS.md](PERMISSIONS.md), and
[SECURITY.md](../SECURITY.md) describe the corresponding implementation and reporting boundaries.
