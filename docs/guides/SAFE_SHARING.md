# Share research safely

TraceMark can create readable Markdown and complete JSON exports. Both may contain sensitive
research, so review the actual file before sharing it.

## Choose the right export

Use **Download Markdown** when a person needs readable quotations, titles, source links, save dates,
collections, tags, and notes. With a collection filter active, the Markdown export is limited to
that collection; otherwise it contains the whole library. Markdown is not importable.

Use **Download JSON backup** for recovery or migration. JSON includes the full library, anchor
context, derived search fields, saved Local AI results, and preferences. It is usually a poor
sharing format because it exposes more internal and contextual data than a reader needs.

## Review before sending

Open a copy of the export and check:

- quotation text, notes, and Local AI output for private or identifying material;
- source URLs for query strings, internal hosts, document IDs, or account-specific paths;
- collection and tag names for confidential project information;
- whether the file contains all research when you intended to share one collection;
- whether the recipient actually needs an editable backup rather than a readable excerpt.

Redact a separate copy rather than changing your only backup. Preserve attribution and quotation
context when removing unrelated private material. TraceMark does not encrypt, upload, expire, or
revoke exported files after the browser creates them.

## Public reports and examples

Do not attach a real backup to a GitHub issue. Reproduce bugs with a harmless public page or a small
synthetic fixture, and sanitize screenshots and logs. Vulnerability details belong in the private
contact process described by [SECURITY.md](../../SECURITY.md).

For a complete export inventory, read [BACKUP_FORMAT.md](../BACKUP_FORMAT.md) and
[DATA_LIFECYCLE.md](../DATA_LIFECYCLE.md).
