# TraceMark FAQ

## Is TraceMark a cloud service?

No. TraceMark is a browser extension with no TraceMark account, application backend, analytics,
telemetry, or cloud sync. Quotations, collections, and saved local-AI results are held in the
current browser profile's extension IndexedDB database. Theme and AI-provider preferences are held
in `browser.storage.local`, not browser sync storage. See the [privacy policy](../PRIVACY.md) and
[architecture](ARCHITECTURE.md) for the storage and component boundaries.

## What does TraceMark save when I capture a quotation?

It saves the selected quotation, its nearby prefix and suffix context, the page title and source
URL, and sometimes a heading, page context, or canonical URL. It also saves the collection, tags,
note, internal identifiers, and timestamps used by the library. The exact saved fields are
validated before storage; [the backup format](BACKUP_FORMAT.md) describes the portable JSON form.

## Does TraceMark read every website I visit?

No. It has no static content scripts or standing website host permissions. Capture and anchoring
use `activeTab` and runtime script injection only after a toolbar, selection-context-menu, or
keyboard-command gesture recognized by the browser. Browser-internal pages, store pages, and some
browser-owned PDF viewers may still reject injection. The permission details are in
[PERMISSIONS.md](PERMISSIONS.md).

## Why can’t TraceMark mark my quotation on a reopened tab?

`activeTab` access is per browser-recognized gesture and tab. On a fresh or revisited source tab,
invoke the TraceMark toolbar action or press `Alt+Shift+S`, close the popup if one opens, and try
**Mark on page** again. TraceMark marks only one unambiguous exact quotation using its saved
prefix and suffix; it refuses if the quote changed, is missing, or remains ambiguous. The mark is
a temporary page annotation and disappears when the page reloads.

## What happens if I clear browser data or remove the extension?

Your local research may become unavailable. Browser-profile cleanup, disk failure, or uninstall
behavior can remove extension storage, and TraceMark does not make automatic cloud backups. Use
**Backups** in the research library to download a JSON backup periodically, store it somewhere you
trust, and test a recovery import. A Markdown download is readable but is not an import format.
See [DATA_LIFECYCLE.md](DATA_LIFECYCLE.md).

## What does “local AI” send, and where?

Local AI is off by default. When you explicitly enable it and request an action, TraceMark sends
only the selected saved highlights’ internal IDs, quotation text, titles, URLs, tags, and notes to
the Ollama chat API at `http://127.0.0.1:11434/api/chat`. It does not start Ollama or download a
model. The loopback origin requires an explicit optional browser permission; Firefox also requires
its two optional data-consent types. Loopback HTTP is not encrypted, and Ollama, its models, and
other local software are separate trust decisions. [PRIVACY.md](../PRIVACY.md) covers the full
flow.

## Can I import a JSON file safely?

TraceMark checks the complete JSON envelope, field types, record limits, canonical Inbox,
duplicate identifiers, and collection/highlight/result references before a transactionally merged
import. Validation reduces malformed-file risk; it cannot establish that a valid backup contains
research you want. Import only files you selected and retain a known-good backup first.

## Does TraceMark have a formal accessibility conformance claim?

No. The UI uses native controls, labels, dialogs, live status/error regions, visible keyboard focus,
and reduced-motion-aware styling, with focused component tests for several of those behaviors.
That is not a formal WCAG audit or a claim that every browser panel/sidebar combination is fully
accessible. See [ACCESSIBILITY.md](ACCESSIBILITY.md) for observed behavior and workarounds.
