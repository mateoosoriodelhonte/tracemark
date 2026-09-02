# Storage migrations

An IndexedDB migration changes user-owned research in place and must be recoverable by design.
Database versions, domain `schemaVersion` values, and backup-format versions are separate contracts;
change only the one required by the new behavior.

## Design before implementation

Describe the old record shape, new shape, transformation, validation rule, affected indexes, and
behavior for malformed legacy data. Specify how Inbox, relationships, timestamps, derived search
fields, Local AI results, and settings are preserved. Decide whether the change can be performed
atomically inside the Dexie upgrade transaction.

Prefer deterministic transformations that can be run once without network access. Do not fetch,
infer missing private content, or silently discard a record to make an upgrade complete. If safe
migration is impossible, abort so the browser can retain the prior database rather than committing
a partial state.

## Implementation rules

- Add a new database version instead of rewriting the meaning of a released version.
- Parse legacy fields at the boundary and construct records that satisfy the current strict schema.
- Rebuild derived values such as normalized names, hostnames, tags, and search fields from validated
  source fields.
- Preserve exact quotations and user-written notes unless the migration explicitly fixes an
  encoding defect with tested evidence.
- Remap invalid collection references only according to a documented rule, normally the canonical
  Inbox fallback.
- Keep settings migration separate when it lives in `browser.storage.local` rather than IndexedDB.

## Required tests

Test a representative valid legacy database, empty stores, canonical Inbox repair, relationship
preservation, derived-field rebuilding, and malformed records. A rejection test must verify the
legacy stores remain intact after the upgrade aborts. Test fresh installation independently from
upgrade so an initializer does not hide a migration defect.

Run the focused storage suites, full tests, both production builds, and `pnpm check`. Update
[DATA_LIFECYCLE.md](../DATA_LIFECYCLE.md), [BACKUP_FORMAT.md](../BACKUP_FORMAT.md), data-field
reference, and recovery guidance when the persisted or exported contract changes.
