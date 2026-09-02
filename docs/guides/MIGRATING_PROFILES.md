# Move research between browser profiles

TraceMark has no account or sync service. Moving research means exporting a JSON backup from one
browser profile and merging it into another.

## Export from the source profile

Open the source profile's **Research library**, clear filters, and download a JSON backup from
**Backups**. The JSON export contains collections, quotations, saved Local AI results, and settings.
Store it somewhere accessible to the destination profile and protect it as sensitive research.

Confirm the source library remains intact before removing an old profile or extension. A Markdown
export is useful as a readable cross-check but cannot be imported.

## Import into the destination

Install the same or a compatible TraceMark version in the destination profile. Open **Backups**,
select the JSON file, and choose **Validate and merge backup**. TraceMark validates the complete
envelope and merges it with unrelated destination research.

Clear filters and verify a sample from each collection. Check quotations, source links, tags, notes,
and saved AI output. Device theme and AI preferences are not imported into the destination, and
browser permissions are never transferred in the JSON file. Enable Local AI separately only if you
want it in that profile.

## Avoid common mistakes

- Do not uninstall or delete the source profile until the destination is verified and backed up.
- Do not use Markdown as a recovery file.
- Do not expect Chrome and Firefox to share extension storage automatically.
- Do not assume an unpacked installation with a different extension identity can see the old
  profile's database.
- Do not edit backup IDs to combine libraries; let TraceMark's validated merge resolve equivalent
  records and collisions.

After migration, create a new JSON backup from the destination. For the merge contract, see
[BACKUP_FORMAT.md](../BACKUP_FORMAT.md) and [BACKUP_MERGE_RULES.md](../reference/BACKUP_MERGE_RULES.md).
