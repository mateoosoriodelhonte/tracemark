# Run a recovery drill

A backup is useful only if it can be found, opened, and merged when needed. Test the workflow with
non-sensitive data before relying on it for important research.

## Prepare safely

Create two or three synthetic quotations from a public test page. Add a collection, tags, and notes
that make the records easy to identify. Download a JSON backup from **Backups** and record its date,
size, and storage location. Keep the original file unchanged during the drill.

Use a disposable browser profile or separate development installation for restoration. Loading a
second unpacked copy can produce a different extension identity and separate storage, which is
useful for isolation but should not be mistaken for an in-place upgrade.

## Restore and inspect

1. Open **Backups** in the clean test library.
2. Select the JSON file under **Choose TraceMark JSON backup**.
3. Confirm the filename, then choose **Validate and merge backup**.
4. Clear filters and search for each synthetic quotation.
5. Verify collection membership, tags, notes, source links, and any saved Local AI result you
   intentionally included.
6. Export a new JSON backup from the restored library and store it separately from the source file.

Expected behavior is a validated merge, not wholesale replacement. Repeating the same import should
skip equivalent records rather than create duplicate research.

## Record the outcome

Write down the TraceMark version, browser, operating system, backup date, result, and any warning.
If validation fails, keep the rejected file and test an earlier known-good backup; do not manually
edit IDs or derived fields in your only copy.

Repeat the drill after a major browser/profile move, a backup-format change, or a significant
release. See [BACKUP_AND_RESTORE.md](BACKUP_AND_RESTORE.md) for daily use and
[BACKUP_MERGE_RULES.md](../reference/BACKUP_MERGE_RULES.md) for merge semantics.
