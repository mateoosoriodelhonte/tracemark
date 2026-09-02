# Export research

TraceMark offers two download formats with different purposes. Choose the smallest format that fits
the task and inspect the result before moving it outside your browser profile.

## JSON backup

**Download JSON backup** creates a dated, complete, importable snapshot. It includes collections,
highlights, saved Local AI results, and preferences in a strict versioned envelope. Anchor context
and derived search fields are included because JSON is a recovery format, not a minimal report.

Use JSON for backup, migration, and recovery drills. Keep it private, avoid manual edits, and retain
more than one dated copy. Browser permissions are not exported.

## Markdown notes

**Download Markdown** creates readable sections containing quotation text, source link, saved date,
collection, tags, and note. If a collection filter is active, only that collection is exported;
otherwise all research is included. Markdown output escapes stored text so it remains inert.

Use Markdown for reading, drafting, or sharing after review. It cannot be imported into TraceMark
and does not include every internal field needed for recovery.

## Verify the result

After downloading, confirm the filename and open the file locally. Check that the intended
collection scope was used, source links look correct, and no private note, URL, tag, collection, or
AI output is being disclosed. TraceMark does not control the file after the browser creates it and
cannot expire a copy already sent elsewhere.

For programmatic JSON details, read [BACKUP_FORMAT.md](../BACKUP_FORMAT.md). For a sharing review,
use [SAFE_SHARING.md](SAFE_SHARING.md). For recovery, follow
[BACKUP_AND_RESTORE.md](BACKUP_AND_RESTORE.md).
