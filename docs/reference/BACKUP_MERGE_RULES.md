# Backup merge rules

TraceMark imports a valid JSON backup as a transactionally merged data set. It does not erase the
destination library and replace it wholesale.

## Validation before mutation

The importer requires explicit confirmation, rejects text over 20 MB, parses the complete strict
version 1 envelope, and validates every collection, highlight, AI result, and setting. IDs must be
unique within each record type. The canonical active Inbox must be present, collection names must
remain unique after normalization, and every relationship must resolve.

No database changes begin until these structural checks succeed.

## Collections

An imported collection with the same ID and normalized name resolves to the local collection. The
newer `updatedAt` record can update it; otherwise it is skipped. A matching normalized name with a
different ID resolves to the existing local collection. An unrelated ID collision receives a new
ID, and dependent highlight references are remapped.

## Highlights

Highlights are normalized on import: source URL, optional canonical URL, hostname, title, tags, and
derived search fields are checked or rebuilt. A same-ID, same-identity record can update when the
import is newer; an equal or older record is skipped. Equivalent source-URL-plus-quotation records
are treated as the same research. An unrelated ID collision can be regenerated.

## AI results

AI results must refer to imported highlights. References follow any remapped highlight IDs. Exact
equivalent results are skipped; unrelated ID collisions can be regenerated. Results that cannot
resolve their source records are rejected.

## Transaction and result

All writes occur inside one IndexedDB transaction. A failure rolls back the merge and is reported as
a backup error. The returned summary distinguishes created, updated, skipped, regenerated, and
rejected counts for each entity type. Device theme and AI preferences are validated in the envelope
but are not imported into the destination settings.

See [../guides/BACKUP_AND_RESTORE.md](../guides/BACKUP_AND_RESTORE.md) for the UI process.
