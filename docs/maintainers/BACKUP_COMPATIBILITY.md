# Backup compatibility review

TraceMark JSON backups are recovery data, not convenient test payloads. A compatibility change must
preserve strict validation, referential integrity, transactional merge behavior, and a clear path
for users carrying older files forward.

## Contract decisions

Identify whether the change affects a domain record, backup envelope, import normalization, merge
identity, exported settings, size limit, or relationship. A new optional runtime field does not
automatically belong in the backup; decide whether it is durable user data and how older versions
behave when it is absent or present.

Increment the backup format only when an older importer cannot safely interpret the new envelope.
Do not quietly change the meaning of version 1. If multiple versions are accepted, parse each
strictly and convert to one current internal representation before mutation.

## Import review

Verify the entire file is parsed and relationship-checked before opening the write transaction.
Exercise same-ID newer and older records, equivalent collection names, equivalent
URL-plus-quotation highlights, unrelated ID collisions, remapped references, dependent AI results,
canonical Inbox requirements, and invalid files. Confirm a failure leaves existing research
unchanged and produces a useful bounded error.

Never loosen URL, UUID, timestamp, field-count, text-length, or total-file bounds merely to accept a
single malformed fixture. Treat exported quotations, notes, URLs, tags, and AI output as sensitive
and render validation diagnostics without echoing private content.

## Export and round trip

Create the JSON from validated repository records, use stable envelope fields, and ensure the file
can be imported into a clean profile and merged into a populated profile. Compare collection,
highlight, relationship, AI-result, and preference outcomes—not just record totals.

Update [BACKUP_FORMAT.md](../BACKUP_FORMAT.md),
[BACKUP_MERGE_RULES.md](../reference/BACKUP_MERGE_RULES.md), migration guidance, tests, and release
notes together. Markdown export remains a separate human-readable, non-importable format.
