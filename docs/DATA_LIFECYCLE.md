# Data Lifecycle

TraceMark keeps research in the current browser profile by default. It has no TraceMark account,
application backend, telemetry, analytics, or cloud sync. This document follows the data through
the extension and identifies where its protection becomes the user's responsibility.

## Collection and creation

After a qualifying browser gesture, TraceMark injects a capture script into the active page. The
script reads the selected text and bounded nearby context, then returns structured capture data to
the extension. It does not persist anything in the webpage. Before saving, TraceMark validates and
normalizes the record and adds user-supplied collection, tags, and note data. A saved highlight
includes the quotation, source information, anchor context, organization fields, derived search
fields, identifiers, and timestamps.

TraceMark has no standing website host access: access to a page is temporary through `activeTab`
and runtime injection. Protected pages may deny this access. See [PERMISSIONS.md](PERMISSIONS.md)
for the permission boundary.

## Local storage and use

Highlights, collections, and validated AI results are stored in extension IndexedDB. Theme and AI
provider/model preferences are stored separately in `browser.storage.local`; TraceMark does not use
browser sync storage. The research library searches the locally stored, normalized fields and
renders saved content as text. An on-page mark uses saved exact quote, prefix, and suffix to find a
single match; it is a runtime annotation and is gone after a reload.

Users can edit a highlight’s collection, tags, and note. Deleting a highlight also deletes saved
AI results that refer to it. Deleting a collection moves its highlights to Inbox before removing
the collection. These are changes to the current profile’s local library, not remote deletions.

## Optional local AI disclosure

Local AI is disabled until the user enables it through the browser’s optional-permission flow and
then requests an action. For selected saved highlights, TraceMark sends their internal IDs,
quotation text, titles, URLs, tags, and notes to Ollama’s local chat endpoint. TraceMark validates
the returned result before storing it in IndexedDB. It rechecks applicable permissions before every
request and does not transmit if permission is missing, revoked, unsupported, or unknown.

The endpoint is loopback HTTP, not encrypted transport. TraceMark does not control Ollama, its
models, or other software on the device; they are separate data recipients and security decisions.
Disabling local AI changes the stored preference and requests removal of the optional grant, with a
visible retry state if cleanup cannot be confirmed. Details are in [PRIVACY.md](../PRIVACY.md).

## Export, import, and retention

A JSON export contains collections, highlights, AI results, and preferences in a versioned backup
envelope. A Markdown export provides a readable representation of all research or one collection;
it is not importable. Once a browser download is created, the file is outside extension storage.
TraceMark does not upload, sync, encrypt, retain, or delete that file on the user’s behalf.

JSON import is explicitly confirmed, strictly parsed, referentially validated, normalized, and
merged in an IndexedDB transaction. It can add or update local records, skip duplicates, and
regenerate colliding IDs when needed; it is not a blanket replacement. Read [BACKUP_FORMAT.md](BACKUP_FORMAT.md)
before generating or handling a backup programmatically.

Browser profile deletion, extension-data clearing, browser cleanup, disk failure, or uninstall can
make local research unavailable. TraceMark has no automatic recovery copy. Keep JSON backups in a
location you trust, protect them as research data, and periodically test restoration with a
non-sensitive fixture or separate profile.
