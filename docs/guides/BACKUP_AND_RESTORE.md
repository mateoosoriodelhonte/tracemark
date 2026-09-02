# Back up and restore TraceMark research

TraceMark stores research in the browser profile, not in an account or cloud service. Clearing extension data, removing a browser profile, uninstalling the extension, browser cleanup, or disk failure can make local records unavailable. Download JSON backups regularly and store them somewhere you trust.

## Create a backup

Prerequisite: open **Research library**.

1. Choose **Backups**.
2. Under **Export**, choose **Download JSON backup**.
3. Save the downloaded file in a location you control, ideally separate from the browser profile.

Expected result: TraceMark downloads a dated `tracemark-backup-YYYY-MM-DD.json` file. JSON is the full importable backup: it contains collections, saved quotations, saved local-AI results, and preferences. Keep the file private because it may contain your quotations, URLs, tags, notes, and AI output.

## Create a readable export

In the same dialog, choose **Download Markdown**. This creates a human-readable notes export with quotations, source links, dates, collections, tags, and notes. When a collection filter is active in the library, the Markdown export contains that collection; otherwise it includes all research.

Markdown is not an import format. Use it for reading, sharing only after reviewing its contents, or keeping an accessible copy alongside your JSON backup.

## Restore by merging a JSON backup

Prerequisites: have a TraceMark JSON backup smaller than 20 MB and open **Backups**.

1. Under **Import**, use **Choose TraceMark JSON backup** to select the file.
2. Confirm the displayed filename is the intended backup.
3. Choose **Validate and merge backup**.

Expected result: TraceMark validates the entire file before changing the library, then merges it with unrelated local research. It skips duplicates and may update matching records when the imported version is newer. The result status reports how many quotations were merged and how many duplicates were skipped. Importing does not replace the local library wholesale.

The backup’s device theme and AI preferences are not imported. This prevents a restored library from changing those local settings unexpectedly.

## Recover from failures

If TraceMark rejects the file, confirm that it is a JSON backup created by TraceMark, not a Markdown export or an edited file. The import requires a valid backup structure, a canonical active Inbox, unique records, valid source URLs, and valid links between saved AI results and quotations. Try an earlier intact JSON backup if validation fails.

If an expected quotation is absent after import, clear library filters and search by a word from the quote or source. Keep backups on a regular schedule and test a merge before relying on a single copy for recovery.
