# Storage model

TraceMark stores research inside the current browser profile. It does not use a TraceMark account,
remote database, browser sync storage, or application backend.

## IndexedDB

The `tracemark` Dexie database contains three tables:

- `collections` for Inbox and user-created active or archived collections;
- `highlights` for quotations, provenance, organization, derived search data, and timestamps;
- `aiResults` for validated saved Ollama output linked to one or more highlights.

The current database schema is version 2, while stored domain records use `schemaVersion: 1`.
Database and record version numbers serve different purposes. Opening the database ensures the
canonical active Inbox exists.

Deleting a highlight transactionally deletes saved AI results that reference it. Deleting a
collection is handled by the collection service, which moves its quotations to Inbox before removal.

## Browser local storage

One `settings` object in `browser.storage.local` holds the theme and Local AI provider/model
preference. Invalid or missing settings fall back to system theme, disabled Local AI, and model
`llama3.2`. Optional browser permissions are managed by the browser and are not stored inside this
settings object or exported backup.

## Validation and migrations

Repository reads and writes parse records with strict schemas. The database upgrade from version 1
normalizes legacy collections and highlights, rebuilds search fields, maps invalid collection
references to Inbox, and rejects invalid legacy data rather than silently retaining it.

Browser-profile access controls protect extension storage from ordinary webpages, but the data is
not application-level encrypted against someone controlling the profile, operating system, or
device. Browser cleanup, profile deletion, disk failure, or uninstall can make it unavailable.

See [../DATA_LIFECYCLE.md](../DATA_LIFECYCLE.md) and [DATA_FIELDS.md](DATA_FIELDS.md).
