# Glossary

**Active tab** — The browser tab currently selected by the user. A qualifying extension gesture
can give TraceMark temporary `activeTab` access to that page.

**Anchor** — The process of locating a saved exact quotation in the current source page using its
text and nearby saved context. A page mark is temporary and is not an edit to the website.

**Canonical URL** — An optional normalized URL supplied by a page to identify a preferred version
of its source. TraceMark can use it alongside the captured URL when checking the active source.

**Collection** — The one primary organizational container assigned to a quotation. Inbox is the
canonical default collection.

**Context** — Bounded text near a captured quotation, plus optional heading or page context, used
to retain provenance and disambiguate anchoring.

**Highlight** — The internal record for one saved quotation and its source, organization, search,
anchor, and timestamp fields. It is distinct from the temporary visual mark on a webpage.

**Inbox** — The permanent active default collection. Direct captures enter Inbox, and quotations
from a deleted collection move there.

**Local AI** — Optional assistance provided through a separately installed Ollama service at the
loopback address. It is disabled by default and requires explicit browser permission.

**Loopback** — Network traffic addressed to the same device, here `127.0.0.1`. Loopback limits the
destination but does not encrypt HTTP or establish which local process is listening.

**Markdown export** — A readable notes file containing quotation and source information. It is not
an import or full recovery format.

**Research library** — TraceMark's extension page, Chrome side panel, or Firefox sidebar for
searching and managing local records.

**Schema version** — The version of a stored record contract. It is independent of the extension
release and backup-envelope versions.

**Tag** — Normalized metadata that can span collections and participate in search and filtering.

**JSON backup** — A strict, versioned, importable envelope containing the complete library and
preferences. Import is a validated merge rather than wholesale replacement.

See [DATA_FIELDS.md](DATA_FIELDS.md) for record details and [../ARCHITECTURE.md](../ARCHITECTURE.md)
for component boundaries.
